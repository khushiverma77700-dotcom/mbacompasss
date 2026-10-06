// Pure selection logic for first-party ads. No React, no network.
export type AdCampaign = {
  id: string; ad_code: string; name: string; ad_type: string; status: string;
  headline: string | null; body: string | null; cta_text: string | null;
  desktop_image_url: string | null; mobile_image_url: string | null;
  html_content: string | null; alt_text: string | null; destination_url: string;
  start_at: string | null; end_at: string | null; priority: number; weight: number;
  page_types: string[]; include_paths: string[]; exclude_paths: string[]; keywords: string[];
  devices: string; placements: string[]; max_per_page: number; min_paragraph_gap: number;
  cap_per_day: number; cap_per_session: number; is_fallback: boolean; conversion_path: string | null;
};
export type LengthTier = { max_words: number; ads: number };
export type AdSettings = {
  enabled: boolean; max_ads_per_page: number; excluded_paths: string[]; allow_popup: boolean; label_text: string;
  ads_per_1000_words?: number; length_tiers?: LengthTier[]; sidebar_stack_size?: number; sidebar_gap_px?: number;
  sidebar_sticky?: boolean; homepage_section_ads?: number;
};

export const PLACEMENTS = [
  { key: "top", label: "Top of page" },
  { key: "after_intro", label: "After introduction (articles)" },
  { key: "in_content", label: "Inside content — auto-spaced by length" },
  { key: "mid", label: "Mid-content (articles)" },
  { key: "before_faq", label: "Before FAQ (articles)" },
  { key: "home_section", label: "Between homepage sections" },
  { key: "end", label: "End of content" },
  { key: "sidebar", label: "Sidebar stack (desktop)" },
  { key: "sticky", label: "Sticky bottom bar" },
  { key: "popup", label: "Pop-up (once per day)" },
] as const;

export const DEFAULT_TIERS: LengthTier[] = [
  { max_words: 500, ads: 1 }, { max_words: 1000, ads: 2 }, { max_words: 2000, ads: 3 },
  { max_words: 3500, ads: 4 }, { max_words: 999999, ads: 5 },
];

/** How many in-content ads a body of `words` may carry: min of length tier and density. */
export function inContentBudget(settings: AdSettings, words: number): number {
  if (words < 150) return 0;
  const tiers = (settings.length_tiers?.length ? settings.length_tiers : DEFAULT_TIERS).slice().sort((a, b) => a.max_words - b.max_words);
  const tier = tiers.find((t) => words <= t.max_words)?.ads ?? tiers[tiers.length - 1].ads;
  const density = Math.max(1, Math.round((words / 1000) * (settings.ads_per_1000_words ?? 1.2)));
  return Math.max(0, Math.min(tier, density));
}

export const PAGE_TYPES = ["home", "article", "college", "exam", "tool", "listing", "landing", "course", "static"] as const;

