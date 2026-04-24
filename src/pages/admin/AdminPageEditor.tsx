import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Loader2, ExternalLink, Save, RefreshCw, FileText, GraduationCap, Building2,
  CheckCircle2, AlertTriangle, XCircle, Search, Eye, Code, Globe,
} from "lucide-react";
import { buildStoredSeoSnapshot, saveSeoSnapshot, getSeoSnapshotKey, type SEOContentType } from "@/lib/seoAutomation";

type EntityKind = "college" | "institute" | "article";

interface ListedItem {
  id: string;
  name: string;
  slug: string;
  kind: EntityKind;
  city?: string | null;
  state?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  h1_tag?: string | null;
  primary_keyword?: string | null;
  keywords?: string[] | null;
  completion: number;
  publishedUrl: string;
}

const TABLE_BY_KIND: Record<EntityKind, string> = {
  college: "colleges",
  institute: "institutes",
  article: "articles",
};

const PATH_BY_KIND: Record<EntityKind, string> = {
  college: "/college/",
  institute: "/institute/",
  article: "/article/",
};

const KIND_TO_SEO_TYPE: Record<EntityKind, SEOContentType> = {
  college: "college",
  institute: "institute",
  article: "article",
};

function calcCompletion(item: any): number {
  let pts = 0;
  const checks = [
    item.meta_title && item.meta_title.length >= 20,
    item.meta_description && item.meta_description.length >= 80,
    item.h1_tag && item.h1_tag.length >= 5,
    item.primary_keyword,
    Array.isArray(item.keywords) && item.keywords.length >= 5,
    item.description || item.content || item.detailed_content,
    item.banner_url || item.image_url || item.logo_url,
    item.slug,
  ];
  pts = checks.filter(Boolean).length;
  return Math.round((pts / checks.length) * 100);
}

