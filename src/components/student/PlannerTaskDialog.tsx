import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Recurrence, RECURRENCE_OPTIONS, WEEKDAY_LABELS, todayStr } from "@/lib/plannerRecurrence";
import { Sparkles, FileText, Repeat, BookOpen } from "lucide-react";

export interface TaskFormValue {
  id?: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  estimated_minutes: number;
  recurrence: Recurrence;
  recurrence_days: number[];
  recurrence_until: string | null;
  auto_rollover: boolean;
  linked_action: string | null;
  linked_ref: string | null;
}

const CATEGORIES = [
  { value: "mock",      label: "Full Mock" },
  { value: "sectional", label: "Sectional Test" },
  { value: "varc",      label: "VARC" },
  { value: "qa",        label: "Quant (QA)" },
  { value: "dilr",      label: "DILR" },
  { value: "revision",  label: "Revision" },
  { value: "gk",        label: "GK / Reading" },
  { value: "custom",    label: "Custom" },
];

const PRIORITIES = [
  { value: "high",   label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low" },
];

const LINKED_ACTIONS = [
  { value: "none",             label: "No quick action",  icon: Sparkles },
  { value: "daily_test",       label: "Today's Daily Test", icon: FileText },
  { value: "personalized_hub", label: "Personalized Hub", icon: BookOpen },
  { value: "mocks",            label: "Browse mocks",     icon: Repeat },
];

const empty: TaskFormValue = {
  title: "",
  description: null,
  category: "custom",
  priority: "medium",
  scheduled_date: todayStr(),
  scheduled_start_time: null,
  estimated_minutes: 30,
  recurrence: "none",
  recurrence_days: [],
  recurrence_until: null,
  auto_rollover: true,
  linked_action: null,
  linked_ref: null,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<TaskFormValue>;
  onSubmit: (v: TaskFormValue) => Promise<void> | void;
}

export default function PlannerTaskDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [v, setV] = useState<TaskFormValue>({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setV({ ...empty, ...initial });
  }, [open, initial]);

  const isEdit = Boolean(initial?.id);
  const showWeekdayPicker = v.recurrence === "weekly" || v.recurrence === "custom";

  const toggleDay = (d: number) => {
    setV((p) => ({
      ...p,
      recurrence_days: p.recurrence_days.includes(d)
        ? p.recurrence_days.filter((x) => x !== d)
        : [...p.recurrence_days, d],
    }));
  };

  const submit = async () => {
    if (!v.title.trim()) return;
    if ((v.recurrence === "weekly" || v.recurrence === "custom") && v.recurrence_days.length === 0) return;
    setSaving(true);
    try {
      await onSubmit({
        ...v,
        title: v.title.trim(),
        description: v.description?.trim() || null,
        recurrence_until: v.recurrence === "none" ? null : v.recurrence_until,
        linked_action: v.linked_action === "none" ? null : v.linked_action,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "Add a task"}</DialogTitle>
          <DialogDescription>
            Plan a single task or set it to repeat. Unfinished tasks can roll over to the next day automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Task title <span className="text-rose-500">*</span></Label>
            <Input
              value={v.title}
              onChange={(e) => setV({ ...v, title: e.target.value })}
              placeholder="e.g. CAT VARC sectional — 1 hour"
            />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={v.description ?? ""}
              onChange={(e) => setV({ ...v, description: e.target.value })}
              rows={2}
              placeholder="Any context or focus area for this block"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={v.category} onValueChange={(val) => setV({ ...v, category: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={v.priority} onValueChange={(val) => setV({ ...v, priority: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={v.scheduled_date} onChange={(e) => setV({ ...v, scheduled_date: e.target.value })} />
            </div>
            <div>
              <Label>Start time</Label>
              <Input type="time" value={v.scheduled_start_time ?? ""} onChange={(e) => setV({ ...v, scheduled_start_time: e.target.value || null })} />
            </div>
            <div>
              <Label>Minutes</Label>
              <Input
                type="number" min={5} max={600}
                value={v.estimated_minutes}
                onChange={(e) => setV({ ...v, estimated_minutes: parseInt(e.target.value) || 30 })}
              />
            </div>
          </div>

          {/* Recurrence */}
          <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-sky-600" />
              <Label className="m-0">Repeats</Label>
            </div>
            <Select value={v.recurrence} onValueChange={(val) => setV({ ...v, recurrence: val as Recurrence })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <div className="flex flex-col">
                      <span>{o.label}</span>
                      <span className="text-[10px] text-muted-foreground">{o.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showWeekdayPicker && (
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Pick days</div>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((d, idx) => {
                    const active = v.recurrence_days.includes(idx);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={cn(
                          "h-8 w-12 rounded-md text-xs font-medium border transition-colors",
                          active
                            ? "bg-sky-500 text-white border-sky-500"
                            : "bg-card text-foreground border-border hover:border-sky-300"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {v.recurrence !== "none" && (
              <div>
                <Label className="text-xs">Repeat until (optional)</Label>
                <Input
                  type="date"
                  value={v.recurrence_until ?? ""}
                  onChange={(e) => setV({ ...v, recurrence_until: e.target.value || null })}
                  className="h-9"
                />
              </div>
            )}
          </div>

          {/* Smart action link */}
          <div>
            <Label>Quick action button</Label>
            <Select
              value={v.linked_action ?? "none"}
              onValueChange={(val) => setV({ ...v, linked_action: val === "none" ? null : val })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LINKED_ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Adds a one-tap button on the task card so the student can jump straight to that screen.
            </p>
          </div>

          {/* Auto-rollover */}
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
            <Switch checked={v.auto_rollover} onCheckedChange={(c) => setV({ ...v, auto_rollover: c })} />
            <div className="flex-1">
              <div className="text-sm font-medium">Move to next day if not done</div>
              <div className="text-xs text-muted-foreground">
                If you skip this task today, we'll automatically push it to tomorrow so you don't lose it.
              </div>
            </div>
            {v.auto_rollover && <Badge variant="secondary" className="text-[10px]">Recommended</Badge>}
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !v.title.trim()} className="bg-sky-600 hover:bg-sky-700">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
