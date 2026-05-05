import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import SEOHead, { generateInstituteSchema } from "@/components/SEOHead";
import {
  ArrowLeft, MapPin, Star, Building2, Globe, Phone, Mail, MessageCircle,
  ChevronRight, Users, Award, Sparkles, CheckCircle2, ShieldCheck, TrendingUp,
  GraduationCap, Calendar, BookOpen, Clock, Trophy
} from "lucide-react";
import InstituteSectionRenderer from "@/components/institute/InstituteSectionRenderer";
import { INSTITUTE_SECTIONS, getSection, isSectionEmpty } from "@/lib/instituteSections";

const InstitutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [activeId, setActiveId] = useState<string>("");

  const { data: institute, isLoading } = useQuery({
    queryKey: ["institute_full", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutes")
        .select(`
          *,
          institute_courses(course:courses(id, name, fees, duration, mode, description, course_category_id))
        `)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const linkedCourses = useMemo(
    () => (institute?.institute_courses || []).map((r: any) => r.course).filter(Boolean),
    [institute]
  );

  const activeSections = useMemo(() => {
    if (!institute) return [];
    const sections = institute.sections || {};
    return INSTITUTE_SECTIONS.filter((def) => {
      const s = getSection(sections, def.id);
      return s.enabled && !isSectionEmpty(def, s.data);
    });
  }, [institute]);

  useEffect(() => {
    const onScroll = () => {
      const offsets = activeSections.map((s) => {
        const el = document.getElementById(`sec-${s.id}`);
        return { id: s.id, top: el?.getBoundingClientRect().top ?? 99999 };
      });
      const current = offsets.filter((o) => o.top <= 140).pop();
      if (current) setActiveId(current.id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeSections]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Institute not found</h1>
        <Link to="/coaching" className="text-primary hover:underline">← Browse all coaching institutes</Link>
      </div>
    );
  }

  const inst = institute as any;
  const isHybrid = institute.institute_type === "hybrid";
  const seoSchema = generateInstituteSchema(institute);

  // Quick stat cards based on available data
  const heroStats = [
    institute.students_count && {
      icon: Users, label: "Students", value: `${Number(institute.students_count).toLocaleString()}+`
    },
    institute.success_rate && {
      icon: TrendingUp, label: "Success Rate", value: `${institute.success_rate}%`
    },
    institute.rating && {
      icon: Star, label: "Rating", value: `${institute.rating}/5`
    },
    inst.years_experience && {
      icon: Award, label: "Experience", value: `${inst.years_experience}+ yrs`
    },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  // Trust strip items
  const trustItems = [
    { icon: ShieldCheck, label: "Verified Institute" },
    { icon: GraduationCap, label: "Expert Faculty" },
    { icon: BookOpen, label: "Updated Curriculum" },
    { icon: Trophy, label: "Proven Results" },
  ];

  return (
    <>
      <SEOHead
        title={institute.meta_title || `${institute.name} — Coaching Institute${institute.city ? ` in ${institute.city}` : ""} | MBA Compass`}
        description={institute.meta_description || institute.description || `${institute.name} offers MBA coaching with comprehensive programs.`}
        canonical={`${window.location.origin}/institute/${institute.slug}`}
        jsonLd={seoSchema}
        ogImage={institute.banner_url || institute.logo_url || undefined}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-sky-50 via-white to-blue-50">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-200/30 blur-3xl" />
        {institute.banner_url && (
          <div
            className="pointer-events-none absolute inset-0 opacity-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${institute.banner_url})` }}
          />
        )}

        <div className="relative container mx-auto px-4 py-10 max-w-6xl">
          <Link to="/coaching" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-3 h-3 mr-1" /> All coaching institutes
          </Link>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            <div className="flex items-start gap-5 flex-wrap">
              {institute.logo_url ? (
                <img
                  src={institute.logo_url}
                  alt={institute.name}
                  className="w-24 h-24 rounded-2xl border bg-white object-contain p-2 shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl border bg-white grid place-items-center shrink-0 shadow-sm">
                  <Building2 className="w-10 h-10 text-sky-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1 bg-white">
                    {isHybrid ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                    {isHybrid ? "Hybrid (Online + Offline)" : "City-wise Centers"}
                  </Badge>
                  {institute.featured && (
                    <Badge className="gap-1 bg-amber-500 hover:bg-amber-500">
                      <Sparkles className="w-3 h-3" /> Featured
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1 bg-white">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                  </Badge>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mt-3 tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {institute.name}
                </h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                  {institute.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {institute.city}{institute.state ? `, ${institute.state}` : ""}
                    </span>
                  )}
                  {institute.rating ? (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-current" /> {institute.rating}
                    </span>
                  ) : null}
                  {inst.established_year && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Est. {inst.established_year}
                    </span>
                  )}
                </div>
                {institute.description && (
                  <p className="mt-4 text-sm text-slate-700 max-w-3xl leading-relaxed">{institute.description}</p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <a href="#enquiry">
                    <Button className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-md">
                      Book Free Demo
                    </Button>
                  </a>
                  <a href="#enquiry"><Button variant="outline">Talk to Counselor</Button></a>
                  <Link to="/compare"><Button variant="ghost">Compare Coaching</Button></Link>
                </div>
              </div>
            </div>

            {/* Hero side card */}
            {heroStats.length > 0 && (
              <Card className="border-sky-100 bg-white/80 backdrop-blur shadow-sm">
                <CardContent className="p-5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-3">At a glance</div>
                  <div className="grid grid-cols-2 gap-3">
                    {heroStats.map((s, i) => (
                      <div key={i} className="rounded-lg border bg-gradient-to-br from-sky-50 to-white p-3">
                        <s.icon className="w-4 h-4 text-sky-600 mb-1" />
                        <div className="text-lg font-bold text-slate-900 leading-tight">{s.value}</div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <a href="#enquiry" className="block mt-4">
                    <Button variant="outline" className="w-full">Get Fee Details</Button>
                  </a>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Trust strip */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2">
            {trustItems.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-white/70 backdrop-blur border border-sky-100 px-3 py-2">
                <t.icon className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-xs font-medium text-slate-700">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="grid lg:grid-cols-[230px_1fr] gap-8">
          {/* ToC */}
          {activeSections.length > 1 && (
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-1 bg-white border rounded-xl p-3 shadow-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-2">On this page</div>
                {linkedCourses.length > 0 && (
                  <a href="#courses" className={`block text-sm px-3 py-2 rounded-lg transition hover:bg-sky-50 ${activeId === "courses" ? "bg-sky-50 text-sky-700 font-semibold border-l-2 border-sky-600" : "text-slate-600"}`}>
                    Courses ({linkedCourses.length})
                  </a>
                )}
                {activeSections.map((s) => (
                  <a key={s.id} href={`#sec-${s.id}`}
                    className={`block text-sm px-3 py-2 rounded-lg transition hover:bg-sky-50 ${activeId === s.id ? "bg-sky-50 text-sky-700 font-semibold border-l-2 border-sky-600" : "text-slate-600"}`}>
                    {s.label}
                  </a>
                ))}
                <a href="#enquiry" className="block text-sm px-3 py-2 rounded-lg text-slate-600 hover:bg-sky-50">
                  Enquire Now
                </a>
              </div>
            </aside>
          )}

          {/* Body */}
          <div className="space-y-10 min-w-0">
            {/* Mobile ToC */}
            {activeSections.length > 1 && (
              <div className="lg:hidden -mx-4 px-4 overflow-x-auto sticky top-14 z-30 bg-white/90 backdrop-blur border-b py-2">
                <div className="flex gap-2 whitespace-nowrap">
                  {linkedCourses.length > 0 && <a href="#courses" className="text-sm border rounded-full px-3 py-1.5 bg-white">Courses</a>}
                  {activeSections.map((s) => (
                    <a key={s.id} href={`#sec-${s.id}`} className="text-sm border rounded-full px-3 py-1.5 bg-white">{s.label}</a>
                  ))}
                </div>
              </div>
            )}

            {/* Linked courses */}
            {linkedCourses.length > 0 && (
              <SectionShell id="courses" eyebrow="Programs" title="Courses Available" subtitle="Choose the program that fits your target exam and learning style.">
                <div className="grid md:grid-cols-2 gap-4">
                  {linkedCourses.map((c: any) => (
                    <Card key={c.id} className="group hover:shadow-lg transition border-slate-200 hover:border-sky-300">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-base text-slate-900 group-hover:text-sky-700 transition">{c.name}</div>
                          {c.fees && <Badge variant="outline" className="shrink-0">{c.fees}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          {c.duration && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{c.duration}</span>}
                          {c.mode && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />{c.mode}</span>}
                        </div>
                        {c.description && <p className="text-sm text-slate-700 mt-3 line-clamp-3 leading-relaxed">{c.description}</p>}
                        <div className="mt-3 flex items-center gap-2">
                          <a href="#enquiry" className="text-xs font-semibold text-sky-700 hover:underline inline-flex items-center gap-1">
                            Enquire <ChevronRight className="w-3 h-3" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SectionShell>
            )}

            {/* Dynamic sections */}
            {activeSections.map((def, idx) => {
              const { data } = getSection(institute.sections, def.id);
              const eyebrow = sectionEyebrow(def.id, idx);
              return (
                <SectionShell
                  key={def.id}
                  id={`sec-${def.id}`}
                  eyebrow={eyebrow}
                  title={def.label}
                  subtitle={def.shortHelp}
                >
                  <InstituteSectionRenderer def={def} data={data} />
                </SectionShell>
              );
            })}

            {/* Why choose strip (always-on, content varies) */}
            <section className="rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white p-6 md:p-8 shadow-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 shrink-0 mt-1" />
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-90">Why students choose us</div>
                  <h2 className="text-2xl font-bold mt-1">Built for serious MBA aspirants</h2>
                  <p className="text-sm opacity-95 mt-2 max-w-2xl leading-relaxed">
                    Personalised mentoring, exam-aligned curriculum and a proven test-prep playbook — designed to maximise your conversion at top B-schools.
                  </p>
                  <div className="grid md:grid-cols-3 gap-3 mt-5">
                    {[
                      { t: "Adaptive Mocks", d: "Real exam pattern with deep analytics" },
                      { t: "Mentor Access", d: "1:1 strategy & doubt clearing" },
                      { t: "Concept Mastery", d: "Live + recorded + study material" },
                    ].map((f, i) => (
                      <div key={i} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-4">
                        <CheckCircle2 className="w-4 h-4 mb-2" />
                        <div className="font-semibold text-sm">{f.t}</div>
                        <div className="text-xs opacity-90 mt-1">{f.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Enquiry */}
            <section id="enquiry" className="scroll-mt-24">
              <Card className="overflow-hidden border-sky-100 shadow-sm">
                <div className="grid md:grid-cols-[1fr_280px]">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-xs uppercase tracking-wider text-sky-700 font-semibold">Enquire</div>
                    <h2 className="text-2xl font-bold mt-1">Get in touch with {institute.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">Submit your details and an advisor will reach out within 24 hours.</p>
                    <EnquiryForm instituteId={institute.id} instituteName={institute.name} />
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {institute.phone && <a href={`tel:${institute.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" /> {institute.phone}</a>}
                      {institute.whatsapp && <a href={`https://wa.me/${institute.whatsapp.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 hover:text-primary"><MessageCircle className="w-3 h-3" /> WhatsApp</a>}
                      {institute.email && <a href={`mailto:${institute.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="w-3 h-3" /> {institute.email}</a>}
                    </div>
                  </CardContent>
                  <div className="hidden md:block bg-gradient-to-br from-sky-500 to-blue-600 text-white p-6">
                    <Trophy className="w-8 h-8 mb-3" />
                    <div className="font-bold text-lg">Free Counselling</div>
                    <p className="text-xs opacity-90 mt-1 leading-relaxed">Tell us your target exam and we'll match you with the right batch and mentor.</p>
                    <ul className="mt-4 space-y-2 text-xs">
                      {["No spam calls", "Personalised plan", "Free demo class"].map((x) => (
                        <li key={x} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> {x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </section>

            {activeSections.length === 0 && linkedCourses.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                More details about this institute will appear here soon.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t shadow-lg p-3 flex gap-2">
        <a href="#enquiry" className="flex-1">
          <Button className="w-full bg-gradient-to-r from-sky-600 to-blue-600">Book Free Demo</Button>
        </a>
        {institute.phone && (
          <a href={`tel:${institute.phone}`}>
            <Button variant="outline" size="icon"><Phone className="w-4 h-4" /></Button>
          </a>
        )}
      </div>
    </>
  );
};

const SectionShell = ({
  id, eyebrow, title, subtitle, children,
}: { id: string; eyebrow?: string; title: string; subtitle?: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <div className="mb-5">
      {eyebrow && (
        <div className="text-xs font-semibold uppercase tracking-wider text-sky-700">{eyebrow}</div>
      )}
      <h2 className="text-2xl md:text-[26px] font-bold mt-1 text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
      <div className="mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" />
    </div>
    <div className="rounded-2xl border bg-white p-5 md:p-6 shadow-sm">{children}</div>
  </section>
);

const sectionEyebrow = (id: string, idx: number) => {
  const map: Record<string, string> = {
    overview: "About",
    key_highlights: "Highlights",
    courses_offered: "Programs",
    course_formats: "Formats",
    faculty: "Mentors",
    results: "Outcomes",
    topper_testimonials: "Toppers Speak",
    student_reviews: "Reviews",
    fees: "Pricing",
    locations: "Centers",
    faqs: "FAQs",
    contact: "Contact",
    why_choose: "Why Us",
    pros_cons: "Pros & Cons",
    comparison: "Compare",
  };
  return map[id] || `Section ${String(idx + 1).padStart(2, "0")}`;
};

const EnquiryForm = ({ instituteId, instituteName }: { instituteId: string; instituteName: string }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("inquiries").insert({
      institute_id: instituteId,
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      message: form.message || `Enquiry for ${instituteName}`,
    } as any);
    setLoading(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Sent!", description: "We'll be in touch shortly." });
    setForm({ name: "", phone: "", email: "", message: "" });
  };
  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-3 mt-4">
      <Input placeholder="Your name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
      <Input placeholder="Phone *" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
      <Input className="md:col-span-2" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
      <Textarea className="md:col-span-2" rows={3} placeholder="Tell us about your target exam and current prep level (optional)" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
      <Button type="submit" className="md:col-span-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700" disabled={loading}>
        {loading ? "Sending…" : "Submit Enquiry"}
      </Button>
    </form>
  );
};

export default InstitutePage;
