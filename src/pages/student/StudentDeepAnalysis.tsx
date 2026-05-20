import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertTriangle, Lightbulb, TrendingDown, Target, Clock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ensureStudentMode, mockResultPath } from "@/lib/studentModeNav";

export default function StudentDeepAnalysis() {
  const { attemptId } = useParams();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!user || !attemptId) return;
    const { data } = await supabase.from("mock_ai_deep_analyses").select("*").eq("attempt_id", attemptId).maybeSingle();
    setAnalysis(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user, attemptId]);

  const generate = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("student-mock-deep-analysis", { body: { attempt_id: attemptId } });
    setGenerating(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Failed");
    setAnalysis(data.analysis);
    toast.success("AI analysis ready");
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  if (!analysis) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="h-6 w-6 text-sky-600" /> AI Deep Analysis</h1>
        <Card className="p-10 text-center border-sky-100 bg-gradient-to-br from-sky-50/60 to-white">
          <Sparkles className="h-12 w-12 mx-auto text-sky-500 mb-3" />
          <div className="text-lg font-semibold">Generate your personalised AI report</div>
          <div className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Get a per-question style breakdown of why you lost marks, mistake patterns, topic-wise focus, and your next 3 actions.</div>
          <Button onClick={generate} disabled={generating} className="mt-5 bg-sky-600 hover:bg-sky-700">
            {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Analysing…</> : <>Generate analysis <ArrowRight className="h-4 w-4 ml-1" /></>}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="h-6 w-6 text-sky-600" /> AI Deep Analysis</h1>
        <Link to={mockResultPath(attemptId ?? "")} onClick={ensureStudentMode} onPointerDown={ensureStudentMode} className="text-sm text-sky-700 hover:underline">View score report →</Link>
      </div>

      {analysis.summary && (
        <Card className="p-5 border-sky-100 bg-gradient-to-br from-sky-50/60 to-white">
          <div className="text-xs text-sky-700 uppercase font-semibold mb-1">Summary</div>
          <div className="text-gray-900">{analysis.summary}</div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Why you lost marks" icon={<TrendingDown className="h-4 w-4 text-rose-500" />}>
          {(analysis.why_lost_marks ?? []).map((w: any, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-rose-50/50 border border-rose-100">
              <div className="flex justify-between items-start gap-2">
                <div className="text-sm font-medium text-gray-900">{w.reason}</div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${w.impact === "high" ? "bg-rose-200 text-rose-800" : w.impact === "medium" ? "bg-amber-200 text-amber-800" : "bg-gray-200 text-gray-700"}`}>{w.impact}</span>
              </div>
              {w.marks_lost != null && <div className="text-xs text-muted-foreground mt-1">~{w.marks_lost} marks lost</div>}
            </div>
          ))}
        </Section>

        <Section title="Recommendations" icon={<Lightbulb className="h-4 w-4 text-amber-500" />}>
          {(analysis.recommendations ?? []).map((r: any, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
              <div className="font-medium text-gray-900 text-sm">{r.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.detail}</div>
            </div>
          ))}
        </Section>

        <Section title="Mistake patterns" icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}>
          {(analysis.mistake_patterns ?? []).map((p: any, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-orange-50/50 border border-orange-100 text-sm">
              <div className="font-medium text-gray-900">{p.pattern}</div>
              <div className="text-xs text-muted-foreground capitalize">{p.frequency}</div>
            </div>
          ))}
        </Section>

        <Section title="Topic focus" icon={<Target className="h-4 w-4 text-purple-500" />}>
          {(analysis.topic_focus ?? []).map((t: any, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-purple-50/50 border border-purple-100">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900 text-sm">{t.topic}</div>
                <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">{t.section}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t.action}</div>
            </div>
          ))}
        </Section>
      </div>

      {analysis.time_insights && Object.keys(analysis.time_insights).length > 0 && (
        <Card className="p-5 border-sky-100">
          <div className="font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-sky-600" /> Time insights</div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {Object.entries(analysis.time_insights).map(([k, v]) => (
              <div key={k} className="p-3 rounded-lg bg-sky-50/40 border border-sky-100">
                <div className="text-xs text-sky-700 capitalize">{k.replace(/_/g, " ")}</div>
                <div className="text-gray-900 mt-1">{String(v)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analysis.next_steps?.length > 0 && (
        <Card className="p-5 border-sky-100 bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="font-semibold mb-3 text-emerald-800">Your next 3 steps</div>
          <ol className="space-y-2 list-decimal list-inside text-sm text-gray-900">
            {analysis.next_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ol>
        </Card>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-4 border-sky-100">
      <div className="font-semibold mb-3 flex items-center gap-2 text-gray-900">{icon} {title}</div>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}