export function detectPageType(path: string): string {
  const p = path.toLowerCase();
  if (p === "/" || p === "") return "home";
  if (/^\/(blog|articles?|news|newsroom)\b/.test(p)) return "article";
  if (/^\/(colleges?|college|mba-colleges|mba-application)\//.test(p)) return "college";
  if (/^\/(exams?)\//.test(p)) return "exam";
  if (/(calculator|profile-analyzer|shortlister|predictor|tools?|compare|formulas|roi)/.test(p)) return "tool";
  if (/^\/(mba-compass|courses?|coaching)\//.test(p)) return "course";
  if (/^\/(mocks|lp|offer|landing)/.test(p)) return "landing";
  if (/^\/(colleges|exams|blog|articles|courses|coaching|mba-application)\/?$/.test(p) || /(-in-|\/city\/|\/category\/)/.test(p)) return "listing";
  return "static";
}

export function pathMatches(path: string, pattern: string): boolean {
  const pat = pattern.trim();
  if (!pat) return false;
  const re = new RegExp("^" + pat.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$", "i");
  return re.test(path) || re.test(path.replace(/\/$/, ""));
}

export type Caps = Record<string, { day: string; dayCount: number; session: number }>;

export function eligible(ad: AdCampaign, ctx: { path: string; pageType: string; device: "mobile" | "desktop"; text: string; caps: Caps; today: string; now: number }): boolean {
  if (ad.status !== "active") return false;
  if (ad.start_at && Date.parse(ad.start_at) > ctx.now) return false;
  if (ad.end_at && Date.parse(ad.end_at) < ctx.now) return false;
  if (ad.devices !== "all" && ad.devices !== ctx.device) return false;
  if (ad.exclude_paths?.some((p) => pathMatches(ctx.path, p))) return false;
  const inc = ad.include_paths?.filter(Boolean) ?? [];
  const types = ad.page_types ?? [];
  if (inc.length && !inc.some((p) => pathMatches(ctx.path, p))) return false;
  if (!inc.length && types.length && !types.includes(ctx.pageType)) return false;
  const kws = (ad.keywords ?? []).filter(Boolean);
  if (kws.length && !kws.some((k) => ctx.text.includes(k.toLowerCase()))) return false;
  const c = ctx.caps[ad.id];
  if (c) {
    if (ad.cap_per_day > 0 && c.day === ctx.today && c.dayCount >= ad.cap_per_day) return false;
    if (ad.cap_per_session > 0 && c.session >= ad.cap_per_session) return false;
  }
  return true;
}

/** Weighted pick favouring priority; never returns an ad already used. */
export function pickAd(pool: AdCampaign[], used: Set<string>, rand = Math.random): AdCampaign | null {
  const avail = pool.filter((a) => !used.has(a.id));
  if (!avail.length) return null;
  const score = (a: AdCampaign) => Math.max(1, a.priority) * Math.max(1, a.weight);
  const total = avail.reduce((s, a) => s + score(a), 0);
  let r = rand() * total;
  for (const a of avail) { r -= score(a); if (r <= 0) return a; }
  return avail[avail.length - 1];
}

export type SlotSpec = { key: string; placement: string };
const IN_CONTENT = ["after_intro", "in_content", "mid"];

/** Does this campaign accept this placement? In-content slots accept any in-content campaign. */
function accepts(a: AdCampaign, placement: string) {
  if (a.placements.includes(placement)) return true;
  return IN_CONTENT.includes(placement) && a.placements.some((p) => IN_CONTENT.includes(p));
}

/** Plan which ad goes in which slot. Main slots share the page budget; the sidebar stack has its own. */
export function planPage(ads: AdCampaign[], settings: AdSettings, slots: SlotSpec[], ctx: Parameters<typeof eligible>[1], paragraphs: number) {
  const result: Record<string, AdCampaign> = {};
  if (!settings.enabled || settings.excluded_paths.some((p) => pathMatches(ctx.path, p))) return result;
  const pool = ads.filter((a) => !a.is_fallback && eligible(a, ctx));
  const fallback = ads.filter((a) => a.is_fallback && eligible({ ...a, page_types: [], include_paths: [], keywords: [] }, ctx));
  const max = settings.max_ads_per_page;
  const used = new Set<string>();
  const perAd: Record<string, number> = {};
  let mainCount = 0;
  const assign = (slot: SlotSpec, allowReuse: boolean) => {
    const candidates = pool.filter((a) => accepts(a, slot.placement) && (perAd[a.id] ?? 0) < Math.max(1, a.max_per_page)
      && (!IN_CONTENT.includes(slot.placement) && slot.placement !== "before_faq" || paragraphs >= a.min_paragraph_gap));
    let ad = pickAd(candidates, used);
    // Different ads first; only reuse a campaign when nothing fresh remains and its own per-page limit allows.
    if (!ad && allowReuse) ad = pickAd(candidates, new Set());
    if (!ad && (slot.placement === "end" || slot.placement === "sidebar")) ad = pickAd(fallback, used);
    if (!ad) return false;
    result[slot.key] = ad; used.add(ad.id); perAd[ad.id] = (perAd[ad.id] ?? 0) + 1;
    return true;
  };
  for (const slot of slots) {
    if (slot.placement === "sidebar") continue;
    if (mainCount >= max) break;
    if (slot.placement === "popup" && !settings.allow_popup) continue;
    if (assign(slot, true)) mainCount++;
  }
  for (const slot of slots.filter((s) => s.placement === "sidebar")) assign(slot, false);
  return result;
}
