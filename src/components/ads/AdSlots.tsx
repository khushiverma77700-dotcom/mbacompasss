import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/lib/router-compat";
import { applyAbTests, detectPageType, inContentBudget, pathMatches, type Delivery, planPage, type AdCampaign, type AdSettings, type Caps, type SlotSpec, type ReadingJourney } from "@/lib/ads/engine";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Button } from "@/components/ui/button";
import { articleBlocks, editorialBody } from "@/lib/ads/structure";
import { selectCreative } from "@/lib/ads/formats";

// Current-tab memory only: no identifiers, URLs with query strings or profile uploads.
let journey: ReadingJourney = { entryPath: "", previousPath: "", interests: [] };
let lastJourneyPath = "";
function readingJourney(path: string): ReadingJourney {
  if (lastJourneyPath !== path) {
    journey = { entryPath: journey.entryPath || path, previousPath: lastJourneyPath, interests: journey.interests };
    lastJourneyPath = path;
  }
  const title = document.querySelector("#main-content h1")?.textContent?.toLowerCase().slice(0, 250) || "";
  if (title && !journey.interests.includes(title)) journey.interests = [title, ...journey.interests].slice(0, 8);
  return journey;
}

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
  if (type === "impression") pushRecent([ad.id]);
  supabase.from("ad_events").insert({ campaign_id: ad.id, event_type: type, placement, page_path: location.pathname.slice(0, 400), device: isMobile() ? "mobile" : "desktop" }).then(() => {});
}

