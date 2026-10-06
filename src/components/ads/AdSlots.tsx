import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/lib/router-compat";
import { applyAbTests, detectPageType, inContentBudget, pathMatches, type Delivery, planPage, type AdCampaign, type AdSettings, type Caps, type SlotSpec } from "@/lib/ads/engine";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

const CAP_KEY = "mbc_ad_caps";
const SESSION_KEY = "mbc_ad_session";
const todayStr = () => new Date().toISOString().slice(0, 10);

function readCaps(): Caps {
  try {
    const day = JSON.parse(localStorage.getItem(CAP_KEY) || "{}");
    const ses = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    const out: Caps = {};
    for (const id of new Set([...Object.keys(day), ...Object.keys(ses)])) out[id] = { day: day[id]?.day ?? "", dayCount: day[id]?.n ?? 0, session: ses[id] ?? 0 };
    return out;
  } catch { return {}; }
}
function bumpCap(id: string) {
  try {
    const day = JSON.parse(localStorage.getItem(CAP_KEY) || "{}");
    const t = todayStr();
    day[id] = day[id]?.day === t ? { day: t, n: day[id].n + 1 } : { day: t, n: 1 };
    localStorage.setItem(CAP_KEY, JSON.stringify(day));
    const ses = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    ses[id] = (ses[id] ?? 0) + 1;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(ses));
  } catch { /* ignore */ }
}

function visitorId() {
  try { let v = localStorage.getItem("mbc_ad_vid"); if (!v) { v = Math.random().toString(36).slice(2); localStorage.setItem("mbc_ad_vid", v); } return v; } catch { return "anon"; }
}

const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

function logEvent(ad: AdCampaign, type: "impression" | "conversion", placement: string) {
  supabase.from("ad_events").insert({ campaign_id: ad.id, event_type: type, placement, page_path: location.pathname.slice(0, 400), device: isMobile() ? "mobile" : "desktop" }).then(() => {});
}

export function AdCreative({ ad, placement, label, preview, compact }: { ad: AdCampaign; placement: string; label: string; preview?: boolean; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (preview || !ref.current) return;
    let timer: number | undefined; let done = false;
    const obs = new IntersectionObserver(([e]) => {
      if (done) return;
      if (e.intersectionRatio >= 0.5) timer = window.setTimeout(() => { done = true; logEvent(ad, "impression", placement); bumpCap(ad.id); obs.disconnect(); }, 1000);
      else if (timer) clearTimeout(timer);
    }, { threshold: [0, 0.5] });
    obs.observe(ref.current);
    return () => { obs.disconnect(); if (timer) clearTimeout(timer); };
  }, [ad, placement, preview]);

  const href = preview ? ad.destination_url : `/api/public/ad-click/${ad.id}?p=${encodeURIComponent(placement)}`;
  const img = (isMobile() ? ad.mobile_image_url || ad.desktop_image_url : ad.desktop_image_url || ad.mobile_image_url) || "";
  const showImage = ["image", "gif", "poster", "image_cta"].includes(ad.ad_type) && img;
  const showText = ["text_cta", "image_cta"].includes(ad.ad_type) || !showImage;

  return (
    <aside ref={ref} data-nosnippet aria-label={label} className="not-prose my-6 w-full">
      <div className="mb-1 text-sm text-muted-foreground">{label}</div>
      {ad.ad_type === "html" && ad.html_content ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ad.html_content) }} />
      ) : (
        <a href={href} target="_blank" rel="sponsored noopener" className={`flex ${compact ? "flex-row items-center" : "flex-col sm:flex-row sm:items-center"} gap-4 overflow-hidden rounded-lg border border-border bg-secondary/40 p-3 transition-colors hover:bg-secondary`}>
          {showImage && <img src={img} alt={ad.alt_text || ad.name} loading="lazy" decoding="async" className={`${showText ? "w-full sm:w-48" : "w-full"} h-auto max-w-full rounded-md object-contain`} />}
          {showText && (
            <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <div className="font-semibold text-foreground">{ad.headline || ad.name}</div>
                {ad.body && !compact && <p className="text-sm text-muted-foreground">{ad.body}</p>}
              </div>
              <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{ad.cta_text || "Learn more"}</span>
            </div>
          )}
        </a>
      )}
    </aside>
  );
}

type Targets = Record<string, HTMLElement>;
type Found = { targets: Targets; slots: SlotSpec[]; paragraphs: number };

const words = (t: string | null | undefined) => (t || "").trim().split(/\s+/).filter(Boolean).length;
const BLOCKY = /^(TABLE|FIGURE|IMG|PRE|BLOCKQUOTE|UL|OL|DL|IFRAME|VIDEO)$/;
const isHeading = (el: Element) => /^H[1-6]$/.test(el.tagName);
const isFaqHeading = (el: Element) => isHeading(el) && /faq|frequently asked/i.test(el.textContent || "");

