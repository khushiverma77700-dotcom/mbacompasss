import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadEditorialLinkPool } from "@/lib/editorialLinkPool";
import { createEditorialMatcher, linkEditorialContent, type EditorialTarget } from "@/lib/editorialLinks";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, ExternalLink, Link2, Loader2, RefreshCw, Search } from "lucide-react";

const GROUPS = { colleges: "Colleges", exams: "Exams", coachings: "Coaching institutes", tools: "Tools" } as const;
const PAGE_SIZE = 40;
type ReportRow = { target: EditorialTarget; mentions: number; state: "Saved link" | "Automatic link" | "Related mention" };

export default function AdminEditorialBacklinks({ articleId }: { articleId?: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const pool = useQuery({ queryKey: ["editorial-link-pool"], queryFn: () => loadEditorialLinkPool(), staleTime: 300000, enabled: Boolean(articleId) });
  const articles = useQuery({
    queryKey: ["editorial-articles", search, page], enabled: !articleId,
    queryFn: async () => {
      let query = supabase.from("articles").select("id,title,slug,published,updated_at", { count: "exact" }).order("updated_at", { ascending: false }).order("id");
      if (search.trim()) query = query.ilike("title", `%${search.trim().replace(/[%_]/g, "")}%`);
      const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      return { rows: (data || []).filter(a => a.title?.trim() && a.slug?.trim()), count: count || 0 };
    },
  });
  const article = useQuery({
    queryKey: ["editorial-article", articleId], enabled: Boolean(articleId),
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("id,title,slug,published,content,intro,excerpt,keywords,updated_at").eq("id", articleId || "").maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    if (!article.data || !pool.data) { setReport([]); return; }
    const body = document.createElement("div");
    const parsed = new DOMParser().parseFromString(`${article.data.intro || ""}\n${article.data.content || ""}`, "text/html");
    body.append(...Array.from(parsed.body.childNodes));
    const savedUrls = new Set<string>();
    body.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(a => {
      try { const url = new URL(a.getAttribute("href") || "", "https://mbacompass.in"); if (["mbacompass.in", "www.mbacompass.in", window.location.hostname].includes(url.hostname)) savedUrls.add(url.pathname); } catch { /* invalid saved URL */ }
    });
    const matcher = createEditorialMatcher(pool.data);
    const matched = matcher(`${article.data.title}\n${body.textContent || ""}`);
    const counts = new Map<string, number>();
    matched.forEach(m => counts.set(m.target.url, (counts.get(m.target.url) || 0) + 1));
    linkEditorialContent(body, pool.data, `/article/${article.data.slug}`);
    const autoUrls = new Set(Array.from(body.querySelectorAll<HTMLAnchorElement>("a[data-editorial-link]")).map(a => new URL(a.href).pathname));
    setReport(pool.data.filter(t => counts.has(t.url) || savedUrls.has(t.url)).map(target => ({ target, mentions: counts.get(target.url) || 0, state: savedUrls.has(target.url) ? "Saved link" : autoUrls.has(target.url) ? "Automatic link" : "Related mention" })));
    setSaved(false);
  }, [article.data, pool.data]);

  const visible = useMemo(() => report.filter(r => r.target.label.toLowerCase().includes(search.toLowerCase())), [report, search]);
  const refresh = () => {
    if (articleId) { void pool.refetch(); void article.refetch(); }
    else void articles.refetch();
  };
  const saveDraftLinks = async () => {
    if (!article.data || article.data.published || !pool.data) return;
    setSaving(true); setSaveError("");
    try {
      const enrich = (html: string | null) => {
        if (!html || !/<[a-z][\s\S]*>/i.test(html)) return html;
        const root = document.createElement("div");
        const parsed = new DOMParser().parseFromString(html, "text/html");
        root.append(...Array.from(parsed.body.childNodes));
        linkEditorialContent(root, pool.data || [], `/article/${article.data?.slug}`);
        return root.innerHTML;
      };
      const { data, error } = await supabase.from("articles").update({ content: enrich(article.data.content), intro: enrich(article.data.intro) }).eq("id", article.data.id).eq("published", false).eq("updated_at", article.data.updated_at).select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("This article changed. Refresh before saving links.");
      await article.refetch(); setSaved(true);
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Could not save links."); }
    finally { setSaving(false); }
  };
  const error = article.error || articles.error || pool.error;
  const loading = articleId ? article.isPending || pool.isPending : articles.isPending;
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {articleId && <Button variant="ghost" asChild><Link to="/admin/editorial-backlinks"><ArrowLeft className="size-4 mr-2" />All blogs</Link></Button>}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-primary mb-2"><Link2 className="size-5" /><span className="text-sm font-medium">Editorial links</span></div><h1 className="text-3xl font-heading font-semibold break-words">{articleId ? article.data?.title || "Blog link dossier" : "Editorial Backlinks"}</h1>{articleId && article.data && <Badge variant="secondary" className="mt-3">{article.data.published ? "Published" : "Draft"}</Badge>}</div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={refresh}><RefreshCw className="size-4 mr-2" />Refresh</Button>{article.data && <><Button variant="outline" asChild><Link to={`/admin/articles?edit=${article.data.id}`}>Edit blog</Link></Button>{article.data.published && <Button asChild><a href={`/article/${article.data.slug}`} target="_blank" rel="noopener noreferrer">Live blog<ExternalLink className="size-4 ml-2" /></a></Button>}</>}</div>
      </div>
      <div className="relative max-w-lg"><Search className="absolute pointer-events-none left-3 top-3 size-4 text-muted-foreground" /><Input aria-label={articleId ? "Search related links" : "Search blogs"} className="pl-10" placeholder={articleId ? "Search related links…" : "Search blogs…"} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      {error && <div role="alert" className="text-destructive">{error.message}<Button variant="outline" onClick={refresh} className="ml-3">Retry</Button></div>}
      {loading && <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" />Loading editorial links…</div>}
      {!loading && !error && articleId && !article.data && <p className="text-muted-foreground">Blog not found.</p>}
      {!loading && !error && !articleId && <>
        <div className="divide-y divide-border border-y border-border">{articles.data?.rows.map(a => <div key={a.id} className="flex flex-wrap justify-between items-center gap-4 py-5"><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold break-words">{a.title}</h2><div className="mt-2 flex flex-wrap gap-3 items-center"><Badge variant="secondary">{a.published ? "Published" : "Draft"}</Badge><span className="text-sm text-muted-foreground break-all">/article/{a.slug}</span></div></div><Button variant="outline" asChild><Link to={`/admin/editorial-backlinks/${a.id}`}>Link dossier<ArrowRight className="size-4 ml-2" /></Link></Button></div>)}{!articles.data?.rows.length && <p className="py-8 text-muted-foreground">No matching blogs.</p>}</div>
        <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{articles.data?.count || 0} blogs · Page {page + 1}</span><div className="flex gap-2"><Button variant="outline" disabled={!page} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * PAGE_SIZE >= (articles.data?.count || 0)} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
      </>}
      {!loading && !error && article.data && <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-border pb-6">{Object.entries(GROUPS).map(([kind, label]) => <div key={kind}><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-semibold mt-1">{report.filter(r => r.target.kind === kind).length}</p></div>)}</div>
        {!article.data.published && <div className="flex flex-wrap gap-3 items-center"><Button variant="outline" disabled={saving || !report.length} onClick={saveDraftLinks}>{saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Link2 className="size-4 mr-2" />}Save links to draft</Button>{saved && <span role="status" className="text-sm text-primary">Links saved. Article remains a draft.</span>}{saveError && <span role="alert" className="text-sm text-destructive">{saveError}</span>}</div>}
        {Object.entries(GROUPS).map(([kind, label]) => <section key={kind} className="space-y-3"><h2 className="text-xl font-semibold">{label}</h2><div className="divide-y divide-border border-y border-border">{visible.filter(r => r.target.kind === kind).map(row => <div key={row.target.url} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 flex-1"><a href={row.target.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">{row.target.label}</a><p className="text-sm text-muted-foreground mt-1 break-all">{row.target.url}</p></div><div className="flex items-center gap-3"><Badge variant={row.state === "Related mention" ? "outline" : "secondary"}>{row.state}</Badge><span className="text-sm text-muted-foreground">{row.mentions} mentions</span><Button variant="ghost" size="icon" asChild><a href={row.target.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${row.target.label}`} title={`Open ${row.target.label}`}><ExternalLink className="size-4" /></a></Button></div></div>)}{!visible.some(r => r.target.kind === kind) && <p className="text-sm text-muted-foreground py-4">No related {label.toLowerCase()} in this blog.</p>}</div></section>)}
      </>}
    </div>
  );
}