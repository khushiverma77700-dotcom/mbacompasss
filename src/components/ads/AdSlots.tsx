import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/lib/router-compat";
import { detectPageType, planPage, type AdCampaign, type AdSettings, type Caps } from "@/lib/ads/engine";
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

function findContentTargets(): { targets: Targets; paragraphs: number } {
  const targets: Targets = {};
  const body = document.querySelector<HTMLElement>("#main-content .prose") || document.querySelector<HTMLElement>("#main-content article");
  let paragraphs = 0;
  if (body) {
    const paras = Array.from(body.querySelectorAll(":scope > p"));
    paragraphs = paras.length;
    const make = (after: Element | null, key: string, before = false) => {
      if (!after) return;
      const el = document.createElement("div");
      el.dataset.adSlot = key;
      before ? after.before(el) : after.after(el);
      targets[key] = el;
    };
    make(paras[1] ?? null, "after_intro");
    if (paras.length >= 8) make(paras[Math.floor(paras.length / 2)], "mid");
    const faq = Array.from(body.querySelectorAll("h2")).find((h) => /faq|frequently asked/i.test(h.textContent || ""));
    if (faq && paras.length >= 6) make(faq, "before_faq", true);
  }
  const side = document.querySelector<HTMLElement>("[data-ad-sidebar]");
  if (side) targets.sidebar = side;
  return { targets, paragraphs };
}

export default function AdSlots() {
  const { pathname } = useLocation();
  const [targets, setTargets] = useState<Targets>({});
  const [plan, setPlan] = useState<Record<string, AdCampaign>>({});
  const [stickyClosed, setStickyClosed] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["first-party-ads"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: ads }, { data: settings }] = await Promise.all([
        supabase.from("ad_campaigns").select("*").eq("status", "active"),
        supabase.from("ad_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      return { ads: (ads ?? []) as unknown as AdCampaign[], settings: settings as unknown as AdSettings | null };
    },
  });

  useEffect(() => {
    if (!data?.settings || !data.ads.length) { setPlan({}); return; }
    setStickyClosed(false);
    const t = window.setTimeout(() => {
      document.querySelectorAll("[data-ad-slot]").forEach((n) => n.remove());
      const { targets: found, paragraphs } = findContentTargets();
      setTargets(found);
      const available = ["top", ...Object.keys(found), "end", "sticky", "popup"];
      const text = `${document.title} ${document.querySelector("#main-content")?.textContent?.slice(0, 20000) ?? ""}`.toLowerCase();
      const ctx = { path: pathname, pageType: detectPageType(pathname), device: (isMobile() ? "mobile" : "desktop") as "mobile" | "desktop", text, caps: readCaps(), today: todayStr(), now: Date.now() };
      const p = planPage(data.ads, data.settings!, available, ctx, paragraphs);
      if (p.popup) {
        const k = `mbc_ad_popup_${todayStr()}`;
        if (localStorage.getItem(k)) delete p.popup; else { localStorage.setItem(k, "1"); window.setTimeout(() => setPopupOpen(true), 8000); }
      }
      setPlan(p);
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
  const nodes = useMemo(() => Object.entries(targets).filter(([k]) => plan[k]).map(([k, el]) => createPortal(<AdCreative key={k + pathname} ad={plan[k]} placement={k} label={label} />, el)), [targets, plan, label, pathname]);

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
  } as unknown as JSX.Element;
}
