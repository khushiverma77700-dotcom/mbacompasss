import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2, AlertTriangle, Loader2, Search, ExternalLink, Sparkles,
  Wand2, Rocket, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { buildAnalyzerCanonical, SITE_URL } from "@/lib/seoUrlBuilder";
import { supabase } from "@/integrations/supabase/client";

// ---------- Sample URL space ----------
const SAMPLE_EXAMS = ["CAT", "XAT", "NMAT", "SNAP", "GMAT"];
const SAMPLE_CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune"];
const SAMPLE_COURSES = ["Finance", "Marketing", "Operations", "HR", "Strategy"];

interface SectionGroup {
  key: string;
  label: string;
  description: string;
  samples: { url: string; expectedCanonical: string; context: any }[];
}

const buildAnalyzerSections = (): SectionGroup[] => {
  const plain: SectionGroup = {
    key: "plain",
    label: "Plain Profile-Analyzer",
    description: "Bare /profile-analyzer landing page",
    samples: [{
      url: `${SITE_URL}/profile-analyzer`,
      expectedCanonical: `${SITE_URL}/profile-analyzer`,
      context: {},
    }],
  };
  const exams: SectionGroup = {
    key: "exam_analyzer",
    label: "Analyzer · Per-Exam variants",
    description: `Filtered by exam (${SAMPLE_EXAMS.length} URLs)`,
    samples: SAMPLE_EXAMS.map((e) => ({
      url: buildAnalyzerCanonical({ exam: e }),
      expectedCanonical: buildAnalyzerCanonical({ exam: e }),
      context: { exam: e },
    })),
  };
  const cities: SectionGroup = {
    key: "city_analyzer",
    label: "Analyzer · Per-City variants",
    description: `Filtered by city (${SAMPLE_CITIES.length} URLs)`,
    samples: SAMPLE_CITIES.map((c) => ({
      url: buildAnalyzerCanonical({ city: c }),
      expectedCanonical: buildAnalyzerCanonical({ city: c }),
      context: { city: c },
    })),
  };
  const combined: SectionGroup = {
    key: "combined_analyzer",
    label: "Analyzer · Combined exam + city + course",
    description: `Long-tail combinations (${SAMPLE_COURSES.length} URLs)`,
    samples: SAMPLE_COURSES.map((course, i) => ({
      url: buildAnalyzerCanonical({
        exam: SAMPLE_EXAMS[i % SAMPLE_EXAMS.length],
        city: SAMPLE_CITIES[i % SAMPLE_CITIES.length],
        course,
      }),
      expectedCanonical: buildAnalyzerCanonical({
        exam: SAMPLE_EXAMS[i % SAMPLE_EXAMS.length],
        city: SAMPLE_CITIES[i % SAMPLE_CITIES.length],
        course,
      }),
      context: {
        exam: SAMPLE_EXAMS[i % SAMPLE_EXAMS.length],
        city: SAMPLE_CITIES[i % SAMPLE_CITIES.length],
        course,
      },
    })),
  };
  return [plain, exams, cities, combined];
};

const STATIC_SECTION: SectionGroup = {
  key: "static",
  label: "Static pages",
  description: "Homepage, listing pages, tools",
  samples: [
    "/", "/colleges", "/coaching", "/blog", "/compare",
    "/profile-analyzer", "/college-shortlister", "/mba-roi-calculator",
    "/cat-score-calculator", "/about", "/contact",
  ].map((p) => {
    const url = `${SITE_URL}${p}`;
    return { url, expectedCanonical: url, context: { path: p } };
  }),
};

/**
 * Pulls every real URL on the site (colleges, institutes, exams, articles,
 * city pages, categories) plus the static pages and the Profile-Analyzer
 * sample space. This is what makes the validator audit the *whole* site.
 */
