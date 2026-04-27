import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EXAMS, DIFFICULTIES } from "@/data/personalizedExams";
import { Sparkles, AlertTriangle, Database, UserPlus, Trash2 } from "lucide-react";

export default function AdminPersonalizedHub() {
  const [counts, setCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [genExam, setGenExam] = useState("CAT");
  const [genSection, setGenSection] = useState("");
  const [genDifficulty, setGenDifficulty] = useState("moderate");
  const [genCount, setGenCount] = useState(15);
  const [genTopic, setGenTopic] = useState("");
  const [generating, setGenerating] = useState(false);

  const exam = useMemo(() => EXAMS.find((e) => e.code === genExam), [genExam]);
  useEffect(() => { setGenSection(exam?.sections[0] ?? ""); }, [genExam]);

  const loadCounts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("personalized_questions")
      .select("exam_code, section, difficulty");
    const map: Record<string, number> = {};
    (data ?? []).forEach((r) => {
      const k = `${r.exam_code}|${r.section}|${r.difficulty}`;
      map[k] = (map[k] ?? 0) + 1;
    });
    const rows: any[] = [];
    for (const e of EXAMS) {
      for (const s of e.sections) {
        for (const d of ["easy", "moderate", "difficult"]) {
          const k = `${e.code}|${s}|${d}`;
          rows.push({ exam: e.code, section: s, difficulty: d, count: map[k] ?? 0 });
        }
      }
    }
    setCounts(rows);
    setLoading(false);
  };

  useEffect(() => { loadCounts(); }, []);

  const generate = async () => {
    if (!genSection) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("personalized-questions-generate", {
        body: { exam_code: genExam, section: genSection, difficulty: genDifficulty, count: genCount, topic: genTopic || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Generated ${(data as any).inserted} questions`);
      loadCounts();
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const lowStock = counts.filter((c) => c.count < 10);
  const totalQ = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-5 w-5" />Personalized Mock Hub — Admin</h1>
        <p className="text-sm text-muted-foreground">Manage AI question bank and student access</p>
      </div>

      <Tabs defaultValue="bank">
        <TabsList>
          <TabsTrigger value="bank">Question Bank</TabsTrigger>
          <TabsTrigger value="generate">Bulk Generate</TabsTrigger>
          <TabsTrigger value="access">Access Grants</TabsTrigger>
        </TabsList>

        <TabsContent value="bank" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total Questions" value={totalQ} />
            <Stat label="Low Stock Categories" value={lowStock.length} tone={lowStock.length ? "bad" : "ok"} />
            <Stat label="Exams" value={EXAMS.length} />
            <Stat label="Sections" value={EXAMS.reduce((s, e) => s + e.sections.length, 0)} />
          </div>

          {lowStock.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-amber-900"><AlertTriangle className="h-4 w-4" />Categories needing more questions (&lt;10)</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {lowStock.map((c, i) => (
                  <Badge key={i} variant="outline" className="border-amber-300 text-amber-900">
                    {c.exam} · {c.section} · {c.difficulty} ({c.count})
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Counts by Category</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sky-50">
                  <tr><th className="p-2 text-left">Exam</th><th className="p-2 text-left">Section</th><th className="p-2 text-left">Difficulty</th><th className="p-2 text-right">Count</th></tr>
                </thead>
                <tbody>
                  {counts.map((c, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{c.exam}</td>
                      <td className="p-2">{c.section}</td>
                      <td className="p-2 capitalize">{c.difficulty}</td>
                      <td className={`p-2 text-right font-semibold ${c.count < 10 ? "text-amber-700" : "text-emerald-700"}`}>{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-sky-600" />AI Bulk Generate (gpt-4o)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Exam</Label>
                  <Select value={genExam} onValueChange={setGenExam}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXAMS.map((e) => <SelectItem key={e.code} value={e.code}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={genSection} onValueChange={setGenSection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{exam?.sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={genDifficulty} onValueChange={setGenDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIFFICULTIES.filter((d) => d.value !== "mixed").map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Number of Questions (max 25)</Label>
                  <Input type="number" min={1} max={25} value={genCount} onChange={(e) => setGenCount(parseInt(e.target.value) || 1)} />
                </div>
              </div>
              <div>
                <Label>Topic (optional)</Label>
                <Input placeholder="e.g. Permutations, Para-jumbles, Caselet DI" value={genTopic} onChange={(e) => setGenTopic(e.target.value)} />
              </div>
              <Button onClick={generate} disabled={generating} className="bg-sky-600 hover:bg-sky-700">
                {generating ? "Generating with AI…" : `Generate ${genCount} Questions`}
              </Button>
              <p className="text-xs text-muted-foreground">Tip: generate in batches of 10–25 for best quality. Repeat to fill low-stock categories.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <AccessManager />
        </TabsContent>
      </Tabs>
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

function AccessManager() {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [quota, setQuota] = useState(5);
  const [days, setDays] = useState(30);

  const load = async () => {
    const { data } = await supabase.from("personalized_hub_access").select("*").order("created_at", { ascending: false });
    setGrants(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const doSearch = async () => {
    const { data } = await supabase.rpc("admin_search_students", { _query: search, _limit: 20 });
    setStudents((data as any[]) ?? []);
  };

  const grant = async (uid: string) => {
    const expires = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const { error } = await supabase.from("personalized_hub_access").upsert({
      user_id: uid, daily_quota: quota, expires_at: expires, source: "admin",
    });
    if (error) toast.error(error.message); else { toast.success("Access granted"); load(); }
  };

  const revoke = async (uid: string) => {
    const { error } = await supabase.from("personalized_hub_access").delete().eq("user_id", uid);
    if (error) toast.error(error.message); else { toast.success("Access revoked"); load(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Grant Access</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Search by name, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
            <Button onClick={doSearch}>Search</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Daily Quota</Label>
              <Input type="number" min={1} value={quota} onChange={(e) => setQuota(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <Label>Validity (days, 0 = unlimited)</Label>
              <Input type="number" min={0} value={days} onChange={(e) => setDays(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-2">
            {students.map((s) => (
              <div key={s.user_id} className="flex items-center justify-between p-2 border rounded">
                <div className="text-sm">
                  <div className="font-medium">{s.display_name}</div>
                  <div className="text-xs text-muted-foreground">{s.email} · {s.phone}</div>
                </div>
                <Button size="sm" onClick={() => grant(s.user_id)}>Grant</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Grants ({grants.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-sky-50"><tr><th className="p-2 text-left">User</th><th className="p-2 text-left">Quota</th><th className="p-2 text-left">Expires</th><th className="p-2 text-left">Source</th><th className="p-2"></th></tr></thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.user_id} className="border-b">
                  <td className="p-2 font-mono text-xs">{g.user_id.slice(0, 8)}…</td>
                  <td className="p-2">{g.daily_quota}/day</td>
                  <td className="p-2">{g.expires_at ? new Date(g.expires_at).toLocaleDateString() : "Unlimited"}</td>
                  <td className="p-2">{g.source}</td>
                  <td className="p-2"><Button variant="ghost" size="sm" onClick={() => revoke(g.user_id)}><Trash2 className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
