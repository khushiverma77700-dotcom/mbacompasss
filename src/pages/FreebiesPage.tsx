import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { Download, FileText, Search, Sparkles, Gift, Loader2, BookOpen } from "lucide-react";
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
};

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FreebiesPage = () => {
  const [items, setItems] = useState<Freebie[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

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
      // Increment counter (best-effort)
      supabase
        .from("freebies")
        .update({ download_count: f.download_count + 1 })
        .eq("id", f.id)
        .then(() => {});
      window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Free MBA Resources & Downloads | MBA Compass</title>
        <meta
          name="description"
          content="Download free MBA study materials, formula sheets, cheatsheets, PDFs, and prep guides curated by MBA Compass for CAT, XAT, NMAT and more."
        />
        <link rel="canonical" href="https://mbacompass.in/freebies" />
      </Helmet>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50 border-b border-sky-100">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-14 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-sky-200 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> 100% Free · No signup wall
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
            MBA Prep <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Freebies</span>
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-600">
            Formula sheets, cheatsheets, question banks, and study PDFs — curated by our advisors to accelerate your CAT, XAT & NMAT prep.
          </p>

          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search formula sheets, cheatsheets, PDFs…"
                className="pl-10 h-11 bg-white border-slate-200 shadow-sm"
              />
            </div>
          </div>

          {categories.length > 1 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeCat === c
                      ? "bg-sky-600 text-white border-sky-600"
                      : "bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:text-sky-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* GRID */}
      <section className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading resources…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Gift className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">Nothing here yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              {items.length === 0 ? "New freebies are being prepared — check back soon." : "No resources match your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((f) => (
              <Card
                key={f.id}
                className="group relative overflow-hidden border-slate-200 hover:border-sky-300 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-[16/9] bg-gradient-to-br from-sky-100 via-blue-50 to-white overflow-hidden">
                  {f.cover_image_url ? (
                    <img
                      src={f.cover_image_url}
                      alt={f.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <div className="flex flex-col items-center gap-2 text-sky-600/70">
                        <div className="h-14 w-14 rounded-2xl bg-white/70 backdrop-blur border border-sky-200 grid place-items-center shadow-sm">
                          <FileText className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] uppercase tracking-wider font-semibold">
                          {(f.file_type || "").toUpperCase().includes("PDF") || (f.file_name || "").toLowerCase().endsWith(".pdf")
                            ? "PDF"
                            : "Document"}
                        </span>
                      </div>
                    </div>
                  )}
                  {f.category && (
                    <Badge className="absolute top-3 left-3 bg-white/95 text-slate-700 border border-slate-200 hover:bg-white shadow-sm">
                      <BookOpen className="h-3 w-3 mr-1" /> {f.category}
                    </Badge>
                  )}
                </div>

                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">{f.title}</h3>
                  {f.description && (
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 line-clamp-2">{f.description}</p>
                  )}

                  {f.tags && f.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {f.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatBytes(f.file_size)}</span>
                    <span>{f.download_count.toLocaleString()} downloads</span>
                  </div>

                  <Button
                    onClick={() => handleDownload(f)}
                    disabled={downloadingId === f.id}
                    className="mt-3 w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white"
                  >
                    {downloadingId === f.id ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Preparing…</>
                    ) : (
                      <><Download className="h-4 w-4 mr-2" /> Download Free</>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default FreebiesPage;
