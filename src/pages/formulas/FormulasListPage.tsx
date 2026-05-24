import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, Search, ChevronRight, Star, Sigma, BookOpen, Brain, Repeat, Sparkles, Zap } from "lucide-react";

export default function FormulasListPage() {
  const [formulas, setFormulas] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const topic = params.get("topic") || "all";

  useEffect(() => {
    document.title = "MBA Quant Formula Book — Free CAT, XAT, NMAT Formulas | MBA Compass";
    setMeta("description", "Browse free, AI-explained MBA quant formulas. CAT, XAT, NMAT shortcuts, derivations, examples and practice — search 500+ formulas in one place.");
    setLinkRel("canonical", `${window.location.origin}/formulas`);
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: t }] = await Promise.all([
        supabase.from("quant_formulas").select("slug,name,topic_slug,difficulty,importance,is_high_weightage,is_shortcut,exam_tags,explanation").eq("published", true).order("importance", { ascending: false }).limit(500),
        supabase.from("quant_topics").select("*").order("sort_order"),
      ]);
      setFormulas(f || []);
      setTopics(t || []);
    })();
  }, []);

  const visible = useMemo(() => {
    const ql = q.toLowerCase();
    return formulas.filter((f) => {
      if (topic !== "all" && f.topic_slug !== topic) return false;
      if (ql && !`${f.name} ${f.explanation}`.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [formulas, q, topic]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-20 md:p-6">
      <header className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/80 to-blue-50/60 p-6 md:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #0ea5e9 1px, transparent 0)", backgroundSize: "24px 24px" }} />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-700 shadow-sm backdrop-blur">
            <Sparkles className="h-3 w-3" /> The Only Formula Book You Need
          </div>

          <h1 className="font-heading mt-3 text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
            MBA Quant <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Formula Book</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-700 md:text-base">
            Your last-mile companion for CAT, XAT, NMAT, SNAP &amp; IIFT — 500+ exam-relevant formulas with deep explanations, shortcuts, derivations and worked examples. Built by faculty, refined with AI.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              { icon: BookOpen, label: "Know", desc: "Every must-know formula in one place" },
              { icon: Brain, label: "Learn", desc: "Intuition, derivation & usage notes" },
              { icon: Repeat, label: "Revise", desc: "Quick-recall cards before D-day" },
            ].map((p) => (
              <div key={p.label} className="flex items-center gap-3 rounded-xl border border-sky-100 bg-white/70 px-3 py-2 backdrop-blur">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                  <p.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">{p.label}</div>
                  <div className="text-[11px] leading-tight text-slate-600">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-5">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search any formula, concept or topic…"
              value={q}
              onChange={(e) => { const p = new URLSearchParams(params); e.target.value ? p.set("q", e.target.value) : p.delete("q"); setParams(p); }}
              className="h-12 rounded-xl border-sky-200 bg-white/90 pl-10 pr-4 text-sm shadow-sm backdrop-blur focus-visible:ring-sky-400"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 md:inline-flex">
              <Zap className="h-3 w-3" /> {formulas.length}+ formulas
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <button onClick={() => { const p = new URLSearchParams(params); p.delete("topic"); setParams(p); }} className={`rounded-full px-3 py-1 text-xs font-medium transition ${topic === "all" ? "bg-sky-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-sky-300"}`}>All topics</button>
            {topics.filter((t) => !t.parent_slug).map((t) => (
              <button key={t.slug} onClick={() => { const p = new URLSearchParams(params); p.set("topic", t.slug); setParams(p); }} className={`rounded-full px-3 py-1 text-xs font-medium transition ${topic === t.slug ? "bg-sky-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-sky-300"}`}>{t.name}</button>
            ))}
          </div>
        </div>
      </header>

      <p className="text-sm text-slate-600">Showing {visible.length} formulas</p>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((f) => (
          <Link key={f.slug} to={`/formula/${f.slug}`} className="group block rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <Sigma className="mt-0.5 h-4 w-4 text-sky-600" />
              {f.is_high_weightage && <Badge className="border-0 bg-amber-100 text-[10px] text-amber-800"><Star className="mr-0.5 h-2.5 w-2.5 fill-current" />Important</Badge>}
            </div>
            <div className="mt-1 line-clamp-2 font-heading text-base font-bold text-slate-900 group-hover:text-sky-700">{f.name}</div>
            <div className="mt-1 line-clamp-2 text-xs text-slate-600">{f.explanation}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <Badge variant="outline" className="border-sky-200 text-[10px] text-sky-700">{f.difficulty}</Badge>
              {(f.exam_tags || []).slice(0, 3).map((e: string) => <Badge key={e} className="border-0 bg-sky-50 text-[10px] text-sky-700">{e}</Badge>)}
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700">Open <ChevronRight className="h-3 w-3" /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function setMeta(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
  el.content = content;
}
function setLinkRel(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
}