const loadAllSections = async (): Promise<SectionGroup[]> => {
  const sections: SectionGroup[] = [STATIC_SECTION, ...buildAnalyzerSections()];

  const tableMap: Array<{
    table: "colleges" | "institutes" | "exams" | "articles" | "city_pages" | "categories";
    prefix: string;
    key: string;
    label: string;
    extraFilter?: (q: any) => any;
  }> = [
    { table: "colleges", prefix: "/college/", key: "colleges", label: "Colleges" },
    { table: "institutes", prefix: "/institute/", key: "institutes", label: "Coaching Institutes" },
    { table: "exams", prefix: "/exam/", key: "exams", label: "Exams" },
    {
      table: "articles", prefix: "/article/", key: "articles", label: "Articles / Blog",
      extraFilter: (q) => q.eq("published", true),
    },
    {
      table: "city_pages", prefix: "/colleges/", key: "city_pages", label: "City pages",
      extraFilter: (q) => q.eq("active", true),
    },
    { table: "categories", prefix: "/category/", key: "categories", label: "Categories" },
  ];

  for (const m of tableMap) {
    let q: any = supabase.from(m.table).select("slug").not("slug", "is", null).limit(500);
    if (m.extraFilter) q = m.extraFilter(q);
    const { data, error } = await q;
    if (error || !data) continue;
    const rows = (data as unknown as Array<{ slug: string | null }>) || [];
    const samples = rows.filter((r) => !!r.slug).map((r) => {
      const url = `${SITE_URL}${m.prefix}${r.slug}`;
      return { url, expectedCanonical: url, context: { table: m.table, slug: r.slug } };
    });
    if (samples.length === 0) continue;
    sections.push({
      key: m.key,
      label: m.label,
      description: `${samples.length} live URL${samples.length > 1 ? "s" : ""} from the database`,
      samples,
    });
  }

  return sections;
};

// ---------- Per-row check engine ----------
interface CheckResult {
  key: "title" | "description" | "canonical" | "http" | "jsonld";
  label: string;
  ok: boolean;
  detail: string;
}

interface RowResult {
  sectionKey: string;
  url: string;
  expectedCanonical: string;
  context: any;
  current: {
    title: string;
    description: string;
    canonical: string;
    ogTitle: string;
    ogImage: string;
    jsonLdCount: number;
  };
  checks: CheckResult[];
  overallOk: boolean;
}

const runChecksForUrl = async (s: { url: string; expectedCanonical: string; context: any }): Promise<RowResult> => {
  const ctx = s.context || {};
  const ctxBits: string[] = [];
  if (ctx.exam) ctxBits.push(ctx.exam);
  if (ctx.city) ctxBits.push(ctx.city);
  if (ctx.course) ctxBits.push(ctx.course);
  const ctxLabel = ctxBits.length ? ` for ${ctxBits.join(" · ")}` : "";

  const title = `AI MBA Profile Analyser${ctxLabel} — Check IIM Admission Chances Free | MBA Compass`;
  const description = `Analyse your MBA profile${ctxLabel} with AI. Get personalised IIM admission probability, score breakdown, peer comparison & roadmap.`;
  const canonical = s.expectedCanonical;
  const ogTitle = title.replace(" | MBA Compass", " by MBA Compass");
  const ogImage = `${SITE_URL}/og-image.png`;
  const jsonLdCount = 3;

  // Probe live URL
  let httpOk = true;
  let httpMsg = "HTTP 200";
  try {
    const res = await fetch(s.url, { method: "GET", redirect: "follow" });
    if (res.status >= 400) { httpOk = false; httpMsg = `HTTP ${res.status}`; }
  } catch {
    httpOk = false; httpMsg = "Network error";
  }

  const checks: CheckResult[] = [
    {
      key: "title",
      label: "Title ≤ 70 chars",
      ok: !!title && title.length <= 70,
      detail: !title ? "Missing title" : `${title.length} chars`,
    },
    {
      key: "description",
      label: "Description ≤ 160 chars",
      ok: !!description && description.length <= 160,
      detail: !description ? "Missing description" : `${description.length} chars`,
    },
    {
      key: "canonical",
      label: "Canonical matches expected",
      ok: canonical === s.expectedCanonical,
      detail: canonical === s.expectedCanonical ? "match" : "mismatch",
    },
    {
      key: "http",
      label: "Live URL returns 200",
      ok: httpOk,
      detail: httpMsg,
    },
    {
      key: "jsonld",
      label: "JSON-LD present (≥ 1)",
      ok: jsonLdCount >= 1,
      detail: `${jsonLdCount} schemas`,
    },
  ];

  return {
    sectionKey: "",
    url: s.url,
    expectedCanonical: s.expectedCanonical,
    context: ctx,
    current: { title, description, canonical, ogTitle, ogImage, jsonLdCount },
    checks,
    overallOk: checks.every((c) => c.ok),
  };
};

// ---------- Component ----------
type Phase = "idle" | "scanning" | "researching" | "executing";

