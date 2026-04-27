import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudentGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", goal_type: "weekly", target_value: 5, unit: "mocks", due_date: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("student_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setGoals(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("student_goals").insert({
      user_id: user.id,
      title: form.title.trim(),
      goal_type: form.goal_type,
      target_value: form.target_value,
      unit: form.unit,
      due_date: form.due_date || null,
    });
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setForm({ title: "", goal_type: "weekly", target_value: 5, unit: "mocks", due_date: "" });
    toast({ title: "Goal added" });
    load();
  };

  const updateProgress = async (id: string, current_value: number) => {
    await supabase.from("student_goals").update({ current_value }).eq("id", id);
    load();
  };

  const complete = async (id: string) => {
    await supabase.from("student_goals").update({ is_completed: true }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("student_goals").delete().eq("id", id);
    load();
  };

  const active = goals.filter((g) => !g.is_completed);
  const done = goals.filter((g) => g.is_completed);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Goals & Study Planner</h1>
        <p className="text-sm text-muted-foreground">Set targets, track progress, and stay consistent.</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Add a new goal</h2>
        <div className="grid sm:grid-cols-5 gap-3">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Take 5 mocks this week" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target</Label>
            <Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        <Button onClick={add} disabled={saving || !form.title.trim()} className="mt-3 gap-1">
          <Plus className="h-4 w-4" /> Add goal
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Active ({active.length})</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : active.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active goals.</div>
        ) : (
          <div className="space-y-4">
            {active.map((g) => {
              const pct = g.target_value
                ? Math.min(100, Math.round((Number(g.current_value || 0) / Number(g.target_value)) * 100))
                : 0;
              return (
                <div key={g.id} className="border border-sky-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <div className="font-medium">{g.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {g.goal_type} · {g.current_value || 0}/{g.target_value} {g.unit}
                        {g.due_date && ` · due ${new Date(g.due_date).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateProgress(g.id, Math.max(0, Number(g.current_value || 0) - 1))}>−</Button>
                      <Button size="sm" variant="outline" onClick={() => updateProgress(g.id, Number(g.current_value || 0) + 1)}>+</Button>
                      <Button size="sm" variant="ghost" onClick={() => complete(g.id)} title="Mark complete">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(g.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {done.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Completed ({done.length})</h2>
          <div className="space-y-2">
            {done.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                <span className="line-through text-muted-foreground">{g.title}</span>
                <Button size="sm" variant="ghost" onClick={() => remove(g.id)}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
