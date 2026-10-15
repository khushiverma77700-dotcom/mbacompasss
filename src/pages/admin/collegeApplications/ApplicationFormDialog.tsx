import { SlugUniqueHint } from "@/components/admin/SlugUniqueHint";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUpload from "@/components/admin/FileUpload";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { toast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import {
  EXAM_OPTIONS,
  PROGRAM_OPTIONS,
  TIER_OPTIONS,
  formatFee,
  rowPrograms,
  type TrackerRow,
} from "@/lib/applicationTracker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: TrackerRow | null;
  onSaved: () => void;
};

const CATEGORIES = [
  { key: "iim", label: "IIM" },
  { key: "tier1", label: "Tier 1 Non-IIM" },
  { key: "tier2", label: "Tier 2 Non-IIM" },
  { key: "exam", label: "Entrance exam" },
];

type FormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  category: string;
  tier: string;
  logo_url: string;
  programs: string[];
  program_fee: string;
  application_fee: string;
  apply_url: string;
  accepted_exams: string[];
  application_deadline: string;
  deadline_tbd: boolean;
  sort_order: string;
  details_html: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  slugTouched: false,
  category: "iim",
  tier: "",
  logo_url: "",
  programs: [],
  program_fee: "",
  application_fee: "",
  apply_url: "",
  accepted_exams: [],
  application_deadline: "",
  deadline_tbd: false,
  sort_order: "0",
  details_html: "",
  is_active: true,
};

const toDateInput = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border p-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function ChipSelect({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function ApplicationFormDialog({ open, onOpenChange, row, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (row) {
      setForm({
        name: row.name,
        slug: row.slug,
        slugTouched: true,
        category: row.category,
        tier: row.tier ?? "",
        logo_url: row.logo_url ?? "",
        programs: rowPrograms(row),
        program_fee: row.program_fee?.toString() ?? "",
        application_fee: row.application_fee?.toString() ?? "",
        apply_url: row.apply_url ?? "",
        accepted_exams: row.accepted_exams ?? [],
        application_deadline: toDateInput(row.application_deadline),
        deadline_tbd: !!row.deadline_tbd,
        sort_order: (row.sort_order ?? 0).toString(),
        details_html: row.details_html ?? "",
        is_active: row.is_active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, row]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const isExam = form.category === "exam";

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (form.apply_url && !/^https?:\/\//i.test(form.apply_url)) {
      toast({ title: "Application link must start with http:// or https://", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: (form.slug.trim() || slugify(form.name)).toLowerCase(),
      category: form.category,
      tier: isExam ? null : form.tier || null,
      logo_url: form.logo_url || null,
      programs: form.programs,
      program: form.programs[0] ?? null,
      program_fee: form.program_fee === "" ? null : Number(form.program_fee),
      application_fee: form.application_fee === "" ? null : Number(form.application_fee),
      apply_url: form.apply_url || null,
      accepted_exams: form.accepted_exams,
      application_deadline: form.application_deadline ? new Date(form.application_deadline).toISOString() : null,
      deadline_tbd: form.deadline_tbd,
      sort_order: Number.isFinite(Number(form.sort_order)) ? Number(form.sort_order) : 0,
      details_html: form.details_html || null,
      is_active: form.is_active,
    };
    const { error } = row
      ? await supabase.from("application_trackers").update(payload).eq("id", row.id)
      : await supabase.from("application_trackers").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: row ? "College updated" : "College added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? `Edit ${row.name}` : "Add college"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Section title="Basic information">
            <div className="space-y-1.5 md:col-span-2">
              <Label>College name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value, slug: f.slugTouched ? f.slug : slugify(e.target.value) }))
                }
                placeholder="IIM Ahmedabad"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value, slugTouched: true }))}
                placeholder="iim-ahmedabad"
              />
              <SlugUniqueHint table="application_trackers" slug={form.slug} excludeId={row?.id} onApply={(v) => setForm((f) => ({ ...f, slug: v, slugTouched: true }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!isExam && (
              <div className="space-y-1.5">
                <Label>Tier</Label>
                <Select value={form.tier || undefined} onValueChange={(v) => set("tier", v)}>
                  <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="md:col-span-2">
              <FileUpload
                bucket="uploads"
                folder="application-tracker/logos"
                value={form.logo_url}
                onChange={(url) => set("logo_url", url)}
                accept="image/png,image/jpeg,image/webp"
                label="College logo"
                sizeHint="PNG, JPG or WebP • 200×200 px"
              />
            </div>
          </Section>

          <Section title="Program & fees">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Program offered</Label>
              <ChipSelect options={PROGRAM_OPTIONS} value={form.programs} onChange={(v) => set("programs", v)} />
            </div>
            <div className="space-y-1.5">
              <Label>Program fees (₹)</Label>
              <Input type="number" min="0" value={form.program_fee} onChange={(e) => set("program_fee", e.target.value)} placeholder="1250000" />
              {form.program_fee && <p className="text-sm text-muted-foreground">Shows as {formatFee(Number(form.program_fee))}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Application fees (₹)</Label>
              <Input type="number" min="0" value={form.application_fee} onChange={(e) => set("application_fee", e.target.value)} placeholder="2500" />
            </div>
          </Section>

          <Section title="Application">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Application link (Apply Now)</Label>
              <Input value={form.apply_url} onChange={(e) => set("apply_url", e.target.value)} placeholder="https://admissions.example.ac.in/apply" />
            </div>
            <div className="space-y-1.5">
              <Label>Application deadline</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={form.application_deadline}
                  onChange={(e) => setForm((f) => ({ ...f, application_deadline: e.target.value, deadline_tbd: e.target.value ? false : f.deadline_tbd }))}
                  disabled={form.deadline_tbd}
                />
                <Button
                  type="button"
                  variant={form.deadline_tbd ? "default" : "outline"}
                  className="shrink-0"
                  aria-pressed={form.deadline_tbd}
                  onClick={() => setForm((f) => ({ ...f, deadline_tbd: !f.deadline_tbd, application_deadline: f.deadline_tbd ? f.application_deadline : "" }))}
                >
                  Application Open
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {form.deadline_tbd
                  ? "Deadline not disclosed — the website will show “Application Open”."
                  : "Pick a date, or click “Application Open” when the deadline is not disclosed."}
              </p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Exams accepted</Label>
              <ChipSelect options={EXAM_OPTIONS} value={form.accepted_exams} onChange={(v) => set("accepted_exams", v)} />
            </div>
          </Section>

          <section className="space-y-3 rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground">College details</h3>
            <RichTextEditor
              content={form.details_html}
              onChange={(html) => set("details_html", html)}
              placeholder="Write or paste the full college information here…"
            />
          </section>

          <Section title="Publishing">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.is_active ? "published" : "draft"} onValueChange={(v) => set("is_active", v === "published")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} placeholder="0" />
              <p className="text-sm text-muted-foreground">Lower numbers appear first on the website.</p>
            </div>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : row ? "Save changes" : "Add college"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
