import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Gauge, ShieldCheck, Wand2, Wrench, Eye, Send, Link2, CheckCircle2, XCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import {
  analyzeBlogArticle,
  factCheckBlogArticle,
  rewriteBlogArticle,
  suggestBlogInternalLinks,
  saveBlogArticle,
  reviewBlogFigures,
} from "@/lib/blogEditor.functions";
import { computeFreshness } from "@/lib/blogFreshness";

type Boundary = { mustInclude: string[]; canInclude: string[]; mustNotInclude: string[]; allowedEntities: string[] };
type Issue = { id: string; title: string; detail: string; category: string; severity: string; safeToAutoFix: boolean };
type Analysis = Awaited<ReturnType<typeof analyzeBlogArticle>>;
type Claim = { claim: string; status: string; source: string; note: string };
type FigureItem = { type: string; figure: string; articleValue: string; sourceValue: string; source: string; explanation: string; suggestion: string };
type LinkSug = { anchor: string; target: string; location: string; reason: string };

interface Props {
  articleId: string;
  jobId?: string | null;
  stats: any;
  targetDensity: number;
}

const CLAIM_LABEL: Record<string, string> = {
  verified: "Verified",
  source_supported: "Source-supported",
  potentially_outdated: "Potentially outdated",
  needs_review: "Needs manual review",
};

const CHECK_LABEL: Record<string, string> = {
  topicRelevance: "Topic relevance",
  searchIntent: "Search intent",
  accuracy: "Factual accuracy",
  noRandomColleges: "No random colleges",
  humanized: "Humanized writing",
  noAiPhrases: "No AI-sounding phrases",
  noKeywordStuffing: "No keyword stuffing",
  keywordDensity: "Keyword density",
  metaTitle: "SEO title",
  metaDescription: "Meta description",
  headings: "H2/H3 structure",
  internalLinks: "Internal links",
  noPlaceholders: "No unfinished sections",
  factsReviewed: "Fact check run, nothing unverified",
  faq: "FAQ where appropriate",
  figuresReviewed: "Figure review run, no conflicting or outdated figures",
  fresh: "Source data is recent (freshness 50+)",
  table: "Useful table included",
  pointers: "Practical pointers included",
  importantPoints: "Important Points section included",
};

