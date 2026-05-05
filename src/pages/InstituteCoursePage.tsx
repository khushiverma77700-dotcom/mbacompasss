import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import {
  ChevronRight, ArrowLeft, GraduationCap, BookOpen, Clock, Calendar,
  CheckCircle2, Phone, MessageCircle, Mail, Trophy, Sparkles, ShieldCheck, Building2
} from "lucide-react";
import { slugify } from "@/lib/slugify";

const InstituteCoursePage = () => {
  const { slug, courseSlug } = useParams<{ slug: string; courseSlug: string }>();
  const navigate = useNavigate();

  const { data: institute, isLoading } = useQuery({
    queryKey: ["institute_course_page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutes")
        .select(`
          id, name, slug, logo_url, banner_url, city, state, phone, whatsapp, email, website,
          institute_courses(course:courses(id, name, fees, duration, mode, description, curriculum, highlights, eligibility, batch_info, start_date, brochure_url, discount_text, total_seats, rating)),
          direct_courses:courses!courses_institute_id_fkey(id, name, fees, duration, mode, description, curriculum, highlights, eligibility, batch_info, start_date, brochure_url, discount_text, total_seats, rating)
        `)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const course = useMemo(() => {
    if (!institute) return null;
    const fromJoin = (institute.institute_courses || []).map((r: any) => r.course).filter(Boolean);
    const direct = (institute.direct_courses || []).filter(Boolean);
    const map = new Map<string, any>();
    [...fromJoin, ...direct].forEach((c: any) => { if (c?.id) map.set(c.id, c); });
    const all = Array.from(map.values());
    return all.find((c: any) => slugify(c.name || "") === courseSlug) || null;
  }, [institute, courseSlug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!institute || !course) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Course not found</h1>
        <Link to={`/institute/${slug}`} className="text-sky-700 hover:underline">← Back to institute</Link>
      </div>
    );
  }

  const inst: any = institute;
  const c: any = course;
  const highlights: string[] = Array.isArray(c.highlights) ? c.highlights : [];
  const curriculum: string[] = Array.isArray(c.curriculum) ? c.curriculum : [];

  const title = `${c.name} by ${inst.name}${inst.city ? ` in ${inst.city}` : ""} — Fees, Batch, Reviews`;
  const description = `${c.name} at ${inst.name}${inst.city ? ", " + inst.city : ""}. ${c.duration ? "Duration: " + c.duration + ". " : ""}${c.fees ? "Fees: ₹" + c.fees + ". " : ""}Get full curriculum, batch dates and admission help.`.slice(0, 160);

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.name,
    description: c.description ? c.description.replace(/<[^>]+>/g, " ").slice(0, 500) : description,
    provider: {
      "@type": "Organization",
      name: inst.name,
      url: typeof window !== "undefined" ? `${window.location.origin}/institute/${inst.slug}` : undefined,
    },
    ...(c.fees && {
      offers: {
        "@type": "Offer",
        price: String(c.fees),
        priceCurrency: "INR",
      },
    }),
  };

  const { seo } = useResolvedSeo("course", c.id, {
    title,
    description,
    canonical: typeof window !== "undefined" ? `${window.location.origin}/institute/${inst.slug}/course/${courseSlug}` : undefined,
    jsonLd: courseSchema,
    ogImage: inst.banner_url || inst.logo_url || undefined,
  });

  return (
    <>
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        jsonLd={seo.jsonLd}
        ogImage={seo.ogImage}
        keywords={seo.keywords}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative container mx-auto px-4 py-10 md:py-12 max-w-5xl">
          <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-5 flex-wrap">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/coaching" className="hover:text-foreground">Coaching</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/institute/${inst.slug}`} className="hover:text-foreground truncate max-w-[180px]">{inst.name}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate">{c.name}</span>
          </nav>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  to={`/institute/${inst.slug}`}
                  className="inline-flex items-center gap-2 text-[12px] font-semibold text-sky-700 hover:text-sky-900 bg-white border border-sky-100 rounded-full px-3 py-1.5 shadow-sm"
                >
                  {inst.logo_url ? (
                    <img src={inst.logo_url} alt={inst.name} className="w-5 h-5 rounded object-contain" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5" />
                  )}
                  {inst.name}
                </Link>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-2.5 py-1">
                  <GraduationCap className="w-3 h-3" /> Coaching Program
                </span>
              </div>
              <h1 className="font-heading text-[28px] md:text-[36px] leading-[1.1] font-extrabold mt-4 tracking-tight text-slate-900">
                {c.name}
              </h1>
              <p className="mt-2 text-[15px] text-slate-600">
                Offered by <span className="font-semibold text-slate-800">{inst.name}</span>
                {inst.city ? ` · ${inst.city}` : ""}{inst.state ? `, ${inst.state}` : ""}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.mode && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                    <BookOpen className="w-3 h-3" /> {c.mode}
                  </span>
                )}
                {c.duration && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Clock className="w-3 h-3" /> {c.duration}
                  </span>
                )}
                {c.fees && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                    ₹{typeof c.fees === "number" ? c.fees.toLocaleString("en-IN") : c.fees}
                  </span>
                )}
                {c.start_date && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                    <Calendar className="w-3 h-3" /> {c.start_date}
                  </span>
                )}
                {c.eligibility && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                    Eligibility: {c.eligibility}
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <a href="#enquiry">
                  <Button size="lg" className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-md text-[14px] font-semibold">
                    Enquire about this course
                  </Button>
                </a>
                {c.brochure_url && (
                  <a href={c.brochure_url} target="_blank" rel="noreferrer">
                    <Button size="lg" variant="outline" className="text-[14px] font-semibold">Download brochure</Button>
                  </a>
                )}
                {inst.phone && (
                  <a href={`tel:${inst.phone}`}>
                    <Button size="lg" variant="ghost" className="text-[14px] font-semibold gap-1.5">
                      <Phone className="w-4 h-4" /> Call
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Side card */}
            <div className="rounded-2xl border border-sky-100 bg-white/90 backdrop-blur shadow-lg p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 mb-3">Quick Facts</div>
              <ul className="space-y-2.5 text-sm">
                {c.duration && <li className="flex justify-between gap-3"><span className="text-slate-500">Duration</span><span className="font-semibold text-slate-900">{c.duration}</span></li>}
                {c.mode && <li className="flex justify-between gap-3"><span className="text-slate-500">Mode</span><span className="font-semibold text-slate-900">{c.mode}</span></li>}
                {c.fees && <li className="flex justify-between gap-3"><span className="text-slate-500">Fees</span><span className="font-semibold text-amber-700">₹{typeof c.fees === "number" ? c.fees.toLocaleString("en-IN") : c.fees}</span></li>}
                {c.start_date && <li className="flex justify-between gap-3"><span className="text-slate-500">Next batch</span><span className="font-semibold text-slate-900 text-right">{c.start_date}</span></li>}
                {c.total_seats ? <li className="flex justify-between gap-3"><span className="text-slate-500">Seats</span><span className="font-semibold text-slate-900">{c.total_seats}</span></li> : null}
                {c.discount_text && <li className="flex justify-between gap-3"><span className="text-slate-500">Offer</span><span className="font-semibold text-emerald-700 text-right">{c.discount_text}</span></li>}
              </ul>
              <div className="mt-4 pt-3 border-t flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Institute · 100% Free Counselling
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="container mx-auto px-4 py-10 max-w-5xl space-y-10">
        {highlights.length > 0 && (
          <section>
            <SectionTitle eyebrow="Highlights" title="Key Highlights" />
            <ul className="mt-5 grid sm:grid-cols-2 gap-2.5">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-white border border-sky-100 rounded-xl p-3 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.description && (
          <section>
            <SectionTitle eyebrow="About" title={`About ${c.name}`} />
            <div
              className="mt-5 prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-xl prose-h3:text-base prose-p:leading-[1.75] prose-p:text-slate-700 prose-a:text-sky-700 prose-table:text-sm prose-th:bg-sky-50 bg-white border border-sky-100 rounded-2xl p-5 md:p-6 shadow-sm"
              dangerouslySetInnerHTML={{ __html: c.description }}
            />
          </section>
        )}

        {curriculum.length > 0 && (
          <section>
            <SectionTitle eyebrow="Syllabus" title="Curriculum & Modules" />
            <ol className="mt-5 grid sm:grid-cols-2 gap-2 list-decimal list-inside text-sm text-slate-700 bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">
              {curriculum.map((m, i) => (<li key={i}>{m}</li>))}
            </ol>
          </section>
        )}

        {c.batch_info && (
          <section>
            <SectionTitle eyebrow="Batch" title="Batch Information" />
            <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/50 p-5 text-sm text-slate-700 shadow-sm">
              {c.batch_info}
            </div>
          </section>
        )}

        {/* Why choose strip */}
        <section className="rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white p-6 md:p-8 shadow-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 shrink-0 mt-1" />
            <div>
              <div className="text-xs uppercase tracking-wider opacity-90">Why students pick this program</div>
              <h2 className="text-2xl font-bold mt-1">Built for serious MBA aspirants</h2>
              <p className="text-sm opacity-95 mt-2 max-w-2xl leading-relaxed">
                Personalised mentoring, exam-aligned curriculum and a proven test-prep playbook designed to maximise conversions at top B-schools.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mt-5">
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

        {/* Enquiry / contact */}
        <section id="enquiry" className="scroll-mt-24">
          <div className="rounded-2xl border border-sky-100 bg-white p-6 md:p-8 shadow-sm">
            <SectionTitle eyebrow="Get in touch" title={`Talk to ${inst.name}`} />
            <p className="text-sm text-slate-600 mt-2">Reach out for fees breakdown, batch dates and scholarship eligibility for this program.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {inst.phone && (
                <a href={`tel:${inst.phone}`}>
                  <Button className="gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600"><Phone className="w-4 h-4" /> Call {inst.phone}</Button>
                </a>
              )}
              {inst.whatsapp && (
                <a href={`https://wa.me/${inst.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="gap-1.5"><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
                </a>
              )}
              {inst.email && (
                <a href={`mailto:${inst.email}`}>
                  <Button variant="outline" className="gap-1.5"><Mail className="w-4 h-4" /> Email</Button>
                </a>
              )}
              <Link to={`/institute/${inst.slug}`} className="ml-auto">
                <Button variant="ghost" className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back to {inst.name}</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t shadow-lg p-3 flex gap-2">
        <a href="#enquiry" className="flex-1">
          <Button className="w-full bg-gradient-to-r from-sky-600 to-blue-600">Enquire Now</Button>
        </a>
        {inst.phone && (
          <a href={`tel:${inst.phone}`}>
            <Button variant="outline" size="icon"><Phone className="w-4 h-4" /></Button>
          </a>
        )}
      </div>
    </>
  );
};

const SectionTitle = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wider text-sky-700">{eyebrow}</div>
    <h2 className="text-2xl md:text-[26px] font-bold mt-1 text-slate-900">{title}</h2>
    <div className="mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" />
  </div>
);

export default InstituteCoursePage;