export function AdCreative({ ad, placement, label, preview, compact, format, device }: { ad: AdCampaign; placement: string; label: string; preview?: boolean; compact?: boolean; format?: string; device?: "mobile" | "desktop" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(!!preview);
  const [slotWidth, setSlotWidth] = useState(300);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    const observer = new ResizeObserver(([entry]) => setSlotWidth(entry.contentRect.width));
    observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (preview || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "400px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [preview]);
  useEffect(() => {
    if (preview || !near || !ref.current) return;
    let timer: number | undefined; let done = false;
    const obs = new IntersectionObserver(([e]) => {
      if (done) return;
      if (timer) { clearTimeout(timer); timer = undefined; }
      if (e.intersectionRatio >= 0.5) timer = window.setTimeout(() => { done = true; logEvent(ad, "impression", placement); bumpCap(ad.id); obs.disconnect(); }, 1000);
      else if (timer) clearTimeout(timer);
    }, { threshold: [0, 0.5] });
    obs.observe(ref.current);
    return () => { obs.disconnect(); if (timer) clearTimeout(timer); };
  }, [ad, placement, preview, near]);

  const href = preview ? ad.destination_url : `/api/public/ad-click/${ad.id}?p=${encodeURIComponent(placement)}`;
  const selected = selectCreative(ad.creative_variants, slotWidth, placement, format);
  const img = (selected ? ad.creative_variants?.[selected.key] : (device === "mobile" || (!device && isMobile()) ? ad.mobile_image_url || ad.desktop_image_url : ad.desktop_image_url || ad.mobile_image_url)) || "";
  const showImage = ["image", "gif", "poster", "image_cta"].includes(ad.ad_type) && img;
  const showText = !selected && (["text_cta", "image_cta"].includes(ad.ad_type) || !showImage);
  const vertical = placement === "sidebar" || placement === "popup";

  return (
    <aside ref={ref} data-nosnippet aria-label={label} className="not-prose my-6 w-full min-w-0 @container">
      {!near ? <div aria-hidden className="min-h-40 rounded-lg bg-muted/30" /> : <>
      <div className="mb-2 text-center text-sm text-muted-foreground">{label}</div>
      {ad.ad_type === "html" && ad.html_content ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ad.html_content) }} />
      ) : (
        <a href={href} target="_blank" rel="sponsored noopener" style={{ width: showText ? Math.min(slotWidth, 336) : selected?.width, maxWidth: "100%" }} className={`mx-auto flex max-w-full ${showText ? "max-w-[336px] flex-col gap-3 border border-border bg-card p-3" : "w-fit flex-col"} overflow-hidden transition-opacity hover:opacity-90`}>
          {showImage && <img src={img} alt={ad.alt_text || ad.name} loading="lazy" decoding="async" width={selected?.width} height={selected?.height} style={{ maxWidth: selected?.width ?? (vertical ? 336 : 728) }} className="h-auto w-auto max-w-full object-contain" />}
          {showText && (
            <div className={`flex min-w-0 flex-1 flex-col gap-2 ${compact ? "gap-1" : ""}`}>
              <div>
                <div className={`${compact ? "line-clamp-1 text-sm" : "break-words"} font-semibold text-foreground`}>{ad.headline || ad.name}</div>
                {ad.body && !compact && <p className="text-sm text-muted-foreground">{ad.body}</p>}
              </div>
              <span className={`inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground ${compact ? "self-start" : "shrink-0"}`}>{ad.cta_text || "Learn more"}</span>
            </div>
          )}
        </a>
      )}
      </>}
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
  const blocks = articleBlocks(body);
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
    const sibling = cur.nextElementSibling;
    if (isHeading(cur) || BLOCKY.test(next.tagName) || (sibling && (BLOCKY.test(sibling.tagName) || sibling.querySelector('table,figure,video')))) continue;
    if (acc < 120) continue; // let the intro breathe
    if (total - acc < 80 && faqIdx < 0) continue; // not right at the end
    cands.push({ i, at: acc, score: /^H[23]$/.test(next.tagName) ? 3 : 1 });
  }
  const budget = Math.min(inContentBudget(settings, total), settings.max_ads_per_page);
  const picked: Cand[] = [];
  const minGap = Math.max(150, total / (budget + 1) / 2);
  for (let n = 1; n <= budget; n++) {
    const target = n === 1 ? Math.min(250, total / (budget + 1)) : (total * n) / (budget + 1);
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

/** College/exam/tool pages: place mid-page ads between the main column's sections. */
function findPageSlots(col: HTMLElement, settings: AdSettings, found: Found) {
  const sections = Array.from(col.children).filter((s) => !(s as HTMLElement).dataset?.adSlot && (s as HTMLElement).offsetHeight > 80);
  const n = Math.min(settings.page_section_ads ?? 2, Math.max(0, sections.length - 1));
  for (let k = 1; k <= n; k++) {
    const idx = Math.max(0, Math.round((sections.length * k) / (n + 1)) - 1);
    const key = `mid_${k}`;
    found.targets[key] = makeSlot(sections[idx], key);
    found.slots.push({ key, placement: "mid" });
  }
}

const RECENT_KEY = "mbc_ad_recent";
function readRecent(): string[] { try { return JSON.parse(sessionStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } }
function pushRecent(ids: string[]) { try { sessionStorage.setItem(RECENT_KEY, JSON.stringify([...ids, ...readRecent().filter((x) => !ids.includes(x))].slice(0, 12))); } catch { /* ignore */ } }

/** Popup frequency: separate, much stricter caps (per visit and per day). */
function popupAllowed(settings: AdSettings) {
  try {
    const t = todayStr();
    const day = JSON.parse(localStorage.getItem("mbc_ad_popup_day") || "{}");
    const ses = Number(sessionStorage.getItem("mbc_ad_popup_ses") || 0);
    const perSes = settings.popup_per_session ?? 1, perDay = settings.popup_per_day ?? 2;
    if (perSes > 0 && ses >= perSes) return false;
    if (perDay > 0 && day.d === t && day.n >= perDay) return false;
    localStorage.setItem("mbc_ad_popup_day", JSON.stringify({ d: t, n: day.d === t ? day.n + 1 : 1 }));
    sessionStorage.setItem("mbc_ad_popup_ses", String(ses + 1));
    return true;
  } catch { return false; }
}

function findContentTargets(settings: AdSettings, pageType: string): Found {
  const found: Found = { targets: {}, slots: [], paragraphs: 0 };
  const main = document.querySelector<HTMLElement>("#main-content");
  const body = main ? editorialBody(main) : null;
  if (pageType === "home" && main) findHomeSlots(main, settings, found);
  else if (body) findArticleSlots(body, settings, found);
  else {
    const col = document.querySelector<HTMLElement>("#main-content [data-ad-content]");
    if (col) findPageSlots(col, settings, found);
    else if (main) findHomeSlots(main, { ...settings, homepage_section_ads: settings.page_section_ads ?? 2 }, found);
  }
  const side = document.querySelector<HTMLElement>("[data-ad-sidebar]");
  if (side && window.matchMedia("(min-width: 1024px)").matches) {
    const gap = settings.sidebar_gap_px ?? 16;
    side.style.display = "flex"; side.style.flexDirection = "column"; side.style.gap = `${gap}px`;
    side.style.position = settings.sidebar_sticky === false ? "static" : "sticky";
    side.style.top = "96px";
    side.style.alignSelf = "start";
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
  const [reading, setReading] = useState(false);
  useEffect(() => { readingJourney(pathname); }, [pathname]);

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

  // Preview studio: ?ad_preview=<id>&ad_spot=<placement|all> forces one ad (any status; admins only can read drafts) into real slots.
  const previewParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const previewId = previewParams?.get("ad_preview") ?? null;
  const previewSpot = previewParams?.get("ad_spot") ?? "all";
  const { data: previewAd } = useQuery({
    queryKey: ["ad-preview", previewId],
    enabled: !!previewId,
    queryFn: async () => {
      if (!previewId) return null;
      return (await supabase.from("ad_campaigns").select("*").eq("id", previewId).maybeSingle()).data as unknown as AdCampaign | null;
    },
  });
  useEffect(() => {
    const settings = data?.settings;
    const main = document.querySelector<HTMLElement>("#main-content");
    setPlan({}); setTargets({}); setStickyClosed(false); setPopupOpen(false);
    if (!settings || !main || (previewId ? !previewAd : !data.ads.length)) return;
    let timer: number | undefined;
    let popupTimer: number | undefined;
    let signature = "";
    const reported = new Set<string>();
    const owned = new Set<HTMLElement>();
    let rebuilds = 0;
    const rebuild = () => {
      const body = editorialBody(main);
      const blocks = body ? articleBlocks(body) : blocksOf(main);
      // Signature ignores ad slots so inserted ads never trigger another layout pass.
      const plain = (b: Element) => {
        if (b.closest("[data-ad-slot]")) return "";
        let t = b.textContent || "";
        b.querySelectorAll("[data-ad-slot]").forEach((s) => { t = t.replace(s.textContent || "", ""); });
        return t.length;
      };
      const next = `${body?.className ?? "page"}:${isMobile()}:${window.innerWidth >= 1024}:${blocks.length}:${blocks.map(plain).join("|")}`;
      if (next === signature) return;
      if (++rebuilds > 12) { observer.disconnect(); return; }
      signature = next;
      if (popupTimer) { clearTimeout(popupTimer); popupTimer = undefined; }
      owned.forEach((node) => node.remove()); owned.clear();
      const found = findContentTargets(previewId ? { ...settings, max_ads_per_page: 10 } : settings, detectPageType(pathname));
      Object.values(found.targets).forEach((node) => owned.add(node));
      setTargets(found.targets);
      const available: SlotSpec[] = [...found.slots, { key: "end", placement: "end" }, { key: "sticky", placement: "sticky" }, { key: "popup", placement: "popup" }];
      let chosen: Record<string, AdCampaign> = {};
      if (previewId && previewAd) {
        for (const slot of available) {
          const selected = previewSpot === "all" || slot.placement === previewSpot || (previewSpot === "in_content" && ["after_intro", "mid"].includes(slot.placement));
          // Preview uses the same campaign placement permissions, but bypasses delivery caps.
          const accepts = previewAd.placements.includes(slot.placement) || (["after_intro", "in_content", "mid", "home_section"].includes(slot.placement) && previewAd.placements.some((p) => ["after_intro", "in_content", "mid", "home_section"].includes(p)));
          if (selected && accepts && slot.placement !== "popup") chosen[slot.key] = previewAd;
        }
      } else {
        const text = `${document.title} ${blocks.map((b) => b.textContent).join(" ").slice(0, 20000)}`.toLowerCase();
        const ctx = { path: pathname, pageType: detectPageType(pathname), device: (isMobile() ? "mobile" : "desktop") as "mobile" | "desktop", text, caps: readCaps(), today: todayStr(), now: Date.now(), delivery: data.delivery, recent: readRecent(), journey: readingJourney(pathname) };
        chosen = planPage(applyAbTests(data.ads, visitorId()), settings, available, ctx, found.paragraphs);
        if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ad_debug")) {
          console.log("[ad-debug]", JSON.stringify({ slots: available, chosen: Object.keys(chosen), ads: data.ads.map((a) => ({ id: a.id, name: a.name, status: a.status, placements: a.placements, page_types: a.page_types, start_at: a.start_at })), settings: { enabled: settings.enabled, excluded: settings.excluded_paths }, paragraphs: found.paragraphs, pageType: ctx.pageType }));
        }
        if (chosen.popup) {
          if (!popupAllowed(settings)) delete chosen.popup;
          else popupTimer = window.setTimeout(() => setPopupOpen(true), Math.max(0, settings.popup_delay_seconds ?? 8) * 1000);
        }
        const rows = available.filter((slot) => !reported.has(slot.key) && (slot.placement !== "popup" || settings.allow_popup)).map((slot) => {
          reported.add(slot.key);
          return { placement: slot.placement, device: ctx.device, filled: !!chosen[slot.key], page_path: pathname.slice(0, 400) };
        });
        if (rows.length && settings.enabled && !settings.excluded_paths.some((p) => pathMatches(pathname, p))) supabase.from("ad_slot_requests").insert(rows).then(() => {});
      }
      setPlan(chosen);
    };
    const schedule = () => { if (timer) return; timer = window.setTimeout(() => { timer = undefined; rebuild(); }, 250); };
    // Slow queries or transformed article markup can land after the first discovery pass.
    const settle = window.setInterval(rebuild, 2000);
    const stopSettle = window.setTimeout(() => clearInterval(settle), 15000);
    const observer = new MutationObserver((records) => {
      if (records.some((r) => {
        const target = r.target instanceof Element ? r.target : r.target.parentElement;
        if (target?.closest("[data-ad-slot],.not-prose")) return false;
        if (r.type === "characterData") return true;
        return [...r.addedNodes, ...r.removedNodes].some((n) => !(n instanceof HTMLElement && n.dataset.adSlot));
      })) schedule();
    });
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect(); window.removeEventListener("resize", schedule);
      clearInterval(settle); clearTimeout(stopSettle);
      if (timer) clearTimeout(timer); if (popupTimer) clearTimeout(popupTimer);
      owned.forEach((node) => node.remove());
    };
  }, [data, pathname, previewId, previewAd, previewSpot]);

  useEffect(() => {
    if (previewId || !data) return;
    for (const ad of data.ads) {
      try {
        if (ad.conversion_path && pathMatches(pathname, ad.conversion_path) && sessionStorage.getItem(`mbc_ad_clicked_${ad.id}`)) {
          sessionStorage.removeItem(`mbc_ad_clicked_${ad.id}`); logEvent(ad, "conversion", "conversion");
        }
      } catch { /* storage can be unavailable */ }
    }
  }, [pathname, data, previewId]);

  useEffect(() => {
    setReading(false);
    const scroll = () => {
      if (window.scrollY > Math.min(500, window.innerHeight * 0.5)) setReading(true);
    };
    window.addEventListener("scroll", scroll, { passive: true }); scroll();
    return () => window.removeEventListener("scroll", scroll);
  }, [pathname]);

  const label = data?.settings?.label_text || "Sponsored";
  const nodes = useMemo(() => Object.entries(targets).filter(([k]) => plan[k]).map(([k, el]) => createPortal(<AdCreative key={k + pathname} preview={!!previewId} ad={plan[k]} placement={k.replace(/_\d+$/, "")} label={label} />, el)), [targets, plan, label, pathname, previewId]);

  // Remember clicks for conversion tracking.
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="/api/public/ad-click/"]');
      const id = a?.getAttribute("href")?.split("/")[4]?.split("?")[0];
      if (id) { try { sessionStorage.setItem(`mbc_ad_clicked_${id}`, "1"); pushRecent([id]); } catch { /* storage unavailable */ } }
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  return {
    top: null,
    end: plan.end ? <div className="container mx-auto px-4"><AdCreative key={"end" + pathname} preview={!!previewId} ad={plan.end} placement="end" label={label} /></div> : null,
    portals: (
      <>
        {nodes}
        {plan.sticky && !stickyClosed && (reading || !!previewId) && (
          <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-40 border-t border-border bg-background/95 px-3 shadow-lg backdrop-blur">
            <div className="relative mx-auto max-w-3xl pr-8">
              <AdCreative key={"sticky" + pathname} preview={!!previewId} ad={plan.sticky} placement="sticky" label={label} compact />
              <Button type="button" size="icon" variant="ghost" aria-label="Close advertisement" onClick={() => setStickyClosed(true)} className="absolute right-0 top-2"><X className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
        {plan.popup && popupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setPopupOpen(false)}>
            <div className="relative w-full max-w-md rounded-xl bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <Button type="button" size="icon" variant="ghost" aria-label="Close advertisement" onClick={() => setPopupOpen(false)} className="absolute right-2 top-2"><X className="h-4 w-4" /></Button>
              <AdCreative ad={plan.popup} placement="popup" label={label} />
            </div>
          </div>
        )}
      </>
    ),
  };
}
