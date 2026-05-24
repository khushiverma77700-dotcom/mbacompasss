import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BookmarkCheck, CheckCircle2, RotateCcw, Sparkles, Wand2, Star, GraduationCap, Calculator, ChevronRight, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MathExpression } from "@/components/formulas/MathExpression";
import { MathInlineText } from "@/components/formulas/MathInlineText";
import DOMPurify from "isomorphic-dompurify";

export default function FormulaDetailPage() {
  const { slug } = useParams();
  const location = useLocation();
  const inStudent = location.pathname.startsWith("/student");
  const listPath = inStudent ? "/student/formulas" : "/formulas";
  const detailBase = inStudent ? "/student/formula" : "/formula";
  const { user } = useAuth();
  const { toast } = useToast();
  const [formula, setFormula] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiText, setAiText] = useState<string>("");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data: f } = await supabase.from("quant_formulas").select("*").eq("slug", slug).maybeSingle();
      setFormula(f);
      if (f) {
        const { data: rel } = await supabase
          .from("quant_formulas").select("slug,name,topic_slug,difficulty,importance,is_high_weightage")
          .eq("topic_slug", f.topic_slug).neq("slug", f.slug).eq("published", true)
          .order("importance", { ascending: false }).limit(6);
        setRelated(rel || []);
        if (user) {
          const { data: p } = await supabase.from("quant_formula_progress")
            .select("*").eq("user_id", user.id).eq("formula_id", f.id).maybeSingle();
          setProgress(p);
        }
      }
      setLoading(false);
    })();
  }, [slug, user]);

  useEffect(() => {
    if (!formula) return;
    document.title = formula.seo_title || `${formula.name} — Formula, Examples & Shortcuts | MBA Compass`;
    const desc = (formula.seo_description || formula.explanation || "").slice(0, 160);
    setMeta("description", desc);
    setMeta("og:title", formula.seo_title || formula.name, true);
    setMeta("og:description", desc, true);
    setMeta("og:type", "article", true);
    const url = `${window.location.origin}/formula/${formula.slug}`;
    setLinkRel("canonical", url);

    // JSON-LD HowTo + FAQPage
    const howTo: any = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: formula.name,
      description: formula.explanation,
      step: (formula.examples || []).slice(0, 3).map((ex: any, i: number) => ({
        "@type": "HowToStep", position: i + 1, name: ex.problem, text: (ex.steps || []).join(" "),
      })),
    };
    const faqs = (formula.faqs || []).map((f: any) => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    }));
    const ldHow = document.getElementById("ld-formula-howto") as HTMLScriptElement | null;
    const ldFaq = document.getElementById("ld-formula-faq") as HTMLScriptElement | null;
    [ldHow, ldFaq].forEach((s) => s?.remove());
    if (howTo.step?.length) {
      const s = document.createElement("script");
      s.type = "application/ld+json"; s.id = "ld-formula-howto"; s.text = JSON.stringify(howTo);
      document.head.appendChild(s);
    }
    if (faqs.length) {
      const s = document.createElement("script");
      s.type = "application/ld+json"; s.id = "ld-formula-faq";
      s.text = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs });
      document.head.appendChild(s);
    }
  }, [formula]);

  const runAi = async (mode: "explain_simpler" | "derive" | "shortcut" | "worked_example") => {
    if (!formula) return;
    setAiBusy(mode); setAiText("");
    try {
      const { data, error } = await supabase.functions.invoke("formula-ai-assist", {
        body: { formula_id: formula.id, mode },
      });
      if (error) throw error;
      setAiText(data?.text || "No response");
    } catch (e: any) {
      toast({ title: "AI assist failed", description: e.message, variant: "destructive" });
    } finally { setAiBusy(null); }
  };

  const upsertProgress = async (patch: any) => {
    if (!user || !formula) { toast({ title: "Sign in to save progress" }); return; }
    const next = { user_id: user.id, formula_id: formula.id, status: progress?.status || "none", bookmarked: progress?.bookmarked || false, ...patch };
    await supabase.from("quant_formula_progress").upsert(next, { onConflict: "user_id,formula_id" });
    setProgress(next);
    if (patch.status === "completed") {
      await supabase.rpc("award_quant_xp", { _xp: 8, _activity_today: true });
      toast({ title: "+8 XP", description: "Formula completed" });
    } else {
      toast({ title: "Saved" });
    }
  };

  const sanitizedAi = useMemo(() => DOMPurify.sanitize(aiText.replace(/\n/g, "<br/>")), [aiText]);

  if (loading) return <div className="mx-auto max-w-5xl p-6"><div className="h-64 animate-pulse rounded-2xl bg-slate-100" /></div>;
  if (!formula) return (
    <div className="mx-auto max-w-3xl p-10 text-center">
      <h1 className="font-heading text-2xl font-bold">Formula not found</h1>
      <Link to={listPath} className="mt-3 inline-block text-sky-600 underline">Browse formula book</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20 md:p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-slate-500">
        <Link to="/" className="hover:text-sky-600">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/formulas" className="hover:text-sky-600">Quant Formulas</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/formulas?topic=${formula.topic_slug}`} className="capitalize hover:text-sky-600">{formula.topic_slug?.replace(/-/g, " ")}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-slate-800">{formula.name}</span>
      </nav>

      {/* Hero */}
      <Card className="overflow-hidden border-sky-100">
        <div className="relative bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700">
                <Calculator className="h-3 w-3" /> {formula.topic_slug?.replace(/-/g, " ")}
              </div>
              <h1 className="font-heading mt-2 text-3xl font-bold text-slate-900">{formula.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="border-sky-200 text-sky-700">{formula.difficulty}</Badge>
                {formula.is_high_weightage && <Badge className="border-0 bg-amber-100 text-amber-800"><Star className="mr-0.5 h-3 w-3 fill-current" /> High weightage</Badge>}
                {formula.is_shortcut && <Badge className="border-0 bg-violet-100 text-violet-700">⚡ Shortcut</Badge>}
                {(formula.exam_tags || []).map((e: string) => (
                  <Badge key={e} className="border-0 bg-sky-100 text-sky-700 hover:bg-sky-100"><GraduationCap className="mr-0.5 h-3 w-3" />{e}</Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={progress?.bookmarked ? "default" : "outline"} size="sm" onClick={() => upsertProgress({ bookmarked: !progress?.bookmarked })}>
                <BookmarkCheck className="mr-1 h-4 w-4" /> {progress?.bookmarked ? "Saved" : "Save"}
              </Button>
              <Button variant={progress?.status === "revise_later" ? "default" : "outline"} size="sm" onClick={() => upsertProgress({ status: progress?.status === "revise_later" ? "none" : "revise_later" })}>
                <RotateCcw className="mr-1 h-4 w-4" /> Revise later
              </Button>
              <Button size="sm" disabled={progress?.status === "completed"} onClick={() => upsertProgress({ status: "completed", last_revised_at: new Date().toISOString() })} className="bg-gradient-to-r from-sky-600 to-blue-600">
                <CheckCircle2 className="mr-1 h-4 w-4" /> {progress?.status === "completed" ? "Completed" : "Mark complete"}
              </Button>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-slate-900/95 p-5 ring-1 ring-slate-800">
            <MathExpression tex={formula.expression_latex} plain={formula.expression} className="text-2xl text-sky-100" />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="explain" className="space-y-4">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="explain">Explanation</TabsTrigger>
          <TabsTrigger value="derive">Derivation</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
          <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
          <TabsTrigger value="ai">AI Assist</TabsTrigger>
        </TabsList>

        <TabsContent value="explain">
          <Card><CardContent className="p-6"><MathInlineText as="div" text={formula.explanation} className="leading-relaxed text-slate-700" /></CardContent></Card>
        </TabsContent>

        <TabsContent value="derive">
          <Card><CardContent className="p-6"><MathInlineText as="div" text={formula.derivation || "Derivation not provided — use AI Assist → Derive step."} className="whitespace-pre-line leading-relaxed text-slate-700" /></CardContent></Card>
        </TabsContent>

        <TabsContent value="examples">
          <div className="space-y-3">
            {(formula.examples || []).length === 0 && (
              <Card><CardContent className="p-6 text-sm text-slate-500">No examples yet. Try AI Assist → Worked example.</CardContent></Card>
            )}
            {(formula.examples || []).map((ex: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-sky-700">Example {i + 1}</div>
                  <MathInlineText as="p" text={ex.problem} className="mt-1 font-medium text-slate-900" />
                  <ol className="ml-5 mt-3 list-decimal space-y-1 text-sm text-slate-700">
                    {(ex.steps || []).map((s: string, j: number) => <MathInlineText as="li" key={j} text={s} />)}
                  </ol>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                    Answer: <MathInlineText text={String(ex.answer ?? "")} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shortcuts">
          <Card>
            <CardContent className="p-6">
              {(formula.shortcuts || []).length === 0 ? (
                <p className="text-sm text-slate-500">No shortcuts listed.</p>
              ) : (
                <ul className="space-y-2">
                  {(formula.shortcuts || []).map((s: string, i: number) => (
                    <li key={i} className="flex gap-2 rounded-lg bg-violet-50 p-3 text-sm text-slate-800"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> {s}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mistakes">
          <Card>
            <CardContent className="p-6">
              {(formula.common_mistakes || []).length === 0 ? (
                <p className="text-sm text-slate-500">No common mistakes listed.</p>
              ) : (
                <ul className="space-y-2">
                  {(formula.common_mistakes || []).map((m: string, i: number) => (
                    <li key={i} className="flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-slate-800">⚠️ {m}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={aiBusy !== null} onClick={() => runAi("explain_simpler")}><Wand2 className="mr-1 h-3.5 w-3.5" /> Explain simpler</Button>
                <Button size="sm" variant="outline" disabled={aiBusy !== null} onClick={() => runAi("derive")}>Derive step-by-step</Button>
                <Button size="sm" variant="outline" disabled={aiBusy !== null} onClick={() => runAi("shortcut")}>Shortcut tip</Button>
                <Button size="sm" variant="outline" disabled={aiBusy !== null} onClick={() => runAi("worked_example")}>Worked example</Button>
              </div>
              {aiBusy && <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">AI thinking… ({aiBusy.replace("_", " ")})</div>}
              {aiText && <div className="prose prose-sm max-w-none rounded-xl border border-sky-100 bg-sky-50/40 p-4" dangerouslySetInnerHTML={{ __html: sanitizedAi }} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FAQs */}
      {(formula.faqs || []).length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">FAQs</h2>
            {(formula.faqs || []).map((f: any, i: number) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-900">{f.q}</div>
                <div className="mt-1 text-sm text-slate-700">{f.a}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div>
          <h2 className="font-heading mb-3 text-xl font-bold text-slate-900">Related formulas</h2>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} to={`/formula/${r.slug}`} className="group rounded-xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
                <div className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-sky-700">{r.name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                  <BookOpen className="h-3 w-3" /> {r.difficulty}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function setMeta(name: string, content: string, og = false) {
  if (!content) return;
  const attr = og ? "property" : "name";
  let el = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setLinkRel(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
}
