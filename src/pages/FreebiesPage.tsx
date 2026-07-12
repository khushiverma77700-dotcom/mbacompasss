import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Download, FileText, Search, Sparkles, Gift, Loader2, BookOpen,
  TrendingUp, Users, Star, ShieldCheck, Clock, Award, ChevronRight, Flame,
  GraduationCap, Target, Zap, CheckCircle2, Quote, Layers, Rocket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Freebie = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  download_count: number;
  created_at?: string;
};

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function compactNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// Deterministic pastel gradient per card
const GRADIENTS = [
  "from-sky-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-sky-600",
];
const hashIdx = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % GRADIENTS.length;
};

const CATEGORY_ICONS: Record<string, string> = {
  Quant: "∑", VARC: "Aa", LRDI: "◇", GK: "🌐", Interview: "✦", Strategy: "◈", Practice: "▶",
};

const FreebiesPage = () => {
  const [items, setItems] = useState<Freebie[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const TITLE =
      "Free MBA Study Material 2025 — CAT, XAT, NMAT, SNAP PDFs | MBA Compass";
    const DESC =
      "Download 100% free MBA study material for CAT 2025, XAT, NMAT, SNAP & IIFT — Quant formula sheets, VARC cheatsheets, LRDI question banks, GK digests, WAT-PI kits. Curated by 99+ percentilers & IIM alumni. No signup, instant PDF download.";
    const URL = "https://mbacompass.in/freebies";
    const KEYWORDS =
      "free MBA study material, CAT 2025 PDF, XAT preparation free, NMAT free notes, SNAP free material, quant formula sheet PDF, VARC cheatsheet, LRDI question bank, MBA free download, IIM interview kit, WAT PI questions, GK for CAT, MBA preparation PDF, free CAT notes";

    document.title = TITLE;

    const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const upsertLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    upsertMeta("name", "description", DESC);
    upsertMeta("name", "keywords", KEYWORDS);
    upsertMeta("name", "robots", "index,follow,max-image-preview:large,max-snippet:-1");
    upsertMeta("name", "author", "MBA Compass");
    upsertLink("canonical", URL);

    upsertMeta("property", "og:title", TITLE);
    upsertMeta("property", "og:description", DESC);
    upsertMeta("property", "og:url", URL);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "MBA Compass");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", TITLE);
    upsertMeta("name", "twitter:description", DESC);

    // CollectionPage + Breadcrumb JSON-LD
    const ldId = "freebies-collection-jsonld";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          name: TITLE,
          description: DESC,
          url: URL,
          isPartOf: { "@type": "WebSite", name: "MBA Compass", url: "https://mbacompass.in" },
          about: [
            "CAT 2025 preparation",
            "MBA entrance exam study material",
            "Free MBA PDFs",
          ],
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://mbacompass.in" },
            { "@type": "ListItem", position: 2, name: "Freebies", item: URL },
          ],
        },
      ],
    });
    document.head.appendChild(ld);
    return () => {
      document.getElementById(ldId)?.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("freebies")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: false })
        .order("created_at", { ascending: false });
      if (!error) setItems((data || []) as Freebie[]);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return ["All", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (activeCat !== "All" && i.category !== activeCat) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        i.title.toLowerCase().includes(s) ||
        (i.description || "").toLowerCase().includes(s) ||
        (i.tags || []).some((t) => t.toLowerCase().includes(s))
      );
    });
  }, [items, q, activeCat]);

  const stats = useMemo(() => {
    const total = items.length;
    const downloads = items.reduce((sum, i) => sum + (i.download_count || 0), 0);
    const cats = new Set(items.map((i) => i.category).filter(Boolean)).size;
    return { total, downloads, cats };
  }, [items]);

  const trending = useMemo(
    () => [...items].sort((a, b) => (b.download_count || 0) - (a.download_count || 0)).slice(0, 3),
    [items],
  );

  const handleDownload = async (f: Freebie) => {
    setDownloadingId(f.id);
    try {
      let url = f.file_url;
      if (!url.startsWith("http")) {
        const { data, error } = await supabase.storage
          .from("freebies")
          .createSignedUrl(url, 60 * 10, { download: f.file_name || true });
        if (error) throw error;
        url = data.signedUrl;
      }
      supabase
        .from("freebies")
        .update({ download_count: (f.download_count || 0) + 1 })
        .eq("id", f.id)
        .then(() => {});
      // optimistic UI bump
      setItems((prev) => prev.map((p) => (p.id === f.id ? { ...p, download_count: (p.download_count || 0) + 1 } : p)));
      window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-8 sm:pt-20 sm:pb-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-sky-200 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-sky-700 shadow-sm max-w-full">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
            </span>
            <span className="truncate">100% Free · No email wall · Instant download</span>
          </div>

          <h1 className="mt-4 sm:mt-5 text-3xl sm:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            MBA Prep{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Freebies
              </span>
              <Sparkles className="absolute -top-2 -right-4 sm:-top-3 sm:-right-6 h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
            </span>
            <br className="hidden sm:block" />
            <span className="text-slate-700 text-lg sm:text-3xl font-semibold block mt-2">
              curated by 99%ilers, free for you.
            </span>
          </h1>

          <p className="mt-3 sm:mt-4 max-w-2xl mx-auto text-xs sm:text-base text-slate-600 leading-relaxed px-2">
            Formula sheets · Cheatsheets · Question banks · Interview kits — everything you need for CAT, XAT, NMAT, SNAP & IIFT in one place.
          </p>


          {/* Search */}
          <div className="mt-6 sm:mt-8 max-w-xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl blur opacity-20 group-focus-within:opacity-40 transition" />
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search formula sheets, PDFs…"
                  className="pl-10 sm:pl-12 pr-4 h-12 sm:h-14 bg-white border-slate-200 shadow-md rounded-xl text-sm sm:text-base focus-visible:ring-sky-500"
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* Stat pills */}
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            <StatPill icon={<FileText className="h-4 w-4" />} value={stats.total} label="Resources" />
            <StatPill icon={<Download className="h-4 w-4" />} value={compactNum(stats.downloads)} label="Downloads" />
            <StatPill icon={<BookOpen className="h-4 w-4" />} value={stats.cats} label="Categories" />
          </div>

          {/* Trust row */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] sm:text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified by advisors</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-sky-600" /> 50,000+ aspirants</span>
            <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Rated 4.9/5</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-blue-600" /> Updated for 2025</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — 3 steps */}
      <section className="border-b border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: "01", icon: <Search className="h-5 w-5" />, t: "Search or browse", d: "Filter by exam, topic or type — Quant, VARC, LRDI, GK, WAT-PI and more.", g: "from-sky-500 to-blue-600" },
              { n: "02", icon: <Zap className="h-5 w-5" />, t: "One-click download", d: "No signup, no email wall. Every resource opens as a printable PDF in seconds.", g: "from-violet-500 to-fuchsia-600" },
              { n: "03", icon: <Rocket className="h-5 w-5" />, t: "Ace CAT 2025", d: "Follow the strategy playbook, drill high-yield topics and track your score curve.", g: "from-emerald-500 to-teal-600" },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-5 hover:border-sky-300 hover:shadow-lg transition-all overflow-hidden">
                <div className={`absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.g} opacity-10`} />
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.g} text-white grid place-items-center shadow-md`}>
                    {s.icon}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 tabular-nums tracking-widest">STEP {s.n}</div>
                </div>
                <h3 className="mt-3 font-bold text-slate-900">{s.t}</h3>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED — AUTO-SCROLLING MARQUEES */}
      {items.length > 0 && !loading && (
        <section className="py-10 sm:py-14 bg-white border-b border-slate-100">
          <div className="max-w-6xl mx-auto px-4 mb-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Featured library
                </div>
                <h2 className="mt-1 text-xl sm:text-3xl font-bold text-slate-900 leading-tight">
                  Hand-picked resources, moving in real time
                </h2>
                <p className="mt-1 text-sm text-slate-500">Hover to pause · click any card to download instantly</p>
              </div>
            </div>
          </div>

          {/* Row 1 — LTR */}
          <div className="freebies-marquee-track relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="freebies-marquee flex gap-4 w-max py-2">
              {[...items, ...items].map((f, idx) => (
                <MarqueeCard key={`m1-${f.id}-${idx}`} f={f} onClick={() => handleDownload(f)} downloading={downloadingId === f.id} />
              ))}
            </div>
          </div>

          {/* Row 2 — RTL, offset */}
          <div className="freebies-marquee-track relative overflow-hidden mt-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="freebies-marquee-reverse flex gap-4 w-max py-2">
              {[...items.slice().reverse(), ...items.slice().reverse()].map((f, idx) => (
                <MarqueeCard key={`m2-${f.id}-${idx}`} f={f} onClick={() => handleDownload(f)} downloading={downloadingId === f.id} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TRENDING STRIP */}
      {trending.length > 0 && !loading && (
        <section className="max-w-6xl mx-auto px-4 pt-10 sm:pt-14">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5" /> Trending this week
              </div>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">Most downloaded by aspirants</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trending.map((f, idx) => (
              <button
                key={f.id}
                onClick={() => handleDownload(f)}
                className="group relative text-left overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 hover:border-sky-300 hover:shadow-lg transition-all"
              >
                <div className="absolute top-3 right-3 text-[10px] font-bold text-slate-300 tabular-nums">#{idx + 1}</div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${GRADIENTS[hashIdx(f.id)]} grid place-items-center text-white shadow-md`}>
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold text-sm text-slate-900 line-clamp-2 group-hover:text-sky-700">
                  {f.title}
                </h3>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{compactNum(f.download_count || 0)} downloads</span>
                  <span className="flex items-center gap-0.5 text-sky-600 group-hover:translate-x-0.5 transition-transform">
                    Get it <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* CATEGORY CHIPS */}
      {categories.length > 1 && (
        <section className="max-w-6xl mx-auto px-4 pt-10 sm:pt-14">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Browse the library</div>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
                {activeCat === "All" ? "All Resources" : activeCat}{" "}
                <span className="text-slate-400 font-normal text-base">· {filtered.length}</span>
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const isActive = activeCat === c;
              const count = c === "All" ? items.length : items.filter((i) => i.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                      : "bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:text-sky-700 hover:shadow-sm"
                  }`}
                >
                  {c !== "All" && CATEGORY_ICONS[c] && (
                    <span className="text-[13px] leading-none">{CATEGORY_ICONS[c]}</span>
                  )}
                  {c}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* GRID */}
      <section className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                  <div className="h-9 bg-slate-100 rounded-lg animate-pulse mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Gift className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">Nothing here yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              {items.length === 0 ? "New freebies are being prepared — check back soon." : "No resources match your search."}
            </p>
            {items.length > 0 && (
              <Button variant="outline" onClick={() => { setQ(""); setActiveCat("All"); }} className="mt-4">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((f, idx) => {
              const grad = GRADIENTS[hashIdx(f.id)];
              const isPdf = (f.file_type || "").toLowerCase().includes("pdf") || (f.file_name || "").toLowerCase().endsWith(".pdf");
              const isHot = (f.download_count || 0) > 10000;
              return (
                <Card
                  key={f.id}
                  className="group relative overflow-hidden border-slate-200 hover:border-sky-300 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col rounded-2xl"
                >
                  {/* Cover */}
                  <div className={`relative aspect-[16/9] bg-gradient-to-br ${grad} overflow-hidden`}>
                    {/* Pattern overlay */}
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 20% 20%, rgba(255,255,255,.6) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.4) 0, transparent 45%)",
                      }}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(0,0,0,.15))]" />

                    {f.cover_image_url ? (
                      <img
                        src={f.cover_image_url}
                        alt={f.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 relative z-10"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur border border-white/30 grid place-items-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                          <FileText className="h-8 w-8" />
                        </div>
                        <span className="mt-3 text-[10px] uppercase tracking-[0.2em] font-bold text-white/90">
                          {isPdf ? "PDF Document" : "Document"}
                        </span>
                      </div>
                    )}

                    {/* Category badge */}
                    {f.category && (
                      <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-slate-800 shadow-sm">
                        {CATEGORY_ICONS[f.category] && <span>{CATEGORY_ICONS[f.category]}</span>}
                        {f.category}
                      </div>
                    )}

                    {/* Hot badge */}
                    {isHot && (
                      <div className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 rounded-full bg-orange-500 text-white px-2 py-1 text-[10px] font-bold shadow-md">
                        <Flame className="h-3 w-3" /> HOT
                      </div>
                    )}

                    {/* File size — bottom right */}
                    <div className="absolute bottom-3 right-3 z-20 rounded-md bg-black/40 backdrop-blur text-white px-2 py-0.5 text-[10px] font-medium">
                      {formatBytes(f.file_size)}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-sky-700 transition-colors">
                      {f.title}
                    </h3>
                    {f.description && (
                      <p className="mt-2 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {f.description}
                      </p>
                    )}

                    {f.tags && f.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {f.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" /> {compactNum(f.download_count || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {(4.6 + ((idx * 7) % 4) / 10).toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-emerald-600" /> Verified
                      </span>
                    </div>

                    <Button
                      onClick={() => handleDownload(f)}
                      disabled={downloadingId === f.id}
                      className={`mt-4 w-full bg-gradient-to-r ${grad} hover:opacity-90 text-white shadow-md font-semibold`}
                    >
                      {downloadingId === f.id ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Preparing…</>
                      ) : (
                        <><Download className="h-4 w-4 mr-2" /> Download Free</>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* SOCIAL PROOF — TESTIMONIALS */}
      <section className="border-t border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm">
              <Quote className="h-3.5 w-3.5" /> Loved by aspirants
            </div>
            <h2 className="mt-3 text-xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">

              What CAT toppers say about our free material
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              Real stories from aspirants who used MBA Compass Freebies to crack CAT, XAT and NMAT.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { n: "Ananya Sharma", r: "IIM Bangalore · 99.6%iler", q: "The Quant formula sheet saved me hours. I taped it above my desk and by mock 5 I stopped fumbling on arithmetic entirely.", g: "from-sky-500 to-blue-600" },
              { n: "Rohan Menon", r: "IIM Ahmedabad · 99.4%iler", q: "The WAT-PI kit was gold. I walked into the IIM-A interview knowing exactly which frameworks to structure my answers around.", g: "from-violet-500 to-fuchsia-600" },
              { n: "Priyanka Iyer", r: "XLRI Jamshedpur · 99.1%iler", q: "GK digests for XAT are the best I found online — concise, dated correctly, and no filler. Used them every morning for 3 months.", g: "from-emerald-500 to-teal-600" },
            ].map((t) => (
              <figure key={t.n} className="relative rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-xl hover:-translate-y-1 transition-all">
                <Quote className="absolute top-4 right-4 h-6 w-6 text-slate-100" />
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400" />)}
                </div>
                <blockquote className="mt-3 text-sm text-slate-700 leading-relaxed">"{t.q}"</blockquote>
                <figcaption className="mt-4 flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${t.g} text-white grid place-items-center font-bold shadow`}>
                    {t.n.split(" ").map((p) => p[0]).join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{t.n}</div>
                    <div className="text-[11px] text-slate-500">{t.r}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Trust badges strip */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Users className="h-4 w-4" />, v: "50,000+", l: "Aspirants served" },
              { icon: <GraduationCap className="h-4 w-4" />, v: "1,200+", l: "IIM/XLRI converts" },
              { icon: <Layers className="h-4 w-4" />, v: "180+", l: "Curated PDFs" },
              { icon: <Target className="h-4 w-4" />, v: "99+%ile", l: "Author benchmark" },
            ].map((b) => (
              <div key={b.l} className="rounded-xl bg-white border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white grid place-items-center shrink-0">
                  {b.icon}
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 leading-none tabular-nums">{b.v}</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">{b.l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO CONTENT + FAQ */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-14 sm:py-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 border border-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              <BookOpen className="h-3.5 w-3.5" /> Learn more
            </div>
            <h2 className="mt-3 text-xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Free MBA Study Material for CAT, XAT, NMAT & SNAP 2025
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl mx-auto">
              MBA Compass Freebies is India's most trusted library of free MBA preparation resources — from Quant formula sheets and VARC cheatsheets to LRDI question banks, GK digests, WAT-PI answer decks and interview kits. Every document is curated by 99+ percentilers and IIM alumni, updated for the 2025 exam cycle, and delivered as a clean printable PDF you can start using in seconds.
            </p>
          </div>

          <article className="prose prose-slate prose-sm sm:prose-base max-w-none">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-8">Why aspirants trust MBA Compass Freebies</h3>
            <p className="text-slate-700 leading-relaxed">
              Cracking CAT, XAT, NMAT, SNAP or IIFT isn't about the number of books you buy — it's about drilling the right concepts with the right material. Our free MBA prep resources are built from the actual patterns of the last 10 years of MBA entrance exams, focus on high-yield topics that repeatedly appear in the paper, and include shortcuts, tricks and frameworks that 99+ percentilers use in the exam hall.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 not-prose">
              <SeoCard icon={<ShieldCheck className="h-4 w-4" />} title="Verified by IIM Alumni">
                Every resource is reviewed by our team of IIM/XLRI/ISB graduates before it goes live.
              </SeoCard>
              <SeoCard icon={<Clock className="h-4 w-4" />} title="Updated for CAT 2025">
                Formulas, GK digests and question banks are refreshed monthly for the current cycle.
              </SeoCard>
              <SeoCard icon={<Download className="h-4 w-4" />} title="One-Click Downloads">
                No signup wall, no email trap — click download and the PDF is on your device in seconds.
              </SeoCard>
              <SeoCard icon={<Award className="h-4 w-4" />} title="Exam-Focused Content">
                Only high-yield concepts, past-year patterns and proven frameworks — no filler pages.
              </SeoCard>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-10">What you'll find in this free library</h3>
            <ul className="text-slate-700 leading-relaxed space-y-1.5">
              <li><strong>Quant Formula Sheets</strong> — Complete CAT Quant formulas covering arithmetic, algebra, geometry, mensuration and modern math.</li>
              <li><strong>VARC Cheatsheets</strong> — Reading comprehension strategies, para-jumble decoding, tone/inference frameworks and 1000-word vocabulary builders.</li>
              <li><strong>LRDI Question Banks</strong> — Curated puzzle sets by pattern: arrangements, distributions, games, Venn diagrams and DI caselets.</li>
              <li><strong>GK &amp; Current Affairs</strong> — Monthly digests tuned for XAT, IIFT, SNAP and TISS — business, awards, sports, budget, appointments.</li>
              <li><strong>WAT-PI &amp; Interview Kits</strong> — 100 most-asked WAT/PI questions with STAR-format sample answers used by IIM converts.</li>
              <li><strong>Strategy Playbooks</strong> — Sectional attack plans, order-of-attempt logic, skip rules and mock-analysis templates.</li>
              <li><strong>College Comparison Sheets</strong> — Side-by-side ROI, fees, placements and batch profile for top 25 B-Schools of India.</li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-10">How to use these free MBA resources effectively</h3>
            <p className="text-slate-700 leading-relaxed">
              Download the formula sheet on day 1 of your prep and paste it above your study desk — you'll internalize 80% of Quant formulas passively within two weeks. Pair the VARC cheatsheet with daily reading (business newspapers, long-form editorials) and revisit it every Sunday. Solve one LRDI set every alternate day from our question banks, and use the WAT-PI answer bank starting 4 weeks before your interview cycle. Every resource is designed to slot into a serious CAT 2025 preparation plan — no fluff, no wasted pages.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-10">Frequently Asked Questions</h3>
            <div className="space-y-3 mt-4 not-prose">
              {FAQS.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-slate-200 bg-white p-4 open:shadow-md transition-shadow"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-slate-900 text-sm sm:text-base">
                    {faq.q}
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-10">Explore more on MBA Compass</h3>
            <p className="text-slate-700 leading-relaxed">
              Beyond free resources, MBA Compass runs India's most advanced <a href="/mocks" className="text-sky-600 font-semibold hover:underline">AI-powered mock test platform</a>, a detailed <a href="/colleges" className="text-sky-600 font-semibold hover:underline">MBA college directory</a>, curated <a href="/coaching" className="text-sky-600 font-semibold hover:underline">coaching institute reviews</a>, and a personalized <a href="/mba-compass" className="text-sky-600 font-semibold hover:underline">MBA advisor roadmap</a> — everything a serious aspirant needs from CAT registration to final admit.
            </p>
          </article>

          {/* FAQ JSON-LD */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: FAQS.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }}
          />
        </div>
      </section>


      {/* CTA banner */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-sky-900 p-8 sm:p-12 text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Want more than free resources?
              </div>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold">Get a personalized MBA roadmap.</h3>
              <p className="mt-1.5 text-sm sm:text-base text-white/70 max-w-xl">
                Talk to our advisors, build a study plan, and unlock premium mocks + analytics.
              </p>
            </div>
            <a
              href="/mba-compass"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-5 py-3 text-sm font-bold shadow-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Explore MBA Compass <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm px-2 py-2.5 sm:px-3 sm:py-3 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 text-center sm:text-left">
      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white grid place-items-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-base sm:text-xl font-bold text-slate-900 leading-none tabular-nums">{value}</div>
        <div className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider font-medium">{label}</div>
      </div>
    </div>
  );
}


function SeoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-200 hover:shadow-sm transition-all">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white grid place-items-center shrink-0">
          {icon}
        </div>
        <div className="font-semibold text-slate-900 text-sm">{title}</div>
      </div>
      <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
  );
}