const PageEditorWorkspace = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ListedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | EntityKind>("all");
  const [completionFilter, setCompletionFilter] = useState<"all" | "incomplete" | "complete">("all");
  const [selected, setSelected] = useState<ListedItem | null>(null);

  // Editor state for the selected entity
  const [draft, setDraft] = useState<any>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // Audit state
  const [auditing, setAuditing] = useState(false);
  const [runCompetitorScan, setRunCompetitorScan] = useState(true);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [savingAudit, setSavingAudit] = useState(false);

  // Load list
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [c, i, a] = await Promise.all([
        supabase.from("colleges").select("id, name, slug, city, state, meta_title, meta_description, h1_tag, primary_keyword, keywords, description, banner_url, logo_url"),
        supabase.from("institutes").select("id, name, slug, city, state, meta_title, meta_description, h1_tag, primary_keyword, keywords, description, banner_url, logo_url"),
        supabase.from("articles").select("id, title, slug, meta_title, meta_description, h1_tag, primary_keyword, keywords, content, banner_url, image_url, published"),
      ]);

      if (cancelled) return;

      const colleges: ListedItem[] = (c.data || []).map((r: any) => ({
        id: r.id, name: r.name, slug: r.slug, kind: "college",
        city: r.city, state: r.state,
        meta_title: r.meta_title, meta_description: r.meta_description, h1_tag: r.h1_tag,
        primary_keyword: r.primary_keyword, keywords: r.keywords,
        completion: calcCompletion(r),
        publishedUrl: `${PATH_BY_KIND.college}${r.slug}`,
      }));
      const institutes: ListedItem[] = (i.data || []).map((r: any) => ({
        id: r.id, name: r.name, slug: r.slug, kind: "institute",
        city: r.city, state: r.state,
        meta_title: r.meta_title, meta_description: r.meta_description, h1_tag: r.h1_tag,
        primary_keyword: r.primary_keyword, keywords: r.keywords,
        completion: calcCompletion(r),
        publishedUrl: `${PATH_BY_KIND.institute}${r.slug}`,
      }));
      const articles: ListedItem[] = (a.data || [])
        .filter((r: any) => r.published)
        .map((r: any) => ({
          id: r.id, name: r.title, slug: r.slug, kind: "article",
          meta_title: r.meta_title, meta_description: r.meta_description, h1_tag: r.h1_tag,
          primary_keyword: r.primary_keyword, keywords: r.keywords,
          completion: calcCompletion(r),
          publishedUrl: `${PATH_BY_KIND.article}${r.slug}`,
        }));

      setItems([...colleges, ...institutes, ...articles].sort((x, y) => x.completion - y.completion));
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (kindFilter !== "all" && it.kind !== kindFilter) return false;
      if (completionFilter === "incomplete" && it.completion >= 80) return false;
      if (completionFilter === "complete" && it.completion < 80) return false;
      if (filter && !`${it.name} ${it.slug} ${it.city || ""}`.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, kindFilter, completionFilter]);

  // Load draft when selecting
  const selectItem = async (it: ListedItem) => {
    setSelected(it);
    setAuditResult(null);
    setDraft(null);
    const table = TABLE_BY_KIND[it.kind];
    const { data, error } = await supabase.from(table as any).select("*").eq("id", it.id).maybeSingle();
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      return;
    }
    setDraft(data);
  };

  const saveDraft = async () => {
    if (!selected || !draft) return;
    setSavingDraft(true);
    const table = TABLE_BY_KIND[selected.kind];
    const patch: Record<string, any> = {
      meta_title: draft.meta_title,
      meta_description: draft.meta_description,
      h1_tag: draft.h1_tag,
      primary_keyword: draft.primary_keyword,
      keywords: draft.keywords,
    };
    if (selected.kind === "article") {
      patch.title = draft.title;
      patch.excerpt = draft.excerpt;
      patch.content = draft.content;
    } else {
      patch.name = draft.name;
      patch.description = draft.description;
    }
    const { error } = await supabase.from(table as any).update(patch).eq("id", selected.id);
    setSavingDraft(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Page content updated." });
    setItems((prev) => prev.map((it) => it.id === selected.id ? {
      ...it,
      meta_title: patch.meta_title, meta_description: patch.meta_description,
      h1_tag: patch.h1_tag, primary_keyword: patch.primary_keyword, keywords: patch.keywords,
      completion: calcCompletion({ ...it, ...patch }),
    } : it));
  };

  const runFullAudit = async () => {
    if (!selected) return;
    setAuditing(true);
    setAuditResult(null);
    const { data, error } = await supabase.functions.invoke("full-page-seo-audit", {
      body: { contentType: selected.kind, recordId: selected.id, runCompetitorScan },
    });
    setAuditing(false);
    if (error) {
      toast({ title: "Audit failed", description: error.message, variant: "destructive" });
      return;
    }
    if ((data as any)?.error) {
      toast({ title: "Audit failed", description: (data as any).error, variant: "destructive" });
      return;
    }
    setAuditResult(data);
    toast({ title: "Audit complete", description: "Review suggestions below and apply." });
  };

  const applyAudit = async () => {
    if (!selected || !auditResult?.suggestions || !draft) return;
    setSavingAudit(true);
    const s = auditResult.suggestions;
    const table = TABLE_BY_KIND[selected.kind];

    const flatKeywords = [
      ...(s.keywords?.primary || []),
      ...(s.keywords?.shortTail || []),
      ...(s.keywords?.longTail || []),
    ].slice(0, 30);

    const patch: Record<string, any> = {
      meta_title: s.meta_title,
      meta_description: s.meta_description,
      h1_tag: s.h1_tag,
      primary_keyword: s.primary_keyword,
      keywords: flatKeywords,
      last_seo_refresh: new Date().toISOString(),
    };
    const { error: upErr } = await supabase.from(table as any).update(patch).eq("id", selected.id);
    if (upErr) {
      setSavingAudit(false);
      toast({ title: "Apply failed", description: upErr.message, variant: "destructive" });
      return;
    }

    // Save snapshot for runtime SEOHead consumption
    try {
      const snap = buildStoredSeoSnapshot(KIND_TO_SEO_TYPE[selected.kind], { ...draft, ...patch }, s);
      await saveSeoSnapshot(snap);
    } catch (e) {
      console.error("snapshot save", e);
    }

    setSavingAudit(false);
    toast({ title: "Applied", description: "Meta + snapshot updated. Live page reflects new SEO." });
    setDraft({ ...draft, ...patch });
    setItems((prev) => prev.map((it) => it.id === selected.id ? {
      ...it,
      meta_title: patch.meta_title, meta_description: patch.meta_description,
      h1_tag: patch.h1_tag, primary_keyword: patch.primary_keyword, keywords: patch.keywords,
      completion: calcCompletion({ ...it, ...patch }),
    } : it));
  };

  const previewSrc = selected ? selected.publishedUrl : "";

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Completed Pages — Editor & SEO Audit</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review the assembled page (base + sections + courses), edit any field inline, then run a full-page SEO audit with competitor scan.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* List */}
        <Card className="col-span-12 lg:col-span-3 max-h-[80vh] flex flex-col">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-sm">Pages ({filtered.length})</CardTitle>
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                <Input
                  className="h-8 text-xs pl-7"
                  placeholder="Search name / slug…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5">
                <Select value={kindFilter} onValueChange={(v: any) => setKindFilter(v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="college">Colleges</SelectItem>
                    <SelectItem value="institute">Institutes</SelectItem>
                    <SelectItem value="article">Articles</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={completionFilter} onValueChange={(v: any) => setCompletionFilter(v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="incomplete">Needs SEO</SelectItem>
                    <SelectItem value="complete">SEO Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-[65vh]">
              {loading ? (
                <div className="p-4 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">No pages match.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((it) => {
                    const isSel = selected?.id === it.id;
                    const Icon = it.kind === "college" ? GraduationCap : it.kind === "institute" ? Building2 : FileText;
                    return (
                      <li key={`${it.kind}-${it.id}`}>
                        <button
                          onClick={() => selectItem(it)}
                          className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors ${isSel ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{it.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">/{it.slug}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{it.kind}</Badge>
                                <span className={`text-[10px] font-semibold ${it.completion >= 80 ? "text-emerald-600" : it.completion >= 50 ? "text-amber-600" : "text-destructive"}`}>
                                  {it.completion}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Editor + Preview + SEO */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          {!selected ? (
            <Card className="h-[60vh] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a page on the left to edit & audit.</p>
              </div>
            </Card>
          ) : !draft ? (
            <Card className="h-[60vh] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </Card>
          ) : (
            <Tabs defaultValue="preview" className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground truncate">{selected.name}</h2>
                  <a
                    href={selected.publishedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {selected.publishedUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <TabsList>
                  <TabsTrigger value="preview" className="text-xs"><Eye className="w-3 h-3 mr-1" />Live Preview + Edit</TabsTrigger>
                  <TabsTrigger value="seo" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />Full SEO Audit</TabsTrigger>
                  <TabsTrigger value="schema" className="text-xs"><Code className="w-3 h-3 mr-1" />Schema</TabsTrigger>
                </TabsList>
              </div>

              {/* Live preview + side editor */}
              <TabsContent value="preview" className="m-0">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <Card className="overflow-hidden">
                    <CardHeader className="py-2 px-3 border-b bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold flex items-center gap-1"><Globe className="w-3 h-3" /> Live Preview</span>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => {
                          const f = document.getElementById("page-preview-frame") as HTMLIFrameElement | null;
                          if (f) f.src = `${selected.publishedUrl}?_t=${Date.now()}`;
                        }}>
                          <RefreshCw className="w-3 h-3 mr-1" /> Reload
                        </Button>
                      </div>
                    </CardHeader>
                    <iframe
                      id="page-preview-frame"
                      src={selected.publishedUrl}
                      className="w-full h-[70vh] bg-background"
                      title="Page preview"
                    />
                  </Card>

                  <Card>
                    <CardHeader className="py-2 px-3 border-b bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Inline Editor</span>
                        <Button size="sm" onClick={saveDraft} disabled={savingDraft} className="h-7 text-xs">
                          {savingDraft ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                          Save
                        </Button>
                      </div>
                    </CardHeader>
                    <ScrollArea className="h-[70vh]">
                      <CardContent className="space-y-3 p-3">
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Page Name / Title</Label>
                          <Input
                            value={selected.kind === "article" ? (draft.title ?? "") : (draft.name ?? "")}
                            onChange={(e) => setDraft({ ...draft, [selected.kind === "article" ? "title" : "name"]: e.target.value })}
                            className="h-8 text-sm mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">H1 Tag</Label>
                          <Input value={draft.h1_tag ?? ""} onChange={(e) => setDraft({ ...draft, h1_tag: e.target.value })} className="h-8 text-sm mt-0.5" />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Meta Title <span className="text-muted-foreground">({(draft.meta_title || "").length}/60)</span></Label>
                          <Input value={draft.meta_title ?? ""} onChange={(e) => setDraft({ ...draft, meta_title: e.target.value })} className="h-8 text-sm mt-0.5" maxLength={70} />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Meta Description <span className="text-muted-foreground">({(draft.meta_description || "").length}/160)</span></Label>
                          <Textarea value={draft.meta_description ?? ""} onChange={(e) => setDraft({ ...draft, meta_description: e.target.value })} rows={3} className="text-sm mt-0.5" maxLength={170} />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Primary Keyword</Label>
                          <Input value={draft.primary_keyword ?? ""} onChange={(e) => setDraft({ ...draft, primary_keyword: e.target.value })} className="h-8 text-sm mt-0.5" />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Keywords (comma-separated)</Label>
                          <Textarea
                            value={(draft.keywords || []).join(", ")}
                            onChange={(e) => setDraft({ ...draft, keywords: e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean) })}
                            rows={2} className="text-sm mt-0.5"
                          />
                        </div>
                        <Separator />
                        <div>
                          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Description / Summary</Label>
                          <Textarea
                            value={draft.description ?? draft.excerpt ?? ""}
                            onChange={(e) => setDraft({ ...draft, [selected.kind === "article" ? "excerpt" : "description"]: e.target.value })}
                            rows={4} className="text-sm mt-0.5"
                          />
                        </div>
                        {selected.kind === "article" && (
                          <div>
                            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Article Content (HTML)</Label>
                            <Textarea
                              value={draft.content ?? ""}
                              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                              rows={10} className="text-xs font-mono mt-0.5"
                            />
                          </div>
                        )}
                        {selected.kind === "college" && (
                          <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded">
                            Section content (courses, cutoffs, FAQs…) is edited in <a href="/admin/college-sections" className="text-primary hover:underline">College Sections</a>.
                            The SEO audit reads ALL sections automatically.
                          </p>
                        )}
                        {selected.kind === "institute" && (
                          <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded">
                            Courses & faculty are edited in <a href="/admin/courses" className="text-primary hover:underline">Courses</a>. Audit reads them automatically.
                          </p>
                        )}
                      </CardContent>
                    </ScrollArea>
                  </Card>
                </div>
              </TabsContent>

              {/* Full SEO audit */}
              <TabsContent value="seo" className="m-0 space-y-3">
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Full Assembled-Page SEO Audit</CardTitle>
                        <CardDescription className="text-xs">Runs the AI on the entire page (base + all sections/courses/faculty). Optionally scans top-5 ranking competitors via Firecrawl.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs">
                          <input type="checkbox" checked={runCompetitorScan} onChange={(e) => setRunCompetitorScan(e.target.checked)} />
                          Competitor scan
                        </label>
                        <Button onClick={runFullAudit} disabled={auditing} size="sm">
                          {auditing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                          Run Audit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {auditResult && (
                    <CardContent className="space-y-4">
                      {/* Score */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <ScoreCard label="Current Score" value={auditResult.suggestions?.seoScore?.overall ?? 0} />
                        <ScoreCard label="Projected" value={auditResult.suggestions?.seoScore?.projectedScore ?? 0} positive />
                        <ScoreCard label="Word Count" value={auditResult.assembled?.wordCount ?? 0} unit="" />
                        <ScoreCard label="Sections" value={(auditResult.assembled?.sectionsCount ?? 0) + (auditResult.assembled?.coursesCount ?? 0)} unit="" />
                      </div>

                      {/* Suggested meta */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Suggested Meta</h4>
                        <SuggestedField label="Meta Title" current={draft.meta_title} suggested={auditResult.suggestions.meta_title} />
                        <SuggestedField label="Meta Description" current={draft.meta_description} suggested={auditResult.suggestions.meta_description} multiline />
                        <SuggestedField label="H1 Tag" current={draft.h1_tag} suggested={auditResult.suggestions.h1_tag} />
                        <SuggestedField label="Primary Keyword" current={draft.primary_keyword} suggested={auditResult.suggestions.primary_keyword} />
                      </div>

                      {/* Issues + Passes */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <IssueList icon={<XCircle className="w-3 h-3 text-destructive" />} title="Critical" items={auditResult.suggestions?.seoScore?.criticalIssues || []} tone="destructive" />
                        <IssueList icon={<AlertTriangle className="w-3 h-3 text-amber-600" />} title="Warnings" items={auditResult.suggestions?.seoScore?.warnings || []} tone="amber" />
                        <IssueList icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />} title="Passing" items={auditResult.suggestions?.seoScore?.passed || []} tone="emerald" />
                      </div>

                      {/* Keywords */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Keyword Buckets</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                          {(["primary","shortTail","longTail","faq","trending","lsi"] as const).map((k) => (
                            <div key={k} className="border border-border rounded-md p-2 bg-muted/20">
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">{k}</p>
                              <div className="flex flex-wrap gap-1">
                                {(auditResult.suggestions?.keywords?.[k] || []).slice(0, 12).map((kw: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-[10px] font-normal">{kw}</Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Competitors */}
                      {auditResult.competitors?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Top Ranking Competitors</h4>
                          <div className="space-y-1.5">
                            {auditResult.competitors.map((c: any, i: number) => (
                              <a key={i} href={c.url} target="_blank" rel="noreferrer" className="block border border-border rounded-md p-2 hover:bg-muted/40 transition-colors">
                                <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                                <p className="text-[10px] text-primary truncate">{c.url}</p>
                                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{c.snippet}</p>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Competitor insights + content suggestions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <IssueList title="Competitor Insights" items={auditResult.suggestions?.competitorInsights || []} tone="default" />
                        <IssueList title="Content Suggestions" items={auditResult.suggestions?.contentSuggestions || []} tone="default" />
                      </div>

                      {/* Apply */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => setAuditResult(null)}>Discard</Button>
                        <Button onClick={applyAudit} disabled={savingAudit} size="sm">
                          {savingAudit ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                          Apply Meta + Save Snapshot
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              {/* Schema */}
              <TabsContent value="schema" className="m-0">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">JSON-LD Schema (from latest audit)</CardTitle>
                    <CardDescription className="text-xs">Auto-applied to the live page when you click "Apply" on the SEO Audit tab.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {auditResult?.suggestions?.schemaMarkup ? (
                      <pre className="text-[10px] bg-muted/40 p-3 rounded-md overflow-auto max-h-[60vh]">
                        {JSON.stringify(auditResult.suggestions.schemaMarkup, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground">Run an SEO audit first to generate schema.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

const ScoreCard = ({ label, value, unit = "", positive }: { label: string; value: number; unit?: string; positive?: boolean }) => (
  <div className={`border rounded-md p-2.5 ${positive ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-muted/20"}`}>
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`text-xl font-bold ${positive ? "text-emerald-600" : "text-foreground"}`}>{value}{unit !== undefined ? unit : "/100"}</p>
    {unit === undefined && <Progress value={Math.min(100, value)} className="h-1 mt-1.5" />}
  </div>
);

const SuggestedField = ({ label, current, suggested, multiline }: { label: string; current?: string; suggested?: string; multiline?: boolean }) => {
  const same = (current || "").trim() === (suggested || "").trim();
  return (
    <div className="border border-border rounded-md p-2.5 bg-muted/20">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</span>
        {same ? <Badge variant="outline" className="text-[9px]">No change</Badge> : <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30">Updated</Badge>}
      </div>
      <p className="text-[10px] text-muted-foreground line-through truncate">{current || "(empty)"}</p>
      <p className={`text-xs text-foreground font-medium ${multiline ? "" : "truncate"}`}>{suggested || "(empty)"}</p>
    </div>
  );
};

const IssueList = ({ icon, title, items, tone }: { icon?: React.ReactNode; title: string; items: string[]; tone: "destructive" | "amber" | "emerald" | "default" }) => {
  const toneClass = tone === "destructive" ? "border-destructive/30 bg-destructive/5"
    : tone === "amber" ? "border-amber-500/30 bg-amber-500/5"
    : tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/5"
    : "border-border bg-muted/20";
  return (
    <div className={`border rounded-md p-2.5 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">{icon}{title} ({items.length})</p>
      <ul className="space-y-1 text-[11px] text-foreground">
        {items.length === 0 ? <li className="text-muted-foreground">None</li> : items.slice(0, 8).map((it, i) => (
          <li key={i} className="leading-snug">• {it}</li>
        ))}
      </ul>
    </div>
  );
};

export default PageEditorWorkspace;