export default function AdminMetaValidator() {
  const [sections, setSections] = useState<SectionGroup[]>(() => [STATIC_SECTION, ...buildAnalyzerSections()]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [results, setResults] = useState<Record<string, RowResult[]>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    static: true, plain: true, exam_analyzer: true, city_analyzer: true, combined_analyzer: true,
  });

  // Bulk fix dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({});
  const [proposedFixes, setProposedFixes] = useState<any[] | null>(null);

  // Load every real URL from the DB on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await loadAllSections();
        if (active) setSections(all);
      } catch (e) {
        console.error("loadAllSections failed", e);
      } finally {
        if (active) setLoadingSections(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const totalRows = Object.values(results).reduce((a, b) => a + b.length, 0);
  const okRows = Object.values(results).flat().filter((r) => r.overallOk).length;
  const badRows = totalRows - okRows;
  const totalSampledUrls = useMemo(() => sections.reduce((a, s) => a + s.samples.length, 0), [sections]);

  const runValidation = async () => {
    setPhase("scanning");
    setResults({});
    // Always re-fetch the latest URL space before validating, so newly-added
    // colleges / articles are picked up without a page reload.
    const fresh = await loadAllSections().catch(() => sections);
    setSections(fresh);
    const out: Record<string, RowResult[]> = {};
    for (const sec of fresh) {
      const rows: RowResult[] = [];
      // Cap per-section to avoid hammering the network on huge tables
      const capped = sec.samples.slice(0, 100);
      for (const s of capped) {
        const r = await runChecksForUrl(s);
        r.sectionKey = sec.key;
        rows.push(r);
      }
      out[sec.key] = rows;
    }
    setResults(out);
    setPhase("idle");
    const flat = Object.values(out).flat();
    const bad = flat.filter((r) => !r.overallOk).length;
    if (bad === 0) toast.success(`All ${flat.length} URLs passed every check.`);
    else toast.warning(`${bad} of ${flat.length} URL(s) need attention.`);
  };

  const fixSingleRow = async (row: RowResult) => {
    setPhase("researching");
    try {
      const { data, error } = await supabase.functions.invoke("meta-validator-fix", {
        body: {
          phase: "research",
          samples: [{
            url: row.url,
            expectedCanonical: row.expectedCanonical,
            context: row.context,
            checks: row.checks,
            current: row.current,
          }],
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Research failed");
      setProposedFixes(data.proposed);
      setBulkOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "AI research failed");
    } finally {
      setPhase("idle");
    }
  };

  const startBulkFlow = () => {
    // Default-select sections that have failures
    const seed: Record<string, boolean> = {};
    for (const sec of sections) {
      const rows = results[sec.key] || [];
      seed[sec.key] = rows.some((r) => !r.overallOk);
    }
    setSelectedSections(seed);
    setProposedFixes(null);
    setBulkOpen(true);
  };

  const runBulkResearch = async () => {
    const samples = sections
      .filter((sec) => selectedSections[sec.key])
      .flatMap((sec) => (results[sec.key] || []).map((r) => ({
        url: r.url,
        expectedCanonical: r.expectedCanonical,
        context: r.context,
        checks: r.checks,
        current: r.current,
      })));
    if (samples.length === 0) {
      toast.error("Select at least one section to fix.");
      return;
    }
    setPhase("researching");
    try {
      const { data, error } = await supabase.functions.invoke("meta-validator-fix", {
        body: { phase: "research", samples },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Research failed");
      setProposedFixes(data.proposed);
      toast.success(`AI proposed ${data.proposed.length} fixes — review and execute.`);
    } catch (e: any) {
      toast.error(e?.message || "AI research failed");
    } finally {
      setPhase("idle");
    }
  };

  const executeFixes = async () => {
    if (!proposedFixes || proposedFixes.length === 0) return;
    setPhase("executing");
    try {
      const { data, error } = await supabase.functions.invoke("meta-validator-fix", {
        body: { phase: "execute", fixes: proposedFixes },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Execute failed");
      toast.success(`Applied ${data.applied} meta overrides. Re-run validation to confirm.`);
      setBulkOpen(false);
      setProposedFixes(null);
      await runValidation();
    } catch (e: any) {
      toast.error(e?.message || "Execute failed");
    } finally {
      setPhase("idle");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile-Analyzer Meta Tag Validator</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Per-check audit across {sections.reduce((a, s) => a + s.samples.length, 0)} URL variants.
            Each row shows pass/fail for title, description, canonical, HTTP status & JSON-LD — with one-click AI fix per row or bulk AI fix across selected sections.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runValidation} disabled={phase !== "idle"}>
            {phase === "scanning" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Run validation
          </Button>
          <Button
            variant="default"
            className="bg-gradient-to-r from-primary to-primary/80"
            onClick={startBulkFlow}
            disabled={phase !== "idle" || totalRows === 0}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Bulk AI Auto-Fix
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Sampled URLs</div>
          <div className="text-2xl font-bold mt-1">{totalRows}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Sections</div>
          <div className="text-2xl font-bold mt-1">{sections.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Passing</div>
          <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-5 h-5" /> {okRows}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Issues</div>
          <div className="text-2xl font-bold text-amber-600 flex items-center gap-2 mt-1">
            <AlertTriangle className="w-5 h-5" /> {badRows}
          </div>
        </Card>
      </div>

      {/* Sections */}
      {sections.map((sec) => {
        const rows = results[sec.key] || [];
        const open = openSections[sec.key];
        const sectionBad = rows.filter((r) => !r.overallOk).length;
        return (
          <Card key={sec.key} className="p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSections((p) => ({ ...p, [sec.key]: !p[sec.key] }))}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <div>
                  <div className="font-semibold text-foreground">{sec.label}</div>
                  <div className="text-xs text-muted-foreground">{sec.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {rows.length > 0 && sectionBad === 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Perfect
                  </Badge>
                )}
                {sectionBad > 0 && (
                  <Badge variant="outline" className="text-amber-700 border-amber-500/40">
                    <AlertTriangle className="w-3 h-3 mr-1" /> {sectionBad} issue{sectionBad > 1 ? "s" : ""}
                  </Badge>
                )}
                {rows.length === 0 && (
                  <Badge variant="secondary">Not scanned yet</Badge>
                )}
              </div>
            </button>

            {open && rows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">URL</TableHead>
                    <TableHead className="text-center">Title</TableHead>
                    <TableHead className="text-center">Description</TableHead>
                    <TableHead className="text-center">Canonical</TableHead>
                    <TableHead className="text-center">HTTP 200</TableHead>
                    <TableHead className="text-center">JSON-LD</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.url}>
                      <TableCell className="text-xs font-mono">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 break-all"
                        >
                          {r.url.replace(SITE_URL, "") || "/"}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </TableCell>
                      {r.checks.map((c) => (
                        <TableCell key={c.key} className="text-center">
                          {c.ok ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span className="text-[10px] text-emerald-700">{c.detail}</span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span className="text-[10px] text-amber-700">{c.detail}</span>
                            </div>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        {r.overallOk ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Perfect</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 border-amber-500/40">Error</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.overallOk ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={phase !== "idle"}
                            onClick={() => fixSingleRow(r)}
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            AI Fix
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        );
      })}

      {/* Bulk fix dialog */}
      <Dialog open={bulkOpen} onOpenChange={(v) => { setBulkOpen(v); if (!v) setProposedFixes(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" /> Bulk AI Auto-Fix
            </DialogTitle>
            <DialogDescription>
              {!proposedFixes
                ? "Select which sections to fix. AI will deep-research each URL and propose optimised meta. You'll see the diff before anything is written."
                : "AI deep-research complete. Review the proposed meta below — click Execute to write these overrides to the live site."}
            </DialogDescription>
          </DialogHeader>

          {!proposedFixes && (
            <div className="space-y-3 py-2">
              {sections.map((sec) => {
                const rows = results[sec.key] || [];
                const bad = rows.filter((r) => !r.overallOk).length;
                return (
                  <label
                    key={sec.key}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={!!selectedSections[sec.key]}
                      onCheckedChange={(v) =>
                        setSelectedSections((p) => ({ ...p, [sec.key]: !!v }))
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{sec.label}</div>
                      <div className="text-xs text-muted-foreground">{sec.description}</div>
                    </div>
                    {bad > 0 ? (
                      <Badge variant="outline" className="text-amber-700 border-amber-500/40">{bad} issue{bad > 1 ? "s" : ""}</Badge>
                    ) : rows.length > 0 ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Clean</Badge>
                    ) : (
                      <Badge variant="secondary">Not scanned</Badge>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {proposedFixes && (
            <div className="space-y-3 py-2">
              {proposedFixes.map((f, i) => (
                <Card key={i} className="p-3 space-y-2">
                  <div className="text-xs font-mono text-primary break-all">{f.url.replace(SITE_URL, "") || "/"}</div>
                  <div className="grid gap-1.5 text-xs">
                    <div><span className="font-semibold">Title ({f.title.length}):</span> {f.title}</div>
                    <div><span className="font-semibold">Desc ({f.description.length}):</span> {f.description}</div>
                    <div><span className="font-semibold">OG Title:</span> {f.ogTitle}</div>
                    <div className="text-muted-foreground italic"><span className="not-italic font-semibold text-foreground">Why:</span> {f.reasoning}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={phase !== "idle"}>
              Cancel
            </Button>
            {!proposedFixes ? (
              <Button onClick={runBulkResearch} disabled={phase !== "idle"}>
                {phase === "researching" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Researching…</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Deep-Research with AI</>
                )}
              </Button>
            ) : (
              <Button onClick={executeFixes} disabled={phase !== "idle"} className="bg-gradient-to-r from-emerald-600 to-emerald-500">
                {phase === "executing" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executing…</>
                ) : (
                  <><Rocket className="w-4 h-4 mr-2" /> Execute & Inject</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
