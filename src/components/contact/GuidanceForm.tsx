import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, ShieldCheck, Loader2, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { helpOptions } from "./guidanceData";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
  graduation_year: z.string().max(20).optional(),
  exam: z.string().max(40).optional(),
  score: z.string().max(40).optional(),
  work_experience: z.string().max(40).optional(),
  specialisation: z.string().max(60).optional(),
  help_topics: z.array(z.string()).min(1, "Select at least one area you need help with"),
  query: z.string().trim().max(1000).optional(),
});

const exams = ["CAT", "XAT", "SNAP", "NMAT", "CMAT", "Other", "Not appeared yet"];
const specialisations = [
  "Finance", "Marketing", "Consulting", "Product Management", "HR",
  "Business Analytics", "Operations", "General Management", "Not decided yet",
];
const workExperience = ["Fresher", "0-1 years", "1-3 years", "3-5 years", "5+ years"];
const gradYears = ["2023 or earlier", "2024", "2025", "2026", "2027", "2028 or later"];

type FormState = {
  name: string; email: string; phone: string; graduation_year: string; exam: string;
  score: string; work_experience: string; specialisation: string; query: string;
};

const emptyForm: FormState = {
  name: "", email: "", phone: "", graduation_year: "", exam: "",
  score: "", work_experience: "", specialisation: "", query: "",
};

const GuidanceForm = ({
  selectedTopics,
  onToggleTopic,
  onSuccess,
}: {
  selectedTopics: string[];
  onToggleTopic: (topic: string) => void;
  onSuccess: () => void;
}) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const parsed = schema.safeParse({ ...form, help_topics: selectedTopics });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);

    const { data: session } = await supabase.auth.getSession();
    const { error } = await (supabase.from("guidance_requests" as any) as any).insert({
      ...parsed.data,
      user_id: session.session?.user?.id ?? null,
      source: "contact_page",
    });
    setLoading(false);

    if (error) {
      toast({
        title: "Could not submit",
        description: "Something went wrong. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    setForm(emptyForm);
    onSuccess();
  };

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="text-xs text-destructive mt-1">{errors[key]}</p>
    ) : null;

  return (
    <form
      onSubmit={handleSubmit}
      id="guidance-form"
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-primary/15 bg-card shadow-[0_24px_60px_-32px_hsl(var(--primary)/0.35)]"
      noValidate
    >
      {/* Header band with trust signal */}
      <div className="border-b border-primary/10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Users className="h-3.5 w-3.5" /> 2,000+ MBA Aspirants Mentored
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <Star className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" /> 100% Free
          </span>
        </div>
        <h2 className="font-heading mt-3 text-xl font-bold text-foreground sm:text-2xl">
          Tell Us What You Need Help With
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Takes under a minute. Only name, email and mobile are required — no login needed.
        </p>
      </div>

      <div className="px-5 py-6 sm:px-7">


      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="gf-name">Full Name *</Label>
          <Input
            id="gf-name" value={form.name} maxLength={100} autoComplete="name"
            onChange={(e) => set("name", e.target.value)} className="mt-1.5"
          />
          {fieldError("name")}
        </div>
        <div>
          <Label htmlFor="gf-email">Email Address *</Label>
          <Input
            id="gf-email" type="email" value={form.email} maxLength={255} autoComplete="email"
            onChange={(e) => set("email", e.target.value)} className="mt-1.5"
          />
          {fieldError("email")}
        </div>
        <div>
          <Label htmlFor="gf-phone">WhatsApp / Mobile *</Label>
          <Input
            id="gf-phone" type="tel" inputMode="numeric" value={form.phone} autoComplete="tel"
            onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="mt-1.5"
          />
          {fieldError("phone")}
        </div>
        <div>
          <Label htmlFor="gf-grad">Graduation Year</Label>
          <Select value={form.graduation_year} onValueChange={(v) => set("graduation_year", v)}>
            <SelectTrigger id="gf-grad" className="mt-1.5"><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {gradYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="gf-exam">Entrance Exam</Label>
          <Select value={form.exam} onValueChange={(v) => set("exam", v)}>
            <SelectTrigger id="gf-exam" className="mt-1.5"><SelectValue placeholder="Select exam" /></SelectTrigger>
            <SelectContent>
              {exams.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="gf-score">Score / Percentile</Label>
          <Input
            id="gf-score" value={form.score} maxLength={40} placeholder="Optional"
            onChange={(e) => set("score", e.target.value)} className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="gf-work">Work Experience</Label>
          <Select value={form.work_experience} onValueChange={(v) => set("work_experience", v)}>
            <SelectTrigger id="gf-work" className="mt-1.5"><SelectValue placeholder="Select experience" /></SelectTrigger>
            <SelectContent>
              {workExperience.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="gf-spec">Preferred MBA Specialisation</Label>
          <Select value={form.specialisation} onValueChange={(v) => set("specialisation", v)}>
            <SelectTrigger id="gf-spec" className="mt-1.5"><SelectValue placeholder="Select specialisation" /></SelectTrigger>
            <SelectContent>
              {specialisations.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-foreground mb-2">
          What do you need help with? *
        </legend>
        <div className="flex flex-wrap gap-2">
          {helpOptions.map((option) => {
            const active = selectedTopics.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleTopic(option)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {active && <Check className="w-3.5 h-3.5" />}
                {option}
              </button>
            );
          })}
        </div>
        {fieldError("help_topics")}
      </fieldset>

      <div className="mt-5">
        <Label htmlFor="gf-query">Additional Query</Label>
        <Textarea
          id="gf-query" rows={4} value={form.query} maxLength={1000}
          placeholder="Share anything that helps us guide you better."
          onChange={(e) => set("query", e.target.value)} className="mt-1.5"
        />
      </div>

      <Button type="submit" className="w-full mt-6 min-h-12 text-base font-semibold shadow-lg shadow-primary/25" disabled={loading}>
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
        ) : (
          "Get My Free MBA Guidance"
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        No consultation fee. No hidden charges. No obligation to purchase.
      </p>
      <div className="flex flex-wrap justify-center gap-1.5 mt-3">
        <Badge variant="secondary" className="text-[11px]">100% Free for students</Badge>
        <Badge variant="secondary" className="text-[11px]">Available for the next one month</Badge>
      </div>
      </div>
    </form>

  );
};

export default GuidanceForm;
