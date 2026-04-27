import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EXAMS, DIFFICULTIES, getExam } from "@/data/personalizedExams";
import { Sparkles, Timer, ListChecks, TrendingUp, Lock, RefreshCcw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const QUESTION_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

export default function StudentPersonalizedHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [examCode, setExamCode] = useState("CAT");
  const [sections, setSections] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("mixed");
  const [numQuestions, setNumQuestions] = useState(15);
  const [creating, setCreating] = useState(false);
  const [access, setAccess] = useState<any>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  const exam = getExam(examCode);

  useEffect(() => { setSections(exam?.sections ?? []); }, [examCode]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: a } = await supabase.from("personalized_hub_access").select("*").eq("user_id", user.id).maybeSingle();
      setAccess(a);
      const { data: t } = await supabase.rpc("personalized_hub_today_count", { _user_id: user.id });
      setTodayCount((t as number) ?? 0);
      const { data: h } = await supabase
        .from("personalized_mock_attempts")
        .select("id, exam_code, sections, difficulty, num_questions, total_correct, total_wrong, total_unattempted, score, accuracy, status, created_at, submitted_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setHistory(h ?? []);
    })();
  }, [user]);

  const hasAccess = useMemo(() => {
    if (!access) return false;
    if (access.expires_at && new Date(access.expires_at) < new Date()) return false;
    return true;
  }, [access]);

  const remaining = access ? Math.max(0, access.daily_quota - todayCount) : 0;

  const submittedHistory = history.filter((h) => h.status === "submitted");
  const overall = useMemo(() => {
    if (!submittedHistory.length) return null;
    const totalQ = submittedHistory.reduce((s, h) => s + h.num_questions, 0);
    const totalC = submittedHistory.reduce((s, h) => s + (h.total_correct || 0), 0);
    const totalW = submittedHistory.reduce((s, h) => s + (h.total_wrong || 0), 0);
    const avgAcc = submittedHistory.reduce((s, h) => s + (h.accuracy || 0), 0) / submittedHistory.length;
    return { mocks: submittedHistory.length, totalQ, totalC, totalW, avgAcc: Math.round(avgAcc * 10) / 10 };
  }, [submittedHistory]);

  const trendData = [...submittedHistory].reverse().map((h, i) => ({
    name: `#${i + 1}`,
    accuracy: Math.round(h.accuracy || 0),
    score: h.score || 0,
  }));

  const toggleSection = (s: string) => {
    setSections((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const onGenerate = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!hasAccess) { toast.error("Your access is not active. Contact admin."); return; }
    if (remaining <= 0) { toast.error(`Daily quota reached (${access.daily_quota}/day).`); return; }
    if (!sections.length) { toast.error("Pick at least one section."); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("personalized-mock-create", {
        body: { exam_code: examCode, sections, difficulty, num_questions: numQuestions },
      });
      if (error) throw error;
      if ((data as any)?.error === "insufficient_questions") {
        toast.error(`Only ${(data as any).available} fresh questions available. Try fewer questions or different sections.`);
        return;
      }
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      const attemptId = (data as any).attempt.id;
      navigate(`/student/personalized-hub/attempt/${attemptId}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate mock");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-sky-600" />
        <h1 className="text-2xl font-bold">Personalized Mock Hub</h1>
      </div>

      {/* Overall report */}
      <Card className="border-sky-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-sky-600"/>Your Overall Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {overall ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Stat label="Mocks Taken" value={overall.mocks} />
              <Stat label="Avg Accuracy" value={`${overall.avgAcc}%`} />
              <Stat label="Questions Done" value={overall.totalQ} />
              <Stat label="Correct" value={overall.totalC} tone="ok" />
              <Stat label="Wrong" value={overall.totalW} tone="bad" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No mocks yet. Generate your first personalized mock below.</p>
          )}
          {trendData.length >= 2 && (
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="accuracy" stroke="#0284c7" strokeWidth={2} dot={false} name="Accuracy %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generator */}
      <Card className="border-sky-100">
        <CardHeader>
          <CardTitle className="text-base">Generate a New Mock</CardTitle>
          {access && (
            <p className="text-xs text-muted-foreground">
              {hasAccess ? `${remaining} of ${access.daily_quota} mocks left today` : "Access expired — contact admin"}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAccess && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm">
              <Lock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-amber-900">No active access</div>
                <div className="text-amber-800 text-xs mt-0.5">
                  Personalized Hub is unlocked when you purchase a course. <Link to="/mocks" className="underline">Browse plans</Link>.
                </div>
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Exam</Label>
              <Select value={examCode} onValueChange={setExamCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXAMS.map((e) => <SelectItem key={e.code} value={e.code}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Sections</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {exam?.sections.map((s) => (
                <label key={s} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${sections.includes(s) ? "bg-sky-50 border-sky-300 text-sky-800" : "border-gray-200"}`}>
                  <Checkbox checked={sections.includes(s)} onCheckedChange={() => toggleSection(s)} />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Number of Questions</Label>
              <Select value={String(numQuestions)} onValueChange={(v) => setNumQuestions(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration</Label>
              <div className="h-10 px-3 rounded-md border bg-sky-50/40 flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4 text-sky-600" />
                {numQuestions} minute{numQuestions === 1 ? "" : "s"} (auto-calculated)
              </div>
            </div>
          </div>

          <Button onClick={onGenerate} disabled={creating || !hasAccess} className="w-full bg-sky-600 hover:bg-sky-700">
            {creating ? "Generating…" : "Generate Mock"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="border-sky-100">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-sky-600" />Previous Mocks</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => location.reload()}><RefreshCcw className="h-3 w-3 mr-1" />Refresh</Button>
        </CardHeader>
        <CardContent>
          {!history.length ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-sky-100 hover:bg-sky-50/40 gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{h.exam_code} · {h.difficulty} · {h.num_questions}Q</div>
                    <div className="text-xs text-muted-foreground">{(h.sections || []).join(", ")} · {new Date(h.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.status === "submitted" ? (
                      <>
                        <Badge variant="secondary">{h.accuracy}% acc</Badge>
                        <Badge>{h.score} pts</Badge>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/student/personalized-hub/result/${h.id}`)}>View</Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => navigate(`/student/personalized-hub/attempt/${h.id}`)}>Resume</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "ok" | "bad" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-sky-700";
  return (
    <div className="p-3 rounded-lg border border-sky-100 bg-white">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