function makeSlot(ref: Element, key: string, before = false) {
  const el = document.createElement("div");
  el.dataset.adSlot = key;
  el.style.minHeight = "1px";
  before ? ref.before(el) : ref.after(el);
  return el;
}

/** Top-level content blocks, unwrapping single wrapper divs editors sometimes add. */
function blocksOf(body: HTMLElement): Element[] {
  let root: Element = body;
  while (root.children.length === 1 && root.children[0].tagName === "DIV") root = root.children[0];
  return Array.from(root.children).filter((c) => !(c as HTMLElement).dataset?.adSlot);
}

/**
 * Structure-aware insertion: walks the article, scores the gap after each block
 * (section boundaries best, never next to tables/lists/images or right under a
 * heading, never inside the FAQ), then spreads the length-based budget evenly by word position.
 */
function findArticleSlots(body: HTMLElement, settings: AdSettings, found: Found) {
  const blocks = blocksOf(body);
  const counts = blocks.map((b) => words(b.textContent));
  const total = counts.reduce((x, y) => x + y, 0);
  found.paragraphs = blocks.filter((b) => b.tagName === "P").length;
  const faqIdx = blocks.findIndex(isFaqHeading);
  const end = faqIdx >= 0 ? faqIdx : blocks.length;
  type Cand = { i: number; at: number; score: number };
  const cands: Cand[] = [];
  let acc = 0;
  for (let i = 0; i < end - 1; i++) {
    acc += counts[i];
    const cur = blocks[i], next = blocks[i + 1];
    if (cur.tagName !== "P" || counts[i] < 15) continue; // only after a real paragraph
    if (isHeading(cur) || BLOCKY.test(next.tagName)) continue; // don't split a heading from its text or crowd a table/list/image
    if (acc < 120) continue; // let the intro breathe
    if (total - acc < 80 && faqIdx < 0) continue; // not right at the end
    cands.push({ i, at: acc, score: /^H[23]$/.test(next.tagName) ? 3 : 1 });
  }
  const budget = Math.min(inContentBudget(settings, total), settings.max_ads_per_page);
  const picked: Cand[] = [];
  const minGap = Math.max(150, total / (budget + 1) / 2);
  for (let n = 1; n <= budget; n++) {
    const target = (total * n) / (budget + 1);
    const best = cands
      .filter((c) => picked.every((p) => Math.abs(p.at - c.at) >= minGap))
      .sort((x, y) => Math.abs(x.at - target) / (x.score) - Math.abs(y.at - target) / (y.score))[0];
    if (best) picked.push(best);
  }
  picked.sort((x, y) => x.i - y.i).forEach((c, n) => {
    const key = n === 0 ? "after_intro" : `in_content_${n}`;
    found.targets[key] = makeSlot(blocks[c.i], key);
    found.slots.push({ key, placement: n === 0 ? "after_intro" : "in_content" });
  });
  if (faqIdx > 0 && total > 600) {
    found.targets.before_faq = makeSlot(blocks[faqIdx], "before_faq", true);
    found.slots.push({ key: "before_faq", placement: "before_faq" });
  }
}

/** Homepage: place between top-level sections, spread through the page, never before the first (hero). */
function findHomeSlots(main: HTMLElement, settings: AdSettings, found: Found) {
  const sections = blocksOf(main).filter((s) => (s as HTMLElement).offsetHeight > 120);
  const n = Math.min(settings.homepage_section_ads ?? 2, Math.max(0, sections.length - 2));
  for (let k = 1; k <= n; k++) {
    const idx = Math.max(1, Math.round((sections.length * k) / (n + 1)) - 1);
    const key = `home_section_${k}`;
    const el = makeSlot(sections[idx], key);
    el.className = "container mx-auto px-4";
    found.targets[key] = el;
    found.slots.push({ key, placement: "home_section" });
  }
}

function findContentTargets(settings: AdSettings, pageType: string): Found {
  const found: Found = { targets: {}, slots: [], paragraphs: 0 };
  const main = document.querySelector<HTMLElement>("#main-content");
  const body = document.querySelector<HTMLElement>("#main-content .prose") || document.querySelector<HTMLElement>("#main-content article");
  if (pageType === "home" && main) findHomeSlots(main, settings, found);
  else if (body) findArticleSlots(body, settings, found);
  const side = document.querySelector<HTMLElement>("[data-ad-sidebar]");
  if (side && !isMobile()) {
    const gap = settings.sidebar_gap_px ?? 16;
    side.style.display = "flex"; side.style.flexDirection = "column"; side.style.gap = `${gap}px`;
    if (settings.sidebar_sticky === false) side.style.position = "static";
    side.querySelectorAll("[data-ad-slot]").forEach((n) => n.remove());
    for (let k = 1; k <= Math.max(0, Math.min(5, settings.sidebar_stack_size ?? 3)); k++) {
      const el = document.createElement("div");
      el.dataset.adSlot = `sidebar_${k}`;
      side.appendChild(el);
      found.targets[`sidebar_${k}`] = el;
      found.slots.push({ key: `sidebar_${k}`, placement: "sidebar" });
    }
  }
  return found;
}

