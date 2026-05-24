import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarDays, Trash2, Save, Send, Search, X } from "lucide-react";

type Mock = {
  id: string;
  name: string;
  exam_code: string | null;
  test_type: string | null;
  category: string | null;
  difficulty: string | null;
};

type Assignment = {
  id: string;
  assigned_date: string;
  title: string | null;
  note: string | null;
  test_id: string;
  test?: { name: string; exam_code: string | null; slug: string };
};

const ANY = "__any__";

export default function AdminDailyTests() {
  const [tests, setTests] = useState<Mock[]>([]);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [exam, setExam] = useState<string>(ANY);
  const [type, setType] = useState<string>(ANY);
  const [category, setCategory] = useState<string>(ANY);
  const [difficulty, setDifficulty] = useState<string>(ANY);

  // Inline per-mock date drafts
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from("daily_test_assignments")
        .select("id, assigned_date, title, note, test_id, test:mock_tests(name, exam_code, slug)")
        .order("assigned_date", { ascending: false })
        .limit(200),
      supabase.from("mock_tests")
        .select("id, name, exam_code, test_type, category, difficulty, is_published")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    setRows((a ?? []) as Assignment[]);
    setTests((t ?? []) as Mock[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Map: test_id -> latest assignment date
  const scheduledByTest = useMemo(() => {
    const m: Record<string, Assignment> = {};
    for (const r of rows) {
      if (!m[r.test_id] || r.assigned_date > m[r.test_id].assigned_date) m[r.test_id] = r;
    }
    return m;
  }, [rows]);

  const examOptions = useMemo(() => Array.from(new Set(tests.map(t => t.exam_code).filter(Boolean))) as string[], [tests]);
  const typeOptions = useMemo(() => Array.from(new Set(tests.map(t => t.test_type).filter(Boolean))) as string[], [tests]);
  const catOptions = useMemo(() => Array.from(new Set(tests.map(t => t.category).filter(Boolean))) as string[], [tests]);
  const diffOptions = useMemo(() => Array.from(new Set(tests.map(t => t.difficulty).filter(Boolean))) as string[], [tests]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tests.filter(t => {
      if (exam !== ANY && t.exam_code !== exam) return false;
      if (type !== ANY && t.test_type !== type) return false;
      if (category !== ANY && t.category !== category) return false;
      if (difficulty !== ANY && t.difficulty !== difficulty) return false;
      if (needle && !t.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [tests, q, exam, type, category, difficulty]);

  const clearFilters = () => {
    setQ(""); setExam(ANY); setType(ANY); setCategory(ANY); setDifficulty(ANY);
  };

  const scheduleMock = async (testId: string) => {
    const existing = scheduledByTest[testId];
    const date = drafts[testId] ?? existing?.assigned_date ?? new Date().toISOString().slice(0, 10);
    if (!date) return toast.error("Pick a date");
    setSaving(testId);
    const { error } = await supabase.from("daily_test_assignments").upsert({
      assigned_date: date,
      test_id: testId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "assigned_date" });
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`Scheduled for ${date}`);
    setDrafts(d => { const n = { ...d }; delete n[testId]; return n; });
    load();
  };

  const unscheduleMock = async (testId: string) => {
    const existing = scheduledByTest[testId];
    if (!existing) return;
    if (!confirm(`Remove schedule on ${existing.assigned_date}?`)) return;
    const { error } = await supabase.from("daily_test_assignments").delete().eq("id", existing.id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const removeAssignment = async (id: string) => {
    if (!confirm("Remove this daily test?")) return;
    const { error } = await supabase.from("daily_test_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const notify = async (date: string) => {
    const { error } = await supabase.functions.invoke("daily-test-notify", { body: { date } });
    if (error) return toast.error(error.message);
    toast.success("Notifications sent to all students");
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-sky-600" /> Daily Tests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Filter mocks, then schedule a date directly from the list. One mock per day.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Filter mocks</div>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search mock by name…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={exam} onValueChange={setExam}>
            <SelectTrigger><SelectValue placeholder="Exam" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All exams</SelectItem>
              {examOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All types</SelectItem>
              {typeOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All categories</SelectItem>
              {catOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All difficulty</SelectItem>
              {diffOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">Showing {filtered.length} of {tests.length} mocks</div>
      </Card>

      {/* Inline scheduler */}
      <Card className="p-5">
        <div className="font-semibold mb-3">Schedule inline</div>
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No mocks match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-3">Mock</th>
                  <th className="py-2 pr-3">Exam</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Current date</th>
                  <th className="py-2 pr-3">Set date</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const existing = scheduledByTest[t.id];
                  const draft = drafts[t.id] ?? existing?.assigned_date ?? "";
                  const dirty = !!drafts[t.id] && drafts[t.id] !== existing?.assigned_date;
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-sky-50/30">
                      <td className="py-2 pr-3 max-w-[320px]">
                        <div className="font-medium truncate">{t.name}</div>
                        {t.category && <div className="text-xs text-muted-foreground">{t.category}</div>}
                      </td>
                      <td className="py-2 pr-3">{t.exam_code ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs">{t.test_type ?? "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {existing ? (
                          <Badge className={`border-0 ${existing.assigned_date === today ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {existing.assigned_date}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="date"
                          value={draft}
                          onChange={e => setDrafts(d => ({ ...d, [t.id]: e.target.value }))}
                          className="h-8 w-[150px]"
                        />
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => scheduleMock(t.id)}
                            disabled={saving === t.id || !draft}
                            variant={dirty || !existing ? "default" : "outline"}
                          >
                            <Save className="h-3 w-3" /> {existing ? "Update" : "Schedule"}
                          </Button>
                          {existing && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => notify(existing.assigned_date)}>
                                <Send className="h-3 w-3" /> Notify
                              </Button>
                              <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => unscheduleMock(t.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* All scheduled history */}
      <Card className="p-5">
        <div className="font-semibold mb-3">All scheduled ({rows.length})</div>
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No daily tests scheduled yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Mock</th>
                  <th className="py-2 pr-3">Exam</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const isToday = r.assigned_date === today;
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-sky-50/30">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {r.assigned_date}
                        {isToday && <Badge className="ml-2 bg-sky-100 text-sky-700 border-0">Today</Badge>}
                      </td>
                      <td className="py-2 pr-3">{r.test?.name ?? "—"}</td>
                      <td className="py-2 pr-3">{r.test?.exam_code ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => notify(r.assigned_date)}>
                            <Send className="h-3 w-3" /> Notify
                          </Button>
                          <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => removeAssignment(r.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
