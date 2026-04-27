import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarDays, Trash2, Save, Send } from "lucide-react";

export default function AdminDailyTests() {
  const [rows, setRows] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [testId, setTestId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from("daily_test_assignments")
        .select("id, assigned_date, title, note, test_id, test:mock_tests(name, exam_code, slug)")
        .order("assigned_date", { ascending: false })
        .limit(60),
      supabase.from("mock_tests")
        .select("id, name, exam_code, is_published")
        .eq("is_published", true)
        .order("created_at", { ascending: false }).limit(200),
    ]);
    setRows(a ?? []);
    setTests(t ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!date || !testId) return toast.error("Pick a date and a mock test");
    setSaving(true);
    const { error } = await supabase.from("daily_test_assignments").upsert({
      assigned_date: date, test_id: testId,
      title: title || null, note: note || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "assigned_date" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Daily test saved");
    setTitle(""); setNote("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this daily test?")) return;
    const { error } = await supabase.from("daily_test_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const notify = async (row: any) => {
    const { error } = await supabase.functions.invoke("daily-test-notify", { body: { date: row.assigned_date } });
    if (error) return toast.error(error.message);
    toast.success("Notifications sent to all students");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-sky-600" /> Daily Tests</h1>
        <p className="text-sm text-muted-foreground mt-1">Schedule one mock per day. All students see it on their dashboard and can be notified.</p>
      </div>

      <Card className="p-5">
        <div className="font-semibold mb-3">Schedule a daily test</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-muted-foreground">Mock test</label>
            <Select value={testId} onValueChange={setTestId}>
              <SelectTrigger><SelectValue placeholder="Pick a published mock" /></SelectTrigger>
              <SelectContent>
                {tests.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}{t.exam_code ? ` · ${t.exam_code}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Title (optional)</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Daily QA Sprint" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-xs text-muted-foreground">Note to students (optional)</label>
            <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Focus on RC accuracy today." />
          </div>
          <div className="flex items-end">
            <Button onClick={save} disabled={saving} className="w-full gap-2"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="font-semibold mb-3">Scheduled (last 60)</div>
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
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Mock</th>
                  <th className="py-2 pr-3">Exam</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const isToday = r.assigned_date === new Date().toISOString().slice(0,10);
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-sky-50/30">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(r.assigned_date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                        {isToday && <Badge className="ml-2 bg-sky-100 text-sky-700 border-0">Today</Badge>}
                      </td>
                      <td className="py-2 pr-3">{r.title || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 pr-3">{r.test?.name ?? "—"}</td>
                      <td className="py-2 pr-3">{r.test?.exam_code ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => notify(r)}><Send className="h-3 w-3" /> Notify</Button>
                          <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>
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
