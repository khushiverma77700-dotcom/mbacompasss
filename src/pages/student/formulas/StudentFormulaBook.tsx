import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Sigma, BookmarkCheck, CheckCircle2, RotateCcw, Bookmark, Flame,
  Target, Zap, Sparkles, Filter, GraduationCap, Star, TrendingUp, Calculator,
  ChevronRight, ArrowRight, Eye, EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MathExpression } from "@/components/formulas/MathExpression";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers as LayersIcon, BookOpen, Gauge, ListChecks, X } from "lucide-react";
const DIFFS = [
  { k: "all", l: "All" },
  { k: "beginner", l: "Beginner" },
  { k: "intermediate", l: "Intermediate" },
  { k: "cat", l: "CAT" },
  { k: "advanced", l: "Advanced" },
];
const STATUSES = [
  { k: "all", l: "All" },
  { k: "pending", l: "Pending" },
  { k: "completed", l: "Completed" },
  { k: "revise_later", l: "Revise Later" },
  { k: "bookmarked", l: "Bookmarked" },
];

export default function StudentFormulaBook() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [formulas, setFormulas] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [plainMode, setPlainMode] = useState<Record<string, boolean>>({});

  const q = params.get("q") || "";
  const section = params.get("section") || "all";
  const topic = params.get("topic") || "all";
  const difficulty = params.get("difficulty") || "all";
  const status = params.get("status") || "all";
  const shortcutOnly = params.get("shortcut") === "1";
  const importantOnly = params.get("important") === "1";

  document.title = "Quant Formula Book | MBA Compass";

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: t }] = await Promise.all([
      supabase.from("quant_formulas").select("*").eq("published", true).order("importance", { ascending: false }).limit(300),
      supabase.from("quant_topics").select("*").order("sort_order"),
    ]);
    setFormulas(f || []);
    setTopics(t || []);
    if (user) {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("quant_formula_progress").select("*").eq("user_id", user.id),
        supabase.from("quant_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      const map: Record<string, any> = {};
      (p || []).forEach((row: any) => { map[row.formula_id] = row; });
      setProgress(map);
      setStreak(s);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (!v || v === "all") p.delete(k); else p.set(k, v);
    if (k === "section") p.delete("topic"); // reset topic when section changes
    setParams(p);
  };
  const toggleFlag = (k: string) => {
    const p = new URLSearchParams(params);
    if (p.get(k) === "1") p.delete(k); else p.set(k, "1");
    setParams(p);
  };

  const sections = useMemo(() => topics.filter((t) => !t.parent_slug), [topics]);
  const topicsInSection = useMemo(
    () => (section === "all" ? [] : topics.filter((t) => t.parent_slug === section)),
    [topics, section],
  );
  const topicSlugsInSection = useMemo(() => new Set(topicsInSection.map((t) => t.slug)), [topicsInSection]);

  // Instant smart filter
  const visible = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return formulas.filter((f) => {
      if (section !== "all") {
        // formula belongs to section if topic_slug == section or its topic has parent_slug == section
        if (f.topic_slug !== section && !topicSlugsInSection.has(f.topic_slug)) return false;
      }
      if (topic !== "all" && f.topic_slug !== topic) return false;
      if (difficulty !== "all" && f.difficulty !== difficulty) return false;
      if (shortcutOnly && !f.is_shortcut) return false;
      if (importantOnly && !f.is_high_weightage && f.importance < 4) return false;
      if (status !== "all") {
        const p = progress[f.id];
        if (status === "pending" && p?.status === "completed") return false;
        if (status === "completed" && p?.status !== "completed") return false;
        if (status === "revise_later" && p?.status !== "revise_later") return false;
        if (status === "bookmarked" && !p?.bookmarked) return false;
      }
      if (qLower) {
        const hay = `${f.name} ${f.expression} ${f.topic_slug} ${(f.exam_tags || []).join(" ")} ${(f.shortcuts || []).join(" ")}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [formulas, q, section, topic, difficulty, status, shortcutOnly, importantOnly, progress, topicSlugsInSection]);

  // Suggestions while typing
  const suggestions = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    if (qLower.length < 2) return [];
    const direct = formulas.filter((f) => f.name.toLowerCase().includes(qLower)).slice(0, 5);
    const topicMatches = topics.filter((t) => t.name.toLowerCase().includes(qLower)).slice(0, 3);
    return [
      ...direct.map((f) => ({ kind: "formula" as const, label: f.name, slug: f.slug, sub: f.topic_slug })),
      ...topicMatches.map((t) => ({ kind: "topic" as const, label: t.name, slug: t.slug, sub: "topic" })),
    ];
  }, [q, formulas, topics]);

  const totalDone = useMemo(() => Object.values(progress).filter((p: any) => p.status === "completed" || p.status === "mastered").length, [progress]);
  const totalSaved = useMemo(() => Object.values(progress).filter((p: any) => p.bookmarked).length, [progress]);
  const totalRevise = useMemo(() => Object.values(progress).filter((p: any) => p.status === "revise_later").length, [progress]);
  const dailyTarget = streak?.daily_target_formulas || 10;
  const doneToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return Object.values(progress).filter((p: any) => p.last_revised_at && p.last_revised_at.slice(0, 10) === today).length;
  }, [progress]);
  const targetPct = Math.min(100, Math.round((doneToday / Math.max(1, dailyTarget)) * 100));

  const xp = streak?.total_xp || 0;
  const level = streak?.level || 1;
  const xpInLevel = xp % 500;
  const xpPct = (xpInLevel / 500) * 100;

  const setStatus = async (formulaId: string, newStatus: "completed" | "revise_later" | "none") => {
    if (!user) { toast({ title: "Sign in to track progress" }); return; }
    setBusyId(formulaId);
    const prev = progress[formulaId] || {};
    const next: any = {
      user_id: user.id,
      formula_id: formulaId,
      status: newStatus,
      bookmarked: prev.bookmarked || false,
      times_revised: (prev.times_revised || 0) + (newStatus === "completed" ? 1 : 0),
      last_revised_at: new Date().toISOString(),
    };
    await supabase.from("quant_formula_progress").upsert(next, { onConflict: "user_id,formula_id" });
    if (newStatus === "completed") {
      await supabase.rpc("award_quant_xp", { _xp: 8, _activity_today: true });
      toast({ title: "+8 XP", description: "Formula marked completed" });
    }
    setProgress((p) => ({ ...p, [formulaId]: { ...next } }));
    setBusyId(null);
  };

  const toggleBookmark = async (formulaId: string) => {
    if (!user) { toast({ title: "Sign in to save formulas" }); return; }
    setBusyId(formulaId);
    const prev = progress[formulaId] || {};
    const next: any = {
      user_id: user.id,
      formula_id: formulaId,
      status: prev.status || "none",
      bookmarked: !prev.bookmarked,
    };
    await supabase.from("quant_formula_progress").upsert(next, { onConflict: "user_id,formula_id" });
    setProgress((p) => ({ ...p, [formulaId]: { ...prev, ...next } }));
    toast({ title: next.bookmarked ? "Bookmarked" : "Removed from bookmarks" });
    setBusyId(null);
  };

  // Daily revision set: weak (revise_later) + due + high-weightage backfill
  const dailySet = useMemo(() => {
    const weak = formulas.filter((f) => progress[f.id]?.status === "revise_later");
    const fresh = formulas.filter((f) => !progress[f.id]).slice(0, 10);
    const important = formulas.filter((f) => f.is_high_weightage || f.importance >= 4);
    const seen = new Set<string>();
    const picks: any[] = [];
    [...weak, ...fresh, ...important].forEach((f) => {
      if (picks.length < dailyTarget && !seen.has(f.id)) { picks.push(f); seen.add(f.id); }
    });
    return picks;
  }, [formulas, progress, dailyTarget]);

  // Ring values
  const ringR = 38; const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (targetPct / 100) * ringC;

  return (
    <div className="space-y-6 pb-24">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/70 to-blue-50/50 p-5 md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700 backdrop-blur">
                <Calculator className="h-3 w-3" /> Quant Formula Book
              </div>
              <h1 className="font-heading mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                Level {level} · {xp.toLocaleString()} XP
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Searchable, AI-explained MBA quant formulas. Mark complete, save, and revise daily to lock retention before mocks.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Pill icon={<Flame className="h-4 w-4" />} label="Day streak" value={streak?.current_streak || 0} tone="orange" />
              <Pill icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={totalDone} tone="emerald" />
              <Pill icon={<BookmarkCheck className="h-4 w-4" />} label="Saved" value={totalSaved} tone="sky" />
              <Pill icon={<RotateCcw className="h-4 w-4" />} label="Revise later" value={totalRevise} tone="amber" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-600">
                <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> Level {level}</span>
                <span>{xpInLevel}/500 XP to Lv {level + 1}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/70 ring-1 ring-sky-100">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-sky-100 bg-white/70 p-5 backdrop-blur lg:min-w-[220px]">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Target className="h-3.5 w-3.5 text-sky-600" /> Daily Target
            </span>
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={ringR} fill="none" stroke="#e0f2fe" strokeWidth="9" />
                <circle cx="50" cy="50" r={ringR} fill="none" stroke="url(#fmRingGrad)" strokeWidth="9" strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringOffset} className="transition-all duration-700" />
                <defs>
                  <linearGradient id="fmRingGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="#2563eb" /></linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-heading text-2xl font-bold text-slate-900">{doneToday}<span className="text-base text-slate-400">/{dailyTarget}</span></div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{targetPct}%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SMART SEARCH */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder="Search any formula, concept, shortcut or topic…"
              className="h-12 pl-9 text-base"
            />
            {suggestions.length > 0 && q.length >= 2 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-sky-100 bg-white shadow-lg">
                {suggestions.map((s, i) => (
                  <Link
                    key={i}
                    to={s.kind === "formula" ? `/formula/${s.slug}` : `/student/formulas?topic=${s.slug}`}
                    className="flex items-center gap-3 border-b border-slate-50 px-4 py-2.5 text-sm last:border-0 hover:bg-sky-50"
                    onClick={() => { if (s.kind === "topic") setFilter("q", ""); }}
                  >
                    {s.kind === "formula" ? <Sigma className="h-4 w-4 text-sky-600" /> : <Layers s={s} />}
                    <span className="flex-1 truncate font-medium text-slate-800">{s.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">{s.kind}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* PROMINENT FILTER BAR */}
          <div className="mt-5 rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50/60 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                <div className="rounded-lg bg-gradient-to-br from-sky-600 to-blue-600 p-1.5 text-white shadow">
                  <Filter className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-heading text-sm font-bold text-slate-900">Smart Filters</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Pick a section, then drill into topics</div>
                </div>
              </div>
              {(section !== "all" || topic !== "all" || difficulty !== "all" || status !== "all" || shortcutOnly || importantOnly) && (
                <button
                  onClick={() => setParams(new URLSearchParams(q ? { q } : {}))}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600"
                >
                  <X className="h-3 w-3" /> Clear all
                </button>
              )}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {/* SECTION — primary */}
              <DropdownField
                primary
                icon={<LayersIcon className="h-3.5 w-3.5" />}
                label="Section"
                value={section}
                onChange={(v) => setFilter("section", v)}
                placeholder="All sections"
                options={[{ k: "all", l: "All sections" }, ...sections.map((s) => ({ k: s.slug, l: s.name }))]}
              />
              {/* TOPIC — dependent */}
              <DropdownField
                icon={<BookOpen className="h-3.5 w-3.5" />}
                label="Topic"
                value={topic}
                onChange={(v) => setFilter("topic", v)}
                placeholder={section === "all" ? "Pick a section first" : "All topics"}
                disabled={section === "all" || topicsInSection.length === 0}
                options={[
                  { k: "all", l: section === "all" ? "All topics" : "All topics in section" },
                  ...topicsInSection.map((t) => ({ k: t.slug, l: t.name })),
                ]}
              />
              <DropdownField
                icon={<Gauge className="h-3.5 w-3.5" />}
                label="Difficulty"
                value={difficulty}
                onChange={(v) => setFilter("difficulty", v)}
                placeholder="All levels"
                options={DIFFS.map((d) => ({ k: d.k, l: d.l }))}
              />
              <DropdownField
                icon={<ListChecks className="h-3.5 w-3.5" />}
                label="Status"
                value={status}
                onChange={(v) => setFilter("status", v)}
                placeholder="All"
                options={STATUSES.map((s) => ({ k: s.k, l: s.l }))}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-sky-100 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Quick toggles:</span>
              <Chip active={importantOnly} onClick={() => toggleFlag("important")}>★ High weightage</Chip>
              <Chip active={shortcutOnly} onClick={() => toggleFlag("shortcut")}>⚡ Shortcut</Chip>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DAILY REVISION */}
      {dailySet.length > 0 && (
        <Card className="border-2 border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50/40">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                  <Sparkles className="h-3 w-3" /> Daily Revision
                </div>
                <h2 className="font-heading mt-1 text-xl font-bold text-slate-900">Today's set · {dailySet.length} formulas</h2>
                <p className="text-xs text-slate-600">Mix of weak, due-for-review and high-weightage picks.</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Progress</div>
                <div className="font-heading text-2xl font-bold text-slate-900">{doneToday}/{dailyTarget}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {dailySet.slice(0, 5).map((f) => (
                <Link
                  key={f.id}
                  to={`/formula/${f.slug}`}
                  className="group rounded-xl border border-amber-200 bg-white/80 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-amber-700">{f.name}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{f.topic_slug?.replace(/-/g, " ")}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* RESULTS */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-slate-900">
          {visible.length} formula{visible.length !== 1 && "s"}
        </h2>
        <div className="text-xs text-slate-500">Sorted by importance</div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Sigma className="mx-auto mb-3 h-8 w-8 text-sky-400" />
            <p className="text-slate-600">No formulas match these filters yet. Admin can generate more from the Quant Formulas admin panel.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((f) => {
            const p = progress[f.id];
            const isDone = p?.status === "completed" || p?.status === "mastered";
            const isRevise = p?.status === "revise_later";
            const saved = !!p?.bookmarked;
            return (
              <Card key={f.id} className={cn("group relative flex h-full flex-col overflow-hidden border-slate-200 bg-white transition-all hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl", isDone && "opacity-90")}>
                <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 h-1", isDone ? "bg-emerald-400" : isRevise ? "bg-amber-400" : "bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500")} />
                <CardContent className="relative flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link to={`/formula/${f.slug}`} className="block">
                        <h3 className="font-heading text-xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-sky-700">{f.name}</h3>
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="border-sky-200 text-[10px] uppercase tracking-wide text-sky-700">{f.difficulty}</Badge>
                        {f.is_high_weightage && <Badge className="border-0 bg-amber-100 text-[10px] text-amber-800"><Star className="mr-0.5 h-2.5 w-2.5 fill-current" /> Important</Badge>}
                        {f.is_shortcut && <Badge className="border-0 bg-violet-100 text-[10px] text-violet-700">⚡ Shortcut</Badge>}
                        <Badge variant="secondary" className="bg-slate-100 text-[10px] capitalize text-slate-600">{f.topic_slug?.replace(/-/g, " ")}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 shadow-inner">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">Formula</span>
                    </div>
                    <MathExpression tex={f.expression_latex} plain={f.expression} className="block text-lg text-sky-50" />
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Explanation</div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">{f.explanation}</p>
                  </div>

                  {f.notes && (
                    <div className="mt-2 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">When to Use</div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-700">{f.notes}</p>
                    </div>
                  )}

                  {Array.isArray(f.examples) && f.examples[0]?.problem && (
                    <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Sample Usage</span>
                        {Array.isArray(f.examples) && f.examples.length > 1 && (
                          <span className="text-[10px] text-emerald-700/70">+{f.examples.length - 1} more</span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-700">{f.examples[0].problem}</p>
                      {f.examples[0].answer && (
                        <p className="mt-1 text-[11px] font-semibold text-emerald-800">Answer: {f.examples[0].answer}</p>
                      )}
                    </div>
                  )}

                  {Array.isArray(f.exam_tags) && f.exam_tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      <GraduationCap className="h-3 w-3 text-sky-600" />
                      {f.exam_tags.slice(0, 5).map((e: string) => (
                        <Badge key={e} className="border-0 bg-sky-100 text-[10px] text-sky-700 hover:bg-sky-100">{e}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <div className="flex gap-1.5">
                      <Button variant={saved ? "default" : "outline"} size="sm" className="h-8 gap-1 px-2 text-xs" disabled={busyId === f.id} onClick={() => toggleBookmark(f.id)}>
                        <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
                        {saved ? "Saved" : "Save"}
                      </Button>
                      <Button variant={isRevise ? "default" : "outline"} size="sm" className={cn("h-8 gap-1 px-2 text-xs", isRevise && "bg-amber-500 hover:bg-amber-600")} disabled={busyId === f.id} onClick={() => setStatus(f.id, isRevise ? "none" : "revise_later")}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        {isRevise ? "Marked" : "Revise"}
                      </Button>
                      <Button variant={isDone ? "secondary" : "default"} size="sm" className={cn("h-8 gap-1 px-2 text-xs", !isDone && "bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-95")} disabled={busyId === f.id || isDone} onClick={() => setStatus(f.id, "completed")}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isDone ? "Done" : "Complete"}
                      </Button>
                    </div>
                    <Link to={`/formula/${f.slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Layers({ s }: { s: any }) {
  return <ChevronRight className="h-4 w-4 text-violet-600" />;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
      active ? "border-transparent bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sm"
             : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700",
    )}>{children}</button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <Filter className="h-3 w-3" /> {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const TONE: Record<string, string> = {
  orange: "from-orange-500/20 to-amber-500/5 text-orange-700",
  emerald: "from-emerald-500/20 to-teal-500/5 text-emerald-700",
  sky: "from-sky-500/20 to-blue-500/5 text-sky-700",
  amber: "from-amber-500/20 to-orange-500/5 text-amber-700",
};

function Pill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: keyof typeof TONE }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-white/60 bg-gradient-to-br p-3 backdrop-blur", TONE[tone])}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-90">{icon} {label}</div>
      <div className="mt-1 font-heading text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function DropdownField({
  label, value, onChange, options, placeholder, icon, primary, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { k: string; l: string }[];
  placeholder?: string;
  icon?: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  const active = value && value !== "all";
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
        <span className={cn("inline-flex items-center justify-center rounded-md p-0.5", primary ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600")}>
          {icon}
        </span>
        {label}
        {primary && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700">Start here</span>}
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            "h-10 w-full border-2 bg-white text-sm font-semibold transition-all",
            primary
              ? "border-sky-400 ring-2 ring-sky-100 hover:border-sky-500"
              : active
                ? "border-sky-300 text-sky-700"
                : "border-slate-200 hover:border-sky-300",
            disabled && "opacity-60",
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => (
            <SelectItem key={o.k} value={o.k} className="text-sm">{o.l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
