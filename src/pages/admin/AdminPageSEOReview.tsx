import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Play, ShieldCheck, Sparkles, ArrowRight, Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PAGES: Record<string, { title: string; path: string; targetKeyword: string }> = {
  "cat-mock-1": { title: "CAT Mock Test — Landing Page", path: "/cat-mock-1", targetKeyword: "CAT mock test" },
};

type Step = { key: string; label: string; status: "pending" | "running" | "done" | "failed"; log?: string; data?: any };
type Audit = {
  id: string;
  slug: string;
  target_keyword: string;
  status: string;
  steps: Step[];
  checklist?: any;
  competitors?: any;
  keyword_gap?: any;
  proposal?: any;
  error?: string;
  approved?: boolean;
};

const PROPOSAL_FIELDS: { key: string; label: string; long?: boolean }[] = [
  { key: "title", label: "Title tag" },
  { key: "description", label: "Meta description" },
  { key: "h1", label: "H1 heading" },
  { key: "intro_html", label: "Intro paragraph (HTML)", long: true },
  { key: "keywords", label: "Keywords" },
  { key: "faq", label: "FAQ section" },
  { key: "json_ld", label: "JSON-LD structured data" },
  { key: "og_image", label: "og:image URL" },
];

function StepIcon({ status }: { status: Step["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-sky-600" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-600" />;
  return <div className="h-4 w-4 rounded-full border-2 border-slate-300" />;
}

export default function AdminPageSEOReview() {
  const { slug = "cat-mock-1" } = useParams();
  const page = PAGES[slug];
  const [audit, setAudit] = useState<Audit | null>(null);
  const [starting, setStarting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [override, setOverride] = useState<any>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const pollRef = useRef<number | null>(null);

  // Load current override + latest audit
  useEffect(() => {
    (async () => {
      const { data: ov } = await supabase.from("page_seo_overrides").select("*").eq("slug", slug).maybeSingle();
      setOverride(ov);
      const { data: latest } = await supabase
        .from("page_seo_audits")
        .select("*")
        .eq("slug", slug)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest) {
        setAudit(latest as any);
        if (latest.proposal) {
          const defaults: Record<string, boolean> = {};
          for (const f of PROPOSAL_FIELDS) if ((latest.proposal as any)[f.key]) defaults[f.key] = true;
          setAccepted(defaults);
        }
      }
    })();
  }, [slug]);

  // Polling while running
  useEffect(() => {
    if (!audit) return;
    if (audit.status !== "running") return;
    const tick = async () => {
      const { data } = await supabase.from("page_seo_audits").select("*").eq("id", audit.id).maybeSingle();
      if (data) {
        setAudit(data as any);
        if ((data as any).proposal && Object.keys(accepted).length === 0) {
          const defaults: Record<string, boolean> = {};
          for (const f of PROPOSAL_FIELDS) if ((data as any).proposal[f.key]) defaults[f.key] = true;
          setAccepted(defaults);
        }
      }
    };
    pollRef.current = window.setInterval(tick, 2000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [audit?.status, audit?.id]);

  if (!page) return <div className="p-6">Page not tracked: {slug}</div>;

  const startAudit = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("deep-seo-audit", {
        body: { slug, targetKeyword: page.targetKeyword },
      });
      if (error) throw error;
      const { data: fresh } = await supabase.from("page_seo_audits").select("*").eq("id", data.auditId).maybeSingle();
      setAudit(fresh as any);
      setAccepted({});
      toast.success("Audit started");
    } catch (e: any) {
      toast.error(e.message || "Failed to start");
    } finally { setStarting(false); }
  };

  const applyLive = async () => {
    if (!audit) return;
    setApplying(true);
    try {
      const { error } = await supabase.functions.invoke("apply-seo-override", {
        body: { auditId: audit.id, accepted },
      });
      if (error) throw error;
      const { data: ov } = await supabase.from("page_seo_overrides").select("*").eq("slug", slug).maybeSingle();
      setOverride(ov);
      toast.success("Live on /" + slug);
    } catch (e: any) {
      toast.error(e.message || "Publish failed");
    } finally { setApplying(false); }
  };

  const revertLive = async () => {
    if (!confirm("Revert to hardcoded content? This deletes the live override.")) return;
    const { error } = await supabase.from("page_seo_overrides").delete().eq("slug", slug);
    if (error) return toast.error(error.message);
    setOverride(null);
    toast.success("Reverted");
  };

  const p = (audit?.proposal as any) || {};
  const cl = audit?.checklist as any;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Deep SEO Audit</div>
          <h1 className="text-2xl md:text-3xl font-semibold">{page.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <a href={page.path} target="_blank" rel="noreferrer" className="hover:underline">{page.path}</a>
            <Badge variant="secondary">Target: {page.targetKeyword}</Badge>
            {override && <Badge className="bg-emerald-100 text-emerald-700 border-0">Live override active</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={page.path} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Open page</a>
          </Button>
          <Button size="sm" onClick={startAudit} disabled={starting || audit?.status === "running"}>
            {audit?.status === "running"
              ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Running…</>
              : <><Play className="h-4 w-4 mr-1" />Run deep audit</>}
          </Button>
        </div>
      </div>

      {override && (
        <Card className="p-4 border-emerald-200 bg-emerald-50">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold text-emerald-900">Live overrides applied</div>
              <div className="text-emerald-800/80 mt-1">
                Last published {new Date(override.applied_at).toLocaleString()}. Public page renders these values.
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={revertLive}>Revert</Button>
          </div>
        </Card>
      )}

      {audit?.error && (
        <Card className="p-4 border-red-200 bg-red-50 text-sm text-red-700">Audit error: {audit.error}</Card>
      )}

      {!audit && (
        <Card className="p-6 text-sm text-muted-foreground">
          Click <b>Run deep audit</b> to start. The agent will read the page, research the keyword on the web,
          analyze competitors, find keyword gaps, run the full SEO checklist, and generate a proposal you can approve.
        </Card>
      )}

      {/* Steps */}
      {audit && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Audit progress</h2>
          <div className="space-y-3">
            {(audit.steps || []).map((s, i) => (
              <div key={s.key} className="flex items-start gap-3">
                <div className="pt-1"><StepIcon status={s.status} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Step {i + 1}</span>
                    <div className="font-medium">{s.label}</div>
                    <Badge variant="outline" className="text-xs uppercase">{s.status}</Badge>
                  </div>
                  {s.data && (
                    <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                      {formatStepData(s.key, s.data)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Checklist summary */}
      {cl && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 md:col-span-2">
            <div className="text-sm text-muted-foreground">Overall SEO score</div>
            <div className="flex items-end gap-3 mt-1"><div className="text-4xl font-bold">{cl.score}</div><div className="text-sm text-muted-foreground pb-1">/ 100</div></div>
            <Progress value={cl.score} className="mt-3" />
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground mb-2">Checks</div>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{cl.passing} passing</div>
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />{cl.warnings} warnings</div>
              <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600" />{cl.failing} failing</div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground mb-2">Keyword gap</div>
            <div className="text-xs text-muted-foreground max-h-32 overflow-auto">
              {(audit?.keyword_gap as any)?.missing_keywords?.slice(0, 8).join(", ") || "—"}
            </div>
          </Card>
        </div>
      )}

      {cl?.checks && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">SEO checklist</h3>
          <div className="divide-y">
            {cl.checks.map((c: any) => (
              <div key={c.key} className="py-2 flex items-start gap-3">
                <div className="pt-0.5">
                  {c.status === "pass" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                   : c.status === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                   : <XCircle className="h-4 w-4 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{c.label}</div>
                  {c.value && <div className="text-xs text-muted-foreground break-words">{c.value}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Proposal + approval */}
      {audit?.proposal && audit.status !== "running" && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-sky-600" />
            <h3 className="font-semibold">Proposed changes — review and approve</h3>
          </div>
          <div className="space-y-4">
            {PROPOSAL_FIELDS.map((f) => {
              const proposed = (p as any)[f.key];
              if (proposed === undefined || proposed === null) return null;
              const current = (override as any)?.[f.key];
              return (
                <div key={f.key} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id={`acc-${f.key}`}
                      checked={!!accepted[f.key]}
                      onCheckedChange={(v) => setAccepted((s) => ({ ...s, [f.key]: !!v }))}
                    />
                    <label htmlFor={`acc-${f.key}`} className="font-medium text-sm cursor-pointer">{f.label}</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground mb-1">Current live</div>
                      <div className="rounded bg-slate-50 p-2 min-h-12 whitespace-pre-wrap break-words">
                        {formatVal(current) || <span className="text-muted-foreground">(none — hardcoded page default)</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1 flex items-center gap-1">Proposed <ArrowRight className="h-3 w-3" /></div>
                      <div className="rounded bg-sky-50 p-2 min-h-12 whitespace-pre-wrap break-words">
                        {formatVal(proposed)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 justify-end">
            <div className="text-xs text-muted-foreground mr-auto">
              Approved fields will be written to <code>page_seo_overrides</code> and rendered instantly by the public page.
            </div>
            <Button variant="outline" size="sm" onClick={() => setAccepted({})}>Uncheck all</Button>
            <Button
              onClick={applyLive}
              disabled={applying || Object.values(accepted).every(v => !v)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {applying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
              Approve & publish live
            </Button>
          </div>
        </Card>
      )}

      <div className="text-xs text-muted-foreground">
        <Link to="/admin/seo-dashboard" className="underline">Open AI SEO Dashboard</Link>
      </div>
    </div>
  );
}

function formatVal(v: any) {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("\n");
  return JSON.stringify(v, null, 2);
}

function formatStepData(key: string, d: any): string {
  if (!d) return "";
  if (key === "fetch") return `Title: ${d.title || "—"}\nDesc: ${d.description || "—"}\nH1: ${d.h1 || "—"}\nWords: ${d.wordCount ?? "—"}`;
  if (key === "research") {
    if (d.skipped) return "Skipped (Firecrawl not configured)";
    const items = (d.results || []).slice(0, 5).map((r: any) => `• ${r.title || r.url}`);
    return items.join("\n") || d.error || "(no results)";
  }
  if (key === "competitors") return (d || []).map((c: any) => `• ${c.title || c.url}${c.words ? ` — ${c.words} words` : ""}`).join("\n");
  if (key === "gap") return (d.missing_keywords || []).join(", ") || d.error || "(none)";
  if (key === "checklist") return `Score ${d.score}/100 — ${d.passing} passing, ${d.warnings} warnings, ${d.failing} failing`;
  return "";
}
