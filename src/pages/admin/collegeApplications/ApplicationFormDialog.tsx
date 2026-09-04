import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FileUpload from "@/components/admin/FileUpload";
import { toast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slugify";
import { CATEGORY_FILTERS, type TrackerRow } from "@/lib/applicationTracker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: TrackerRow | null;
  onSaved: () => void;
};

type FormState = {
  name: string;
  slug: string;
  logo_url: string;
  category: string;
  tier: string;
  program: string;
  location: string;
  application_open_date: string;
  application_deadline: string;
  application_fee: string;
  program_fee: string;
  accepted_exams: string;
  apply_url: string;
  inside_info_url: string;
  inside_info_notes: string;
  short_description: string;
  status: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  logo_url: "",
  category: "iim",
  tier: "",
  program: "",
  location: "",
  application_open_date: "",
  application_deadline: "",
  application_fee: "",
  program_fee: "",
  accepted_exams: "",
  apply_url: "",
  inside_info_url: "",
  inside_info_notes: "",
  short_description: "",
  status: "open",
  is_active: true,
};

const toDateInput = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export default function ApplicationFormDialog({ open, onOpenChange, row, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (row) {
      setForm({
        name: row.name,
        slug: row.slug,
        logo_url: row.logo_url ?? "",
        category: row.category,
        tier: row.tier ?? "",
        program: row.program ?? "",
        location: row.location ?? "",
        application_open_date: toDateInput(row.application_open_date),
        application_deadline: toDateInput(row.application_deadline),
        application_fee: row.application_fee?.toString() ?? "",
        program_fee: row.program_fee?.toString() ?? "",
        accepted_exams: (row.accepted_exams ?? []).join(", "),
        apply_url: row.apply_url ?? "",
        inside_info_url: row.inside_info_url ?? "",
        inside_info_notes: row.inside_info_notes ?? "",
        short_description: row.short_description ?? "",
        status: row.status,
        is_active: row.is_active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, row]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (form.apply_url && !/^https?:\/\//i.test(form.apply_url)) {
      toast({ title: "Apply URL must start with http:// or https://", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: (form.slug.trim() || slugify(form.name)).toLowerCase(),
      logo_url: form.logo_url || null,
      category: form.category,
      tier: form.tier || null,
      program: form.program || null,
      location: form.location || null,
      application_open_date: form.application_open_date || null,
      application_deadline: form.application_deadline ? new Date(form.application_deadline).toISOString() : null,
      application_fee: form.application_fee === "" ? null : Number(form.application_fee),
      program_fee: form.program_fee === "" ? null : Number(form.program_fee),
      accepted_exams: form.accepted_exams
        ? form.accepted_exams.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      apply_url: form.apply_url || null,
      inside_info_url: form.inside_info_url || null,
      inside_info_notes: form.inside_info_notes || null,
      short_description: form.short_description || null,
      status: form.status,
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
    toast({ title: row ? "Application updated" : "Application added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? `Edit ${row.name}` : "Add application"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>College / Exam name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="IIM Ahmedabad" />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="auto-generated from name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_FILTERS.filter((c) => c.key !== "all").map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tier</Label>
            <Input value={form.tier} onChange={(e) => set("tier", e.target.value)} placeholder="Tier 1" />
          </div>
          <div className="space-y-1.5">
            <Label>Programme</Label>
            <Input value={form.program} onChange={(e) => set("program", e.target.value)} placeholder="PGP / MBA" />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ahmedabad" />
          </div>
          <div className="space-y-1.5">
            <Label>Accepted exams (comma separated)</Label>
            <Input value={form.accepted_exams} onChange={(e) => set("accepted_exams", e.target.value)} placeholder="CAT, GMAT" />
          </div>
          <div className="space-y-1.5">
            <Label>Application opens</Label>
            <Input type="date" value={form.application_open_date} onChange={(e) => set("application_open_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Application deadline</Label>
            <Input type="date" value={form.application_deadline} onChange={(e) => set("application_deadline", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Application fee (₹)</Label>
            <Input type="number" value={form.application_fee} onChange={(e) => set("application_fee", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Programme fee (₹)</Label>
            <Input type="number" value={form.program_fee} onChange={(e) => set("program_fee", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Visible on frontend</Label>
            <Select value={form.is_active ? "yes" : "no"} onValueChange={(v) => set("is_active", v === "yes")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Active</SelectItem>
                <SelectItem value="no">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Apply Now URL</Label>
            <Input value={form.apply_url} onChange={(e) => set("apply_url", e.target.value)} placeholder="https://admissions.example.ac.in/apply" />
          </div>
          <div className="md:col-span-2">
            <FileUpload
              bucket="uploads"
              folder="application-tracker/logos"
              value={form.logo_url}
              onChange={(url) => set("logo_url", url)}
              accept="image/*"
              label="Logo"
              sizeHint="200×200 px (1:1) • Max 60 KB"
            />
          </div>
          <div className="md:col-span-2">
            <FileUpload
              bucket="uploads"
              folder="application-tracker/inside-info"
              value={form.inside_info_url}
              onChange={(url) => set("inside_info_url", url)}
              accept="application/pdf,image/*"
              label="Inside Information document (PDF)"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Short description (shown on the tracker)</Label>
            <Textarea rows={2} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Inside Information notes</Label>
            <Textarea rows={4} value={form.inside_info_notes} onChange={(e) => set("inside_info_notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : row ? "Save changes" : "Add application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
