import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { differenceInDays, parseISO, isValid } from "date-fns";
import { CalendarClock, Save, Search } from "lucide-react";

type ExamRow = {
  id: string;
  name: string;
  slug: string | null;
  exam_date: string | null;
  registration_deadline: string | null;
};

const toIsoDate = (s: string | null) => {
  if (!s) return "";
  // accept yyyy-mm-dd directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isValid(d) ? d.toISOString().slice(0, 10) : "";
};

const daysLeft = (s: string | null) => {
  if (!s) return null;
  const iso = toIsoDate(s);
  if (!iso) return null;
  const d = parseISO(iso);
  if (!isValid(d)) return null;
  return differenceInDays(d, new Date());
};

export default function AdminExamCountdowns() {
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [edits, setEdits] = useState<Record<string, Partial<ExamRow>>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exams")
      .select("id, name, slug, exam_date, registration_deadline")
      .order("name");
    if (error) {
      toast({ title: "Failed to load exams", description: error.message, variant: "destructive" });
    } else {
      setRows((data || []).filter((r: any) => r.name?.trim()));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(t) || (r.slug || "").toLowerCase().includes(t));
  }, [rows, q]);

  const setEdit = (id: string, patch: Partial<ExamRow>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const save = async (row: ExamRow) => {
    const patch = edits[row.id];
    if (!patch) return;
    setSaving(row.id);
    const { error } = await supabase
      .from("exams")
      .update({
        exam_date: patch.exam_date ?? row.exam_date,
        registration_deadline: patch.registration_deadline ?? row.registration_deadline,
      })
      .eq("id", row.id);
    setSaving(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: `${row.name} countdown updated.` });
    setEdits((prev) => {
      const { [row.id]: _, ...rest } = prev;
      return rest;
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" /> Exam Countdowns
          </h1>
          <p className="text-sm text-muted-foreground">
            Set exam date and registration deadline. Countdowns on the site auto-calculate from these values.
          </p>
        </div>
        <div className="relative w-72 max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exam by name or slug"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading exams…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No exams found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((row) => {
            const patch = edits[row.id] || {};
            const examDate = patch.exam_date ?? toIsoDate(row.exam_date);
            const regDl = patch.registration_deadline ?? toIsoDate(row.registration_deadline);
            const d = daysLeft(examDate || row.exam_date);
            const dirty = !!edits[row.id];
            return (
              <Card key={row.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span className="truncate">{row.name}</span>
                    {d !== null && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          d < 0
                            ? "bg-muted text-muted-foreground"
                            : d <= 30
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {d < 0 ? "Past" : `${d} days left`}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Exam date</Label>
                      <Input
                        type="date"
                        value={examDate}
                        onChange={(e) => setEdit(row.id, { exam_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Registration deadline</Label>
                      <Input
                        type="date"
                        value={regDl}
                        onChange={(e) => setEdit(row.id, { registration_deadline: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!dirty || saving === row.id} onClick={() => save(row)}>
                      <Save className="h-4 w-4 mr-1" />
                      {saving === row.id ? "Saving…" : "Save"}
                    </Button>
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
