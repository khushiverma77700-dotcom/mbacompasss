import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { differenceInDays, parseISO, isValid } from "date-fns";
import { CalendarClock, Save, Search, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { slugify } from "@/lib/slugify";

type ExamRow = {
  id: string;
  name: string;
  slug: string | null;
  exam_date: string | null;
  registration_deadline: string | null;
};

const toIsoDate = (s: string | null) => {
  if (!s) return "";
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
  const [addOpen, setAddOpen] = useState(false);
  const [newExam, setNewExam] = useState({ name: "", slug: "", exam_date: "", registration_deadline: "" });
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<ExamRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exams")
      .select("id, name, slug, exam_date, registration_deadline");
    if (error) {
      toast({ title: "Failed to load exams", description: error.message, variant: "destructive" });
    } else {
      const cleaned = (data || []).filter((r: any) => r.name?.trim());
      // Sort ascending by exam_date (upcoming first, past last, undated last)
      const now = Date.now();
      cleaned.sort((a: any, b: any) => {
        const da = toIsoDate(a.exam_date);
        const db = toIsoDate(b.exam_date);
        const ta = da ? new Date(da).getTime() : null;
        const tb = db ? new Date(db).getTime() : null;
        const aFuture = ta !== null && ta >= now - 86400000;
        const bFuture = tb !== null && tb >= now - 86400000;
        if (aFuture && bFuture) return ta! - tb!;
        if (aFuture) return -1;
        if (bFuture) return 1;
        if (ta !== null && tb !== null) return ta - tb;
        if (ta !== null) return -1;
        if (tb !== null) return 1;
        return a.name.localeCompare(b.name);
      });
      setRows(cleaned);
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

  const addExam = async () => {
    if (!newExam.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setAdding(true);
    const slug = (newExam.slug || slugify(newExam.name)).trim();
    const { error } = await supabase.from("exams").insert({
      name: newExam.name.trim(),
      slug,
      exam_date: newExam.exam_date || null,
      registration_deadline: newExam.registration_deadline || null,
    });
    setAdding(false);
    if (error) {
      toast({ title: "Add failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Exam added", description: newExam.name });
    setAddOpen(false);
    setNewExam({ name: "", slug: "", exam_date: "", registration_deadline: "" });
    load();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("exams").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted", description: `${toDelete.name} removed.` });
    setToDelete(null);
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
            Set exam date and registration deadline. Sorted by nearest upcoming exam. Countdowns auto-calculate.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exam by name or slug"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Exam
          </Button>
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
                  <div className="flex justify-between items-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setToDelete(row)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
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

      {/* Add Exam Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Exam name *</Label>
              <Input
                placeholder="e.g. CAT 2026"
                value={newExam.name}
                onChange={(e) => setNewExam((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Slug (optional — auto-generated)</Label>
              <Input
                placeholder="cat-2026"
                value={newExam.slug}
                onChange={(e) => setNewExam((p) => ({ ...p, slug: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Exam date</Label>
                <Input
                  type="date"
                  value={newExam.exam_date}
                  onChange={(e) => setNewExam((p) => ({ ...p, exam_date: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Registration deadline</Label>
                <Input
                  type="date"
                  value={newExam.registration_deadline}
                  onChange={(e) => setNewExam((p) => ({ ...p, registration_deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={addExam} disabled={adding}>
              {adding ? "Adding…" : "Add Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <b>{toDelete?.name}</b> from the database. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