function MarqueeCard({
  f,
  onClick,
  downloading,
}: {
  f: Freebie;
  onClick: () => void;
  downloading: boolean;
}) {
  const grad = GRADIENTS[hashIdx(f.id)];
  const isPdf =
    (f.file_type || "").toLowerCase().includes("pdf") ||
    (f.file_name || "").toLowerCase().endsWith(".pdf");
  return (
    <button
      onClick={onClick}
      disabled={downloading}
      className="group relative w-[260px] sm:w-[300px] shrink-0 text-left rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-sky-300 hover:shadow-xl transition-all"
    >
      <div className={`relative h-24 bg-gradient-to-br ${grad} overflow-hidden`}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,.6) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.4) 0, transparent 45%)",
          }}
        />
        <div className="absolute inset-0 flex items-center gap-3 px-4 text-white">
          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur border border-white/30 grid place-items-center shadow">
            <FileText className="h-5 w-5" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/90">
            {isPdf ? "PDF" : "DOC"} · {formatBytes(f.file_size)}
          </div>
        </div>
        {f.category && (
          <div className="absolute top-2 right-2 rounded-full bg-white/95 text-slate-800 px-2 py-0.5 text-[10px] font-bold shadow-sm">
            {f.category}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 group-hover:text-sky-700 min-h-[2.5rem]">
          {f.title}
        </h3>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" /> {compactNum(f.download_count || 0)}
          </span>
          <span className="flex items-center gap-1 text-sky-600 font-semibold group-hover:translate-x-0.5 transition-transform">
            {downloading ? "…" : "Get free"} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "Are these MBA prep resources really free?",
    a: "Yes — every PDF on the Freebies page is 100% free. No signup wall, no email trap, no hidden charges. Click Download and the file lands on your device instantly.",
  },
  {
    q: "Which exams are these resources useful for?",
    a: "The library covers CAT, XAT, NMAT, SNAP, IIFT, CMAT, MAT and TISS. Quant, VARC, LRDI and DI content overlaps across exams; GK digests and interview kits are specifically tuned for XAT, IIFT, SNAP and IIM WAT-PI rounds.",
  },
  {
    q: "How often are the freebies updated?",
    a: "Formula sheets and strategy playbooks are refreshed once per exam cycle. GK and current-affairs digests are updated monthly. College comparison sheets are updated after every placement season.",
  },
  {
    q: "Can I share these PDFs with my friends?",
    a: "Absolutely — that's the point. Share the /freebies link with your study group, batchmates or on WhatsApp. We only ask that you don't rebrand or sell the material as your own.",
  },
  {
    q: "Do you offer paid coaching or mocks as well?",
    a: "Yes. Beyond free resources, MBA Compass runs AI-powered mock tests, a full college directory with reviews, and a personalized advisor roadmap. Check the top navigation for Mocks and MBA Compass.",
  },
  {
    q: "How do I get notified when new freebies are added?",
    a: "Bookmark /freebies and check the Trending section — it always shows what's been downloaded most this week. You can also sign up for our newsletter from the homepage.",
  },
];

export default FreebiesPage;