export default function BlogEditorWorkspace({ articleId, jobId, stats, targetDensity }: Props) {
  const analyzeFn = useServerFn(analyzeBlogArticle);
  const factFn = useServerFn(factCheckBlogArticle);
  const rewriteFn = useServerFn(rewriteBlogArticle);
  const linksFn = useServerFn(suggestBlogInternalLinks);
  const saveFn = useServerFn(saveBlogArticle);
  const figuresFn = useServerFn(reviewBlogFigures);

  const boundary: Boundary | null = stats?.analysis?.boundary || null;
  const searchIntent: string = stats?.analysis?.searchIntent || "";
  const base = { articleId, jobId: jobId || null, targetDensity, boundary, searchIntent };

  const [busy, setBusy] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [links, setLinks] = useState<LinkSug[] | null>(null);
  const [figures, setFigures] = useState<FigureItem[] | null>(null);
  const [tab, setTab] = useState("issues");
  const [draft, setDraft] = useState({ title: "", h1: "", slug: "", metaTitle: "", metaDescription: "", intro: "", content: "", keywords: [] as string[], published: false });

  const loadArticle = useCallback(async () => {
    const { data } = await supabase
      .from("articles")
      .select("title, h1_tag, slug, meta_title, meta_description, intro, content, keywords, published")
      .eq("id", articleId)
      .maybeSingle();
    if (data) {
      setDraft({
        title: data.title || "",
        h1: data.h1_tag || data.title || "",
        slug: data.slug || "",
        metaTitle: data.meta_title || "",
        metaDescription: data.meta_description || "",
        intro: data.intro || "",
        content: data.content || "",
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        published: !!data.published,
      });
    }
  }, [articleId]);

  useEffect(() => { void loadArticle(); }, [loadArticle]);

  const run = async <T,>(key: string, fn: () => Promise<T>, done?: (r: T) => void) => {
    setBusy(key);
    try {
      const r = await fn();
      done?.(r);
      return r;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const analyze = () => run("analyze", () => analyzeFn({ data: base }), (r) => { setAnalysis(r); setTab("issues"); });
  const factCheck = () => run("fact", () => factFn({ data: base }), (r) => { setClaims(r.claims); setTab("facts"); if (!r.sourceCount) toast.info("No sources were read for this article, so most claims need manual review."); });
  const rewrite = (mode: "humanize" | "fix" | "fix_all" | "links", extra: Record<string, unknown> = {}) =>
    run(mode, () => rewriteFn({ data: { ...base, mode, ...extra } as any }), async (r) => {
      toast.success(r.changeSummary);
      await loadArticle();
      const a = await analyzeFn({ data: base }).catch(() => null);
      if (a) setAnalysis(a);
    });
  const reviewFigures = () => run("figures", () => figuresFn({ data: base }), (r) => { setFigures(r.items); setTab("figures"); if (!r.sourceCount) toast.info("No sources were read for this article, so figures cannot be compared."); });
  const freshness = useMemo(
    () => computeFreshness({ articleHtml: `${draft.intro}\n${draft.content}`, sources: Array.isArray(stats?.sourceExcerpts) ? stats.sourceExcerpts : [] }),
    [draft.intro, draft.content, stats],
  );
  const suggestLinks = () => run("links-suggest", () => linksFn({ data: base }), (r) => { setLinks(r.links); setTab("links"); });

  const persist = (publish: boolean) =>
    run(publish ? "publish" : "save", () => saveFn({ data: { articleId, title: draft.title, h1: draft.h1, slug: draft.slug, metaTitle: draft.metaTitle, metaDescription: draft.metaDescription, intro: draft.intro, content: draft.content, publish } }), (r) => {
      toast.success(r.published ? "Article published" : "Changes saved as draft");
      if (r.published) setDraft((d) => ({ ...d, published: true }));
    });

  const unverified = (claims || []).filter((c) => c.status === "needs_review" || c.status === "potentially_outdated").length;
  const checklist: Record<string, boolean> | null = analysis
    ? {
        topicRelevance: (analysis.qualityParts.find((p) => p.label === "Topic relevance")?.score ?? 0) >= 75,
        searchIntent: (analysis.seoParts.find((p) => p.label === "Search intent match")?.score ?? 0) >= 70,
        accuracy: analysis.accuracyScore >= 75,
        humanized: analysis.humanizationScore >= 75,
        ...analysis.checklist,
        factsReviewed: claims !== null && unverified === 0,
        figuresReviewed: figures !== null && figures.filter((f) => f.type !== "missing").length === 0,
        fresh: freshness.score >= 50,
      }
    : null;
  const failing = checklist ? Object.entries(checklist).filter(([, v]) => !v).map(([k]) => k) : [];
  const ready = !!checklist && failing.length === 0;

  const fixable = (analysis?.issues || []).filter((i) => i.safeToAutoFix);
  const score = (label: string, value: number | string, suffix = "/100") => (
    <div className="rounded-lg border bg-background p-3 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}{typeof value === "number" ? suffix : ""}</p>
    </div>
  );

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          Article workspace
          {draft.published ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>}
          {ready && <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Ready to Publish</Badge>}
        </CardTitle>
        <CardDescription>
          {stats?.actualWords ?? "—"} words. Review, fix and verify before publishing. Nothing is published automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" asChild className="gap-1"><a href={`/admin/articles?edit=${articleId}`} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /> Open in Editor</a></Button>
          <Button size="sm" variant="outline" onClick={() => setTab("scope")} className="gap-1"><Link2 className="h-4 w-4" /> View Source Data</Button>
          <Button size="sm" onClick={analyze} disabled={!!busy} className="gap-1">{busy === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />} Analyze SEO</Button>
          <Button size="sm" variant="outline" onClick={factCheck} disabled={!!busy} className="gap-1">{busy === "fact" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Fact Check</Button>
          <Button size="sm" variant="outline" onClick={reviewFigures} disabled={!!busy} className="gap-1">{busy === "figures" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Review Figures</Button>
          <Button size="sm" variant="outline" onClick={() => rewrite("humanize")} disabled={!!busy} className="gap-1">{busy === "humanize" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Humanize</Button>
          <Button size="sm" variant="outline" onClick={() => setTab("issues")} disabled={!analysis} className="gap-1"><Wrench className="h-4 w-4" /> Fix Issues</Button>
          <Button size="sm" variant="outline" disabled={!!busy || fixable.length === 0} onClick={() => rewrite("fix_all", { issues: fixable.map((i) => ({ title: i.title, detail: i.detail })) })} className="gap-1">{busy === "fix_all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />} Fix All Issues ({fixable.length})</Button>
          <Button size="sm" variant="outline" onClick={suggestLinks} disabled={!!busy} className="gap-1">{busy === "links-suggest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Internal Links</Button>
          <Button size="sm" variant="outline" onClick={() => setTab("preview")} className="gap-1"><Eye className="h-4 w-4" /> Preview</Button>
          <Button size="sm" variant="outline" onClick={() => persist(false)} disabled={!!busy} className="gap-1">{busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft</Button>
          <Button size="sm" onClick={() => persist(true)} disabled={!!busy || !ready} className="gap-1" title={ready ? "" : "Run Analyze SEO and Fact Check, then fix every failing checklist item"}>{busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {score("SEO Score", analysis?.seoScore ?? "—")}
          {score("Content Quality", analysis?.qualityScore ?? "—")}
          {score("Humanization", analysis?.humanizationScore ?? "—")}
          {score("Accuracy", analysis?.accuracyScore ?? "—")}
          {score(`Freshness · ${freshness.label}`, freshness.score)}
          {score("Keyword Density", analysis ? `${analysis.density.actual}%` : "—")}
          {score("Target Density", `${targetDensity}%`)}
        </div>
        {analysis && (
          <p className="text-sm">
            Density status:{" "}
            <Badge variant={analysis.density.status === "Good" ? "outline" : "destructive"}>{analysis.density.status}</Badge>{" "}
            <span className="text-muted-foreground">({analysis.density.occurrences} uses in {analysis.wordCount} words)</span>
          </p>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="issues">Issues {analysis ? `(${analysis.issues.length})` : ""}</TabsTrigger>
            <TabsTrigger value="scores">Score breakdown</TabsTrigger>
            <TabsTrigger value="facts">Fact check {claims ? `(${claims.length})` : ""}</TabsTrigger>
            <TabsTrigger value="figures">Figure review {figures ? `(${figures.length})` : ""}</TabsTrigger>
            <TabsTrigger value="freshness">Freshness</TabsTrigger>
            <TabsTrigger value="links">Internal links</TabsTrigger>
            <TabsTrigger value="scope">Scope & sources</TabsTrigger>
            <TabsTrigger value="keywords">Keyword bank ({draft.keywords.length})</TabsTrigger>
            <TabsTrigger value="preview">Preview & edit</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="issues" className="space-y-2 mt-3">
            {!analysis && <p className="text-sm text-muted-foreground">Click Analyze SEO to find issues.</p>}
            {analysis?.issues.length === 0 && <p className="text-sm">No issues found.</p>}
            {(analysis?.issues || []).map((i: Issue) => (
              <div key={i.id} className="rounded-md border p-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={i.severity === "high" ? "destructive" : "secondary"}>{i.severity}</Badge>
                    <Badge variant="outline">{i.category}</Badge>
                    <span className="font-medium">{i.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{i.detail}</p>
                </div>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => rewrite("fix", { issues: [{ title: i.title, detail: i.detail }] })}>
                  {busy === "fix" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fix This"}
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="scores" className="mt-3">
            {!analysis ? <p className="text-sm text-muted-foreground">Click Analyze SEO first.</p> : (
              <div className="grid md:grid-cols-2 gap-4">
                {[{ t: "SEO", parts: analysis.seoParts }, { t: "Content quality", parts: analysis.qualityParts }].map((g) => (
                  <div key={g.t} className="space-y-1">
                    <p className="font-semibold">{g.t}</p>
                    {g.parts.map((p) => (
                      <div key={p.label} className="flex items-center gap-2 text-sm">
                        <span className="w-48 shrink-0">{p.label}</span>
                        <div className="h-2 flex-1 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${p.score}%` }} /></div>
                        <span className="w-10 text-right">{p.score}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="facts" className="space-y-2 mt-3">
            {!claims && <p className="text-sm text-muted-foreground">Click Fact Check to list claims that need verification.</p>}
            {(claims || []).map((c, n) => (
              <div key={n} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={c.status === "verified" ? "default" : c.status === "source_supported" ? "outline" : "destructive"}>{CLAIM_LABEL[c.status] || c.status}</Badge>
                  <span className="font-medium">{c.claim}</span>
                </div>
                {c.note && <p className="text-muted-foreground mt-1">{c.note}</p>}
                {c.source && <a href={c.source} target="_blank" rel="noreferrer" className="text-primary break-all">{c.source}</a>}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="figures" className="space-y-2 mt-3">
            {!figures && <p className="text-sm text-muted-foreground">Click Review Figures to compare every number in the article with its sources.</p>}
            {figures?.length === 0 && <p className="text-sm">No missing, outdated or conflicting figures found.</p>}
            {(figures || []).map((f, n) => (
              <div key={n} className="rounded-md border p-3 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={f.type === "missing" ? "secondary" : "destructive"}>{f.type === "conflicting" ? "Conflicting" : f.type === "outdated" ? "Outdated" : "Missing"}</Badge>
                  <span className="font-medium">{f.figure}</span>
                </div>
                <p>Article: <strong>{f.articleValue || "not mentioned"}</strong> · Source: <strong>{f.sourceValue || "not in sources"}</strong></p>
                {f.explanation && <p className="text-muted-foreground">{f.explanation}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {f.source && <a href={f.source} target="_blank" rel="noreferrer" className="text-primary break-all">{f.source}</a>}
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => rewrite("fix", { issues: [{ title: `${f.type} figure: ${f.figure}`, detail: `Article says "${f.articleValue}", source says "${f.sourceValue}" (${f.source || "no source"}). ${f.suggestion}. Only use the source value; never invent one.` }] })}>Fix This</Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="freshness" className="space-y-3 mt-3 text-sm">
            <p>Freshness <strong>{freshness.score}/100</strong> ({freshness.label}), measured against {freshness.currentYear}. It combines how recent the source data is with whether fees, deadlines, placements and rankings in the article use current years.</p>
            {freshness.notes.map((n) => <p key={n} className="text-muted-foreground">{n}</p>)}
            {freshness.sources.length > 0 && (
              <div className="space-y-1">
                <p className="font-semibold">Source dates</p>
                {freshness.sources.map((s) => (
                  <div key={s.url} className="flex flex-wrap justify-between gap-2 rounded border p-2">
                    <span className="break-all">{s.title}</span>
                    <Badge variant={s.ageYears === null ? "secondary" : s.ageYears <= 1 ? "outline" : "destructive"}>{s.latestDate ? `Latest: ${s.latestDate}` : "No date found"}</Badge>
                  </div>
                ))}
              </div>
            )}
            {freshness.oldTimeSensitive.length > 0 && (
              <div className="space-y-1">
                <p className="font-semibold">Older time-sensitive mentions</p>
                {freshness.oldTimeSensitive.map((o, i) => <p key={i} className="rounded border p-2"><Badge variant="destructive">{o.year}</Badge> {o.context}</p>)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="space-y-2 mt-3">
            {!links && <p className="text-sm text-muted-foreground">Click Internal Links to get suggestions from real MBA Compass pages.</p>}
            {links?.length === 0 && <p className="text-sm">No relevant pages found.</p>}
            {(links || []).map((l, n) => (
              <div key={n} className="rounded-md border p-3 text-sm flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p><strong>Anchor:</strong> {l.anchor}</p>
                  <p><strong>Target:</strong> <span className="font-mono">{l.target}</span></p>
                  <p><strong>Suggested location:</strong> {l.location}</p>
                  <p className="text-muted-foreground">{l.reason}</p>
                </div>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => rewrite("links", { links: [l] }).then(() => setLinks((x) => (x || []).filter((_, i) => i !== n)))}>Add link</Button>
              </div>
            ))}
            {links && links.length > 1 && (
              <Button size="sm" disabled={!!busy} onClick={() => rewrite("links", { links }).then(() => setLinks([]))}>Add all links</Button>
            )}
          </TabsContent>

          <TabsContent value="scope" className="space-y-3 mt-3 text-sm">
            {boundary ? (
              <div className="grid md:grid-cols-3 gap-3">
                {([["Must include", boundary.mustInclude], ["Can include", boundary.canInclude], ["Must not include", boundary.mustNotInclude]] as const).map(([t, xs]) => (
                  <div key={t} className="rounded-md border p-3">
                    <p className="font-semibold">{t}</p>
                    <ul className="list-disc pl-4">{xs.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground">No topic boundary saved for this article.</p>}
            {boundary?.allowedEntities?.length ? <p><strong>Allowed names:</strong> {boundary.allowedEntities.join(", ")}</p> : null}
            {searchIntent && <p><strong>Search intent:</strong> {searchIntent}</p>}
            {stats?.analysis?.style && <p><strong>Style learned from {stats.analysis.sampleCount} sample(s):</strong> {stats.analysis.style.tone}; {stats.analysis.style.paragraphLength}</p>}
            <div>
              <p className="font-semibold">Sources</p>
              {(stats?.sourceResearch?.sources || []).length === 0 && <p className="text-muted-foreground">No external sources were read.</p>}
              {(stats?.sourceResearch?.sources || []).map((s: any, i: number) => {
                const ex = s.extracted;
                const excerpt = (stats?.sourceExcerpts || []).find((x: any) => x.url === s.url)?.excerpt;
                return (
                  <div key={i} className="rounded-md border p-3 mt-2 space-y-2">
                    <p className="break-all">
                      <Badge variant={s.status === "read" ? "outline" : "destructive"} className="mr-2">{s.kind === "primary" ? "Your link" : "Additional"} · {s.status === "read" ? "used" : "not readable"}</Badge>
                      <strong>{s.title}</strong>
                    </p>
                    {/^https?:/.test(s.url) && <a href={s.url} target="_blank" rel="noreferrer" className="text-primary underline break-all">Open Source</a>}
                    {ex && (
                      <p className="text-muted-foreground">
                        {s.chars.toLocaleString()} characters read · {ex.facts.length} facts · {ex.numbers} data points · {ex.dates} dates · {ex.tables} tables · {ex.headings.length} headings
                      </p>
                    )}
                    {(ex || excerpt) && (
                      <details>
                        <summary className="cursor-pointer font-semibold">View Extracted Data</summary>
                        {ex?.headings?.length ? <><p className="font-semibold mt-2">Headings</p><ul className="list-disc pl-4">{ex.headings.map((h: string, j: number) => <li key={j}>{h}</li>)}</ul></> : null}
                        {ex?.facts?.length ? <><p className="font-semibold mt-2">Facts and figures</p><ul className="list-disc pl-4">{ex.facts.map((f: string, j: number) => <li key={j}>{f}</li>)}</ul></> : null}
                        {excerpt && <><p className="font-semibold mt-2">Full text read</p><pre className="whitespace-pre-wrap max-h-96 overflow-auto rounded bg-muted p-2">{excerpt}</pre></>}
                      </details>
                    )}
                  </div>
                );
              })}
              {(stats?.sourceResearch?.notes || []).map((n: string, i: number) => <p key={`n${i}`} className="text-muted-foreground">{n}</p>)}
            </div>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-3 mt-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Editorial keyword bank</p>
                <p className="text-muted-foreground">The full bank stays in admin and SEO data. Readers see only a curated subset.</p>
              </div>
              <Badge variant={draft.keywords.length >= 100 && draft.keywords.length <= 200 ? "outline" : "destructive"}>{draft.keywords.length} terms</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.keywords.map((keyword) => <Badge key={keyword} variant="secondary">{keyword}</Badge>)}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-3 mt-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
              <div><Label>H1</Label><Input value={draft.h1} onChange={(e) => setDraft({ ...draft, h1: e.target.value })} /></div>
              <div><Label>Meta title ({draft.metaTitle.length}/60)</Label><Input value={draft.metaTitle} onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value })} /></div>
              <div><Label>URL slug</Label><Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="font-mono" /></div>
            </div>
            <div><Label>Meta description ({draft.metaDescription.length}/160)</Label><Textarea rows={2} value={draft.metaDescription} onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })} /></div>
            <div className="grid lg:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Intro HTML</Label>
                <Textarea rows={5} className="font-mono text-sm" value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} />
                <Label>Article HTML</Label>
                <Textarea rows={22} className="font-mono text-sm" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
              </div>
              <div className="rounded-md border p-4 max-h-[48rem] overflow-y-auto">
                <h1 className="text-2xl font-semibold mb-3">{draft.h1}</h1>
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(`${draft.intro}${draft.content}`) }} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="mt-3">
            {!checklist ? <p className="text-sm text-muted-foreground">Run Analyze SEO and Fact Check to fill the checklist.</p> : (
              <div className="grid md:grid-cols-2 gap-1.5 text-sm">
                {Object.entries(checklist).map(([k, v]) => (
                  <p key={k} className="flex items-center gap-2">
                    {v ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    {CHECK_LABEL[k] || k}
                  </p>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