export function useAdSlots() {
  const { pathname } = useLocation();
  const [targets, setTargets] = useState<Targets>({});
  const [plan, setPlan] = useState<Record<string, AdCampaign>>({});
  const [stickyClosed, setStickyClosed] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["first-party-ads"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: ads }, { data: settings }, { data: del }] = await Promise.all([
        supabase.from("ad_campaigns").select("*").eq("status", "active"),
        supabase.from("ad_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.rpc("ad_delivery" as any),
      ]);
      const delivery: Delivery = {};
      for (const r of (del ?? []) as { campaign_id: string; total: number; today: number }[]) delivery[r.campaign_id] = { total: Number(r.total), today: Number(r.today) };
      return { ads: (ads ?? []) as unknown as AdCampaign[], settings: settings as unknown as AdSettings | null, delivery };
    },
  });

  useEffect(() => {
    if (!data?.settings || !data.ads.length) { setPlan({}); return; }
    setStickyClosed(false);
    const t = window.setTimeout(() => {
      document.querySelectorAll("[data-ad-slot]").forEach((n) => n.remove());
      const pageType = detectPageType(pathname);
      const { targets: found, slots, paragraphs } = findContentTargets(data.settings!, pageType);
      setTargets(found);
      const available: SlotSpec[] = [{ key: "top", placement: "top" }, ...slots, { key: "end", placement: "end" }, { key: "sticky", placement: "sticky" }, { key: "popup", placement: "popup" }];
      const text = `${document.title} ${document.querySelector("#main-content")?.textContent?.slice(0, 20000) ?? ""}`.toLowerCase();
      const ctx = { path: pathname, pageType, device: (isMobile() ? "mobile" : "desktop") as "mobile" | "desktop", text, caps: readCaps(), today: todayStr(), now: Date.now(), delivery: data.delivery };
      const p = planPage(applyAbTests(data.ads, visitorId()), data.settings!, available, ctx, paragraphs);
      if (p.popup) {
        const k = `mbc_ad_popup_${todayStr()}`;
        if (localStorage.getItem(k)) delete p.popup; else { localStorage.setItem(k, "1"); window.setTimeout(() => setPopupOpen(true), 8000); }
      }
      setPlan(p);
      // Fill-rate reporting: one row per slot this page offered, filled or not.
      const dev = isMobile() ? "mobile" : "desktop";
      const rows = available.filter((s) => s.placement !== "popup" || data.settings!.allow_popup)
        .map((s) => ({ placement: s.placement, device: dev, filled: !!p[s.key], page_path: pathname.slice(0, 400) }));
      if (rows.length && data.settings!.enabled && !data.settings!.excluded_paths.some((x) => pathMatches(pathname, x))) supabase.from("ad_slot_requests").insert(rows).then(() => {});
      // Conversion: visitor reached a campaign's thank-you path after a click.
      for (const ad of data.ads) {
        if (ad.conversion_path && pathname.startsWith(ad.conversion_path) && sessionStorage.getItem(`mbc_ad_clicked_${ad.id}`)) {
          sessionStorage.removeItem(`mbc_ad_clicked_${ad.id}`);
          logEvent(ad, "conversion", "conversion");
        }
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [data, pathname]);

  const label = data?.settings?.label_text || "Sponsored";
  const nodes = useMemo(() => Object.entries(targets).filter(([k]) => plan[k]).map(([k, el]) => createPortal(<AdCreative key={k + pathname} ad={plan[k]} placement={k.replace(/_\d+$/, "")} label={label} />, el)), [targets, plan, label, pathname]);

  // Remember clicks for conversion tracking.
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="/api/public/ad-click/"]');
      const id = a?.getAttribute("href")?.split("/")[4]?.split("?")[0];
      if (id) sessionStorage.setItem(`mbc_ad_clicked_${id}`, "1");
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  return {
    top: plan.top ? <div className="container mx-auto px-4"><AdCreative key={"top" + pathname} ad={plan.top} placement="top" label={label} /></div> : null,
    end: plan.end ? <div className="container mx-auto px-4"><AdCreative key={"end" + pathname} ad={plan.end} placement="end" label={label} /></div> : null,
    portals: (
      <>
        {nodes}
        {plan.sticky && !stickyClosed && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 shadow-lg backdrop-blur">
            <div className="relative mx-auto max-w-3xl pr-8">
              <AdCreative key={"sticky" + pathname} ad={plan.sticky} placement="sticky" label={label} compact />
              <button aria-label="Close advertisement" onClick={() => setStickyClosed(true)} className="absolute right-0 top-2 p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}
        {plan.popup && popupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setPopupOpen(false)}>
            <div className="relative w-full max-w-md rounded-xl bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <button aria-label="Close advertisement" onClick={() => setPopupOpen(false)} className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              <AdCreative ad={plan.popup} placement="popup" label={label} />
            </div>
          </div>
        )}
      </>
    ),
  };
}
