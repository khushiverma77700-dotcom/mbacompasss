import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, Search, ChevronRight, Star, Sigma } from "lucide-react";

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
      <header className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/60 to-blue-50/40 p-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700">
          <Calculator className="h-3 w-3" /> Free Quant Formula Book
        </div>
        <h1 className="font-heading mt-2 text-3xl font-bold text-slate-900">MBA Quant Formula Book — CAT, XAT, NMAT</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-700">
          500+ exam-relevant formulas with explanations, shortcuts, derivations and AI assistance. Created for MBA Compass students.
        </p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search any formula or concept…" value={q} onChange={(e) => { const p = new URLSearchParams(params); e.target.value ? p.set("q", e.target.value) : p.delete("q"); setParams(p); }} className="h-11 pl-9" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button onClick={() => { const p = new URLSearchParams(params); p.delete("topic"); setParams(p); }} className={`rounded-full px-3 py-1 text-xs font-medium ${topic === "all" ? "bg-sky-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>All topics</button>
          {topics.filter((t) => !t.parent_slug).map((t) => (
            <button key={t.slug} onClick={() => { const p = new URLSearchParams(params); p.set("topic", t.slug); setParams(p); }} className={`rounded-full px-3 py-1 text-xs font-medium ${topic === t.slug ? "bg-sky-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-sky-300"}`}>{t.name}</button>
          ))}
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
