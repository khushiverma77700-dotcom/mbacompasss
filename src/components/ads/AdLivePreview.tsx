import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdCreative } from "@/components/ads/AdSlots";
import { PLACEMENTS, type AdCampaign } from "@/lib/ads/engine";
import { AD_FORMATS } from "@/lib/ads/formats";

const PAGES = [
  { v: "home", l: "Homepage" }, { v: "article", l: "Article / Blog" }, { v: "college", l: "College page" },
  { v: "exam", l: "Exam page" }, { v: "tool", l: "Tool page" }, { v: "listing", l: "Category / List" },
] as const;

const Block = ({ h = "h-16", label }: { h?: string; label?: string }) => (
  <div className={`${h} flex items-center rounded-md bg-muted px-3 text-sm text-muted-foreground`}>{label}</div>
);
const Lines = () => (
  <div className="space-y-1.5">{[100, 95, 88, 70].map((w) => <div key={w} className="h-2 rounded bg-muted" style={{ width: `${w}%` }} />)}</div>
);
const labelOf = (k: string) => PLACEMENTS.find((p) => p.key === k)?.label ?? k;

/** Wireframe of each page type showing every spot this ad is allowed in. Updates as the form changes. */
export default function AdLivePreview({ ad, label }: { ad: Partial<AdCampaign>; label: string }) {
  const [page, setPage] = useState<string>("article");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [format, setFormat] = useState("creative");
  const full = { id: "preview", ad_code: "", name: ad.name || "Your ad", ad_type: "image", status: "draft", headline: null, body: null, cta_text: null,
    desktop_image_url: null, mobile_image_url: null, html_content: null, alt_text: null, destination_url: "#", ...ad } as AdCampaign;
  const shown = device === "mobile" ? { ...full, desktop_image_url: full.mobile_image_url || full.desktop_image_url } : full;
  const pl = new Set(ad.placements ?? []);
  const deviceOk = !ad.devices || ad.devices === "all" || ad.devices === device;
  const typeOk = !ad.page_types?.length || ad.page_types.includes(page);
  const mobile = device === "mobile";

  const Spot = ({ k, alt }: { k: string; alt?: string[] }) => {
    const on = [k, ...(alt ?? [])].some((x) => pl.has(x));
    if (!on || !deviceOk || !typeOk) return null;
    return (
      <div className="min-w-0 border-y border-border py-3">
        <div className="text-center text-sm text-muted-foreground">{labelOf(k)}</div>
        <AdCreative ad={shown} placement={k} label={label} preview device={device} compact={k === "sticky"} />
      </div>
    );
  };

  const article = page === "article";
  const home = page === "home";
  const hasSidebar = !mobile && pl.has("sidebar") && ["article", "college", "exam"].includes(page);
  const sideCount = 1;

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Creative preview</div>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")} className="gap-1"><Monitor className="h-4 w-4" />Desktop</Button>
          <Button type="button" size="sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")} className="gap-1"><Smartphone className="h-4 w-4" />Mobile</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button type="button" size="sm" variant={format === "creative" ? "secondary" : "ghost"} onClick={() => setFormat("creative")}>Creative</Button>
        <Button type="button" size="sm" variant={format === "auto" ? "secondary" : "ghost"} onClick={() => setFormat("auto")}>Placement</Button>
        {AD_FORMATS.filter((f) => ad.creative_variants?.[f.key]).map((f) => <Button key={f.key} type="button" size="sm" variant={format === f.key ? "secondary" : "ghost"} onClick={() => setFormat(f.key)}>{f.key}</Button>)}
      </div>
      {format !== "auto" ? <div className="min-h-64 overflow-auto border-y border-border bg-background px-2 py-4"><AdCreative ad={shown} placement="in_content" label={label} preview format={format === "creative" ? undefined : format} device={device} /></div> : <>
      <div className="flex flex-wrap gap-1">{PAGES.map((p) => <Button key={p.v} type="button" size="sm" variant={page === p.v ? "secondary" : "ghost"} onClick={() => setPage(p.v)}>{p.l}</Button>)}</div>
      {(!deviceOk || !typeOk) && <p className="rounded-md bg-muted p-2 text-sm text-muted-foreground">This ad won't show here — {!deviceOk ? `it is set to ${ad.devices} only` : "this page type isn't ticked"}.</p>}
      {pl.size === 0 && <p className="text-sm text-muted-foreground">Tick at least one placement below to see it here.</p>}

      <div className={`relative max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-background p-3 ${mobile ? "mx-auto w-full max-w-[360px]" : ""}`}>
        <Block h="h-8" label="Navigation" />
        <div className={`mt-3 grid gap-4 ${hasSidebar ? "grid-cols-1" : ""}`}>
          <div className="space-y-3">
            {home ? (<>
              <Block h="h-28" label="Hero" /><Block h="h-20" label="Section" /><Spot k="home_section" alt={["in_content", "mid"]} />
              <Block h="h-20" label="Section" /><Block h="h-20" label="Section" /><Spot k="home_section" alt={["in_content", "mid"]} /><Block h="h-20" label="Section" />
            </>) : article ? (<>
              <Block h="h-10" label="Article title" /><Lines /><Spot k="after_intro" alt={["in_content", "mid"]} />
              <Block h="h-6" label="Section heading" /><Lines /><Lines /><Spot k="in_content" alt={["mid", "after_intro"]} />
              <Block h="h-6" label="Section heading" /><Lines /><Block h="h-14" label="Table" /><Lines /><Spot k="mid" alt={["in_content", "after_intro"]} />
              <Lines /><Spot k="before_faq" /><Block h="h-14" label="FAQ" />
            </>) : (<>
              <Block h="h-24" label={page === "listing" ? "Filters & heading" : "Page header"} /><Block h="h-20" label="Section" /><Spot k="mid" alt={["in_content", "after_intro"]} />
              <Block h="h-20" label="Section" /><Block h="h-20" label="Section" /><Spot k="mid" alt={["in_content", "after_intro"]} /><Block h="h-20" label="Section" />
            </>)}
            <Spot k="end" />
          </div>
          {hasSidebar && (
            <div className="space-y-3">
              <Block h="h-20" label="Sidebar" />
              {pl.has("sidebar") && Array.from({ length: sideCount }).map((_, i) => <Spot key={i} k="sidebar" />)}
            </div>
          )}
        </div>
        <div className="mt-3"><Block h="h-10" label="Footer" /></div>
        {(mobile || pl.has("sticky")) && <div className="sticky bottom-0 mt-3"><Spot k="sticky" /></div>}
        {pl.has("popup") && <div className="mt-3"><Spot k="popup" /></div>}
      </div>
      </>}
    </section>
  );
}
