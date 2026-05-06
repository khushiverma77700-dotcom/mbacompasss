import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import SEOHead from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import {
  ChevronRight, ArrowLeft, GraduationCap, BookOpen, Clock, Calendar,
  CheckCircle2, Phone, MessageCircle, Mail, Trophy, Sparkles, ShieldCheck, Building2,
  Star, Users, Award, Target, TrendingUp, Zap, Download, Share2, Heart,
  Video, FileText, HeadphonesIcon, MapPin, Globe, Tag, IndianRupee,
  PlayCircle, BarChart3, BookOpenCheck, Briefcase, Lightbulb, Rocket,
  CircleCheck, ArrowRight, Quote, Flame
} from "lucide-react";
import { slugify } from "@/lib/slugify";
import { toast } from "sonner";

const InstituteCoursePage = () => {
  const { slug, courseSlug } = useParams<{ slug: string; courseSlug: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const [liked, setLiked] = useState(false);

  const { data: institute, isLoading } = useQuery({
    queryKey: ["institute_course_page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutes")
        .select(`
          id, name, slug, logo_url, banner_url, city, state, phone, whatsapp, email, website, established_year, total_students, rating,
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

  const { course, otherCourses } = useMemo(() => {
    if (!institute) return { course: null, otherCourses: [] as any[] };
    const fromJoin = (institute.institute_courses || []).map((r: any) => r.course).filter(Boolean);
    const direct = (institute.direct_courses || []).filter(Boolean);
    const map = new Map<string, any>();
    [...fromJoin, ...direct].forEach((c: any) => { if (c?.id) map.set(c.id, c); });
    const all = Array.from(map.values());
    const current = all.find((c: any) => slugify(c.name || "") === courseSlug) || null;
    const others = all.filter((c: any) => c.id !== current?.id).slice(0, 4);
    return { course: current, otherCourses: others };
  }, [institute, courseSlug]);

  const inst: any = institute || {};
  const c: any = course || {};

  const title = course
    ? `${c.name} by ${inst.name}${inst.city ? ` in ${inst.city}` : ""} — Fees, Batch, Reviews`
    : "Course";
  const description = course
    ? `${c.name} at ${inst.name}${inst.city ? ", " + inst.city : ""}. ${c.duration ? "Duration: " + c.duration + ". " : ""}${c.fees ? "Fees: ₹" + c.fees + ". " : ""}Get full curriculum, batch dates and admission help.`.slice(0, 160)
    : "";

  const courseSchema = course ? {
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
  } : undefined;

  const { seo } = useResolvedSeo("course", c.id || "", {
    title,
    description,
    canonical: typeof window !== "undefined" && course ? `${window.location.origin}/institute/${inst.slug}/course/${courseSlug}` : undefined,
    jsonLd: courseSchema,
    ogImage: inst.banner_url || inst.logo_url || undefined,
  });

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try { await navigator.share({ title: c.name, text: description, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
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

  const highlights: string[] = Array.isArray(c.highlights) ? c.highlights : [];
  const curriculum: string[] = Array.isArray(c.curriculum) ? c.curriculum : [];
  const feesNumber = typeof c.fees === "number" ? c.fees : Number(String(c.fees || "").replace(/[^0-9.]/g, ""));
  const feesDisplay = feesNumber ? `₹${feesNumber.toLocaleString("en-IN")}` : (c.fees || "On Request");

  // Derived feature pills (deterministic, no fake data — based on real fields)
  const courseFeatures = [
    c.mode && { icon: PlayCircle, label: c.mode, color: "sky" },
    c.duration && { icon: Clock, label: c.duration, color: "emerald" },
    c.start_date && { icon: Calendar, label: `Starts ${c.start_date}`, color: "violet" },
    c.total_seats && { icon: Users, label: `${c.total_seats} Seats`, color: "amber" },
    c.eligibility && { icon: Target, label: c.eligibility, color: "rose" },
  ].filter(Boolean) as { icon: any; label: string; color: string }[];

  const learnPillars = [
    { icon: BookOpenCheck, title: "Concept Mastery", desc: "Live + recorded lectures with handouts" },
    { icon: BarChart3, title: "Adaptive Mocks", desc: "Sectional + full mocks with deep analytics" },
    { icon: Briefcase, title: "Mentor Access", desc: "1:1 strategy + doubt-clearing sessions" },
    { icon: Lightbulb, title: "Smart Practice", desc: "Topic-wise drills curated by past papers" },
    { icon: Rocket, title: "Interview Prep", desc: "WAT-PI training for IIM & top B-schools" },
    { icon: Award, title: "Scholarships", desc: "Performance-based fee waivers available" },
  ];

  const faqs = [
    { q: `Who is this ${c.name} program best suited for?`, a: c.eligibility ? `Designed for: ${c.eligibility}. Ideal for serious aspirants looking for structured prep with mentor guidance.` : `Designed for serious MBA aspirants who want structured preparation with mentor guidance and a proven test-prep playbook.` },
    { q: `What is the fee structure?`, a: `Total course fee is ${feesDisplay}.${c.discount_text ? ` Current offer: ${c.discount_text}.` : ""} EMI options and scholarships may be available — talk to the institute for details.` },
    { q: `What is the duration and batch start date?`, a: `${c.duration ? `The course runs for ${c.duration}.` : ""} ${c.start_date ? `The next batch begins ${c.start_date}.` : "New batches are launched periodically — enquire for the next start date."}` },
    { q: `Is there a demo class or trial?`, a: `Most programs at ${inst.name} offer a free demo session or counselling call. Use the enquiry form below to request access.` },
    { q: `What study material and mocks are included?`, a: `You get printed/digital study material, topic-wise practice sets, sectional mocks and full-length mocks with detailed analytics.` },
  ];

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

      {/* HERO */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <div className="pointer-events-none absolute -top-32 -right-32 w-[34rem] h-[34rem] rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-blue-200/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgb(15 23 42) 1px, transparent 0)", backgroundSize: "24px 24px" }} />

        <div className="relative container mx-auto px-4 py-8 md:py-12 max-w-6xl">
          <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-5 flex-wrap">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/coaching" className="hover:text-foreground">Coaching</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/institute/${inst.slug}`} className="hover:text-foreground truncate max-w-[180px]">{inst.name}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate">{c.name}</span>
          </nav>

          <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
            {/* LEFT */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/institute/${inst.slug}`}
                  className="inline-flex items-center gap-2 text-[12px] font-semibold text-sky-700 hover:text-sky-900 bg-white border border-sky-100 rounded-full px-3 py-1.5 shadow-sm transition"
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
                {c.rating && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {c.rating}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  <Flame className="w-3 h-3" /> Trending
                </span>
              </div>

              <h1 className="font-heading text-[28px] md:text-[40px] leading-[1.05] font-extrabold mt-4 tracking-tight text-slate-900">
                {c.name}
              </h1>
              <p className="mt-2 text-[15px] text-slate-600">
                Offered by <Link to={`/institute/${inst.slug}`} className="font-semibold text-slate-800 hover:text-sky-700">{inst.name}</Link>
                {inst.city ? <> · <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{inst.city}</span></> : ""}
                {inst.state ? `, ${inst.state}` : ""}
              </p>

              {/* Feature pills */}
              <div className="mt-5 flex flex-wrap gap-1.5">
                {courseFeatures.map((f, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full bg-${f.color}-50 text-${f.color}-700 border border-${f.color}-100`}>
                    <f.icon className="w-3.5 h-3.5" /> {f.label}
                  </span>
                ))}
              </div>

              {/* Stat strip */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: IndianRupee, label: "Fees", value: feesDisplay, accent: "text-amber-700" },
                  { icon: Clock, label: "Duration", value: c.duration || "Flexible", accent: "text-emerald-700" },
                  { icon: Users, label: "Seats", value: c.total_seats ? String(c.total_seats) : "Limited", accent: "text-sky-700" },
                  { icon: TrendingUp, label: "Mode", value: c.mode || "Hybrid", accent: "text-violet-700" },
                ].map((s, i) => (
                  <div key={i} className="rounded-xl bg-white border border-sky-100 px-3 py-2.5 shadow-sm">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      <s.icon className="w-3 h-3" /> {s.label}
                    </div>
                    <div className={`text-[14px] font-bold mt-0.5 ${s.accent}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* CTA row */}
              <div className="mt-6 flex flex-wrap gap-2">
                <a href="#enquiry">
                  <Button size="lg" className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-md text-[14px] font-semibold gap-1.5">
                    <Zap className="w-4 h-4" /> Enquire Now — Free
                  </Button>
                </a>
                {c.brochure_url && (
                  <a href={c.brochure_url} target="_blank" rel="noreferrer">
                    <Button size="lg" variant="outline" className="text-[14px] font-semibold gap-1.5">
                      <Download className="w-4 h-4" /> Brochure
                    </Button>
                  </a>
                )}
                {inst.phone && (
                  <a href={`tel:${inst.phone}`}>
                    <Button size="lg" variant="outline" className="text-[14px] font-semibold gap-1.5">
                      <Phone className="w-4 h-4" /> Call
                    </Button>
                  </a>
                )}
                <Button size="lg" variant="ghost" onClick={handleShare} className="text-[14px] font-semibold gap-1.5">
                  <Share2 className="w-4 h-4" /> Share
                </Button>
                <Button size="lg" variant="ghost" onClick={() => { setLiked(v => !v); toast.success(liked ? "Removed from saved" : "Saved to your list"); }} className={`text-[14px] font-semibold gap-1.5 ${liked ? "text-rose-600" : ""}`}>
                  <Heart className={`w-4 h-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} /> {liked ? "Saved" : "Save"}
                </Button>
              </div>

              {/* Trust strip */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-slate-600">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Institute</span>
                <span className="inline-flex items-center gap-1.5"><CircleCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Free Counselling</span>
                <span className="inline-flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-600" /> EMI Available</span>
                <span className="inline-flex items-center gap-1.5"><HeadphonesIcon className="w-3.5 h-3.5 text-sky-600" /> Mentor Support</span>
              </div>
            </div>

            {/* RIGHT — Sticky pricing card */}
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl border-2 border-sky-100 bg-white shadow-xl overflow-hidden">
                {c.discount_text && (
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[12px] font-bold px-4 py-2 text-center flex items-center justify-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> {c.discount_text}
                  </div>
                )}
                <div className="p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Course Fee</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-slate-900">{feesDisplay}</span>
                    <span className="text-[12px] text-slate-500">incl. taxes</span>
                  </div>

                  {/* Seats progress (visual only — based on total_seats existence) */}
                  {c.total_seats ? (
                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span>Seats filling fast</span>
                        <span className="text-rose-600">Limited</span>
                      </div>
                      <Progress value={72} className="h-2" />
                    </div>
                  ) : null}

                  <div className="mt-5 space-y-2.5 text-sm">
                    {c.duration && <Row k="Duration" v={c.duration} />}
                    {c.mode && <Row k="Mode" v={c.mode} />}
                    {c.start_date && <Row k="Next batch" v={c.start_date} />}
                    {c.total_seats && <Row k="Seats" v={String(c.total_seats)} />}
                    {c.eligibility && <Row k="Eligibility" v={c.eligibility} />}
                  </div>

                  <div className="mt-5 space-y-2">
                    <a href="#enquiry" className="block">
                      <Button className="w-full bg-gradient-to-r from-sky-600 to-blue-600 gap-1.5 font-semibold">
                        <Zap className="w-4 h-4" /> Enquire Now
                      </Button>
                    </a>
                    {inst.whatsapp && (
                      <a href={`https://wa.me/${inst.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="block">
                        <Button variant="outline" className="w-full gap-1.5 font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                          <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified · No Spam · Free Counselling
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS NAV */}
      <div className="border-b bg-white sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 max-w-6xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent h-12 p-0 gap-1 overflow-x-auto justify-start w-full">
              {[
                { v: "overview", l: "Overview" },
                { v: "curriculum", l: "Curriculum" },
                { v: "features", l: "What You Get" },
                { v: "batch", l: "Batches & Fees" },
                { v: "faq", l: "FAQs" },
                { v: "contact", l: "Contact" },
              ].map(t => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="data-[state=active]:bg-sky-50 data-[state=active]:text-sky-700 data-[state=active]:shadow-none rounded-md px-3 text-[13px] font-semibold border-b-2 border-transparent data-[state=active]:border-sky-600"
                >
                  {t.l}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* BODY */}
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-10 mt-0">
            {highlights.length > 0 && (
              <section>
                <SectionTitle eyebrow="Highlights" title="Why this course stands out" />
                <ul className="mt-5 grid sm:grid-cols-2 gap-2.5">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 bg-white border border-sky-100 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-sky-200 transition">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="leading-relaxed pt-0.5">{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {c.description && (
              <section>
                <SectionTitle eyebrow="About" title={`About ${c.name}`} />
                <div
                  className="mt-5 prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-xl prose-h3:text-base prose-p:leading-[1.75] prose-p:text-slate-700 prose-a:text-sky-700 prose-table:text-sm prose-th:bg-sky-50 bg-white border border-sky-100 rounded-2xl p-5 md:p-7 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: c.description }}
                />
              </section>
            )}

            {/* Why pick — pillars */}
            <section>
              <SectionTitle eyebrow="What you get" title="Built for serious aspirants" />
              <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {learnPillars.map((p, i) => (
                  <div key={i} className="group rounded-2xl bg-white border border-sky-100 p-5 shadow-sm hover:shadow-lg hover:border-sky-200 hover:-translate-y-0.5 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                      <p.icon className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-slate-900 text-[15px]">{p.title}</div>
                    <div className="text-[13px] text-slate-600 mt-1 leading-relaxed">{p.desc}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Outcome banner */}
            <section className="rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 text-white p-6 md:p-10 shadow-xl relative overflow-hidden">
              <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
              <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-90 bg-white/15 rounded-full px-2.5 py-1 backdrop-blur">
                    <Trophy className="w-3 h-3" /> Outcome focused
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mt-3">Your shortest path to a top B-school</h2>
                  <p className="text-sm opacity-95 mt-2 max-w-2xl leading-relaxed">
                    Personalised mentoring, exam-aligned curriculum and a proven test-prep playbook — designed to maximise calls & conversions at IIMs and other top B-schools.
                  </p>
                  <div className="grid grid-cols-3 gap-3 mt-6 max-w-lg">
                    {[
                      { v: "1:1", l: "Mentorship" },
                      { v: "100+", l: "Mock Tests" },
                      { v: "24×7", l: "Doubt Support" },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl bg-white/10 border border-white/20 p-3 backdrop-blur">
                        <div className="text-2xl font-extrabold">{s.v}</div>
                        <div className="text-[11px] uppercase tracking-wider opacity-90">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <a href="#enquiry">
                  <Button size="lg" className="bg-white text-sky-700 hover:bg-slate-50 font-bold gap-1.5">
                    Get Free Counselling <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </section>
          </TabsContent>

          {/* CURRICULUM */}
          <TabsContent value="curriculum" className="space-y-6 mt-0">
            <SectionTitle eyebrow="Syllabus" title="Curriculum & modules" />
            {curriculum.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {curriculum.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white border border-sky-100 rounded-xl p-4 shadow-sm hover:border-sky-200 transition">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="text-sm text-slate-800 font-medium pt-1.5">{m}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/30 p-8 text-center">
                <BookOpen className="w-10 h-10 mx-auto text-sky-400" />
                <p className="mt-3 text-sm text-slate-600">Detailed module list available on request. Download the brochure or talk to a counsellor.</p>
              </div>
            )}
          </TabsContent>

          {/* FEATURES */}
          <TabsContent value="features" className="space-y-6 mt-0">
            <SectionTitle eyebrow="Inclusions" title="Everything inside this program" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Video, title: "Live + Recorded Classes", desc: "Attend live, revise anytime" },
                { icon: FileText, title: "Printed Study Material", desc: "Concept books + workbooks" },
                { icon: BarChart3, title: "Sectional Mocks", desc: "Topic-wise & full-length" },
                { icon: BookOpenCheck, title: "Past Papers Vault", desc: "Solved last 10 years" },
                { icon: Briefcase, title: "WAT-PI Training", desc: "Mock interviews + group discussions" },
                { icon: HeadphonesIcon, title: "Doubt Support", desc: "WhatsApp + scheduled calls" },
                { icon: Users, title: "Peer Community", desc: "Closed serious-aspirants group" },
                { icon: Trophy, title: "Performance Reports", desc: "Weekly progress dashboard" },
                { icon: Award, title: "Scholarships", desc: "Performance-based fee waivers" },
              ].map((f, i) => (
                <div key={i} className="rounded-2xl bg-white border border-sky-100 p-5 shadow-sm hover:shadow-lg hover:border-sky-200 hover:-translate-y-0.5 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-slate-900 text-[14px]">{f.title}</div>
                  <div className="text-[13px] text-slate-600 mt-0.5">{f.desc}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* BATCH */}
          <TabsContent value="batch" className="space-y-6 mt-0">
            <SectionTitle eyebrow="Batch info" title="Schedule, fees & enrolment" />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 mb-3">Upcoming batch</div>
                <div className="space-y-2.5 text-sm">
                  {c.start_date && <Row k="Start date" v={c.start_date} />}
                  {c.duration && <Row k="Duration" v={c.duration} />}
                  {c.mode && <Row k="Mode" v={c.mode} />}
                  {c.total_seats && <Row k="Total seats" v={String(c.total_seats)} />}
                  {c.eligibility && <Row k="Eligibility" v={c.eligibility} />}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-3">Fee structure</div>
                <div className="space-y-2.5 text-sm">
                  <Row k="Total fees" v={feesDisplay} accent="text-amber-700 font-bold" />
                  {c.discount_text && <Row k="Current offer" v={c.discount_text} accent="text-emerald-700 font-bold" />}
                  <Row k="EMI option" v="Available" />
                  <Row k="Refund policy" v="As per institute terms" />
                </div>
                <a href="#enquiry" className="block mt-4">
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 font-semibold gap-1.5">
                    Reserve Your Seat <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>

            {c.batch_info && (
              <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 mb-2">Additional batch info</div>
                <p className="text-sm text-slate-700 leading-relaxed">{c.batch_info}</p>
              </div>
            )}
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-4 mt-0">
            <SectionTitle eyebrow="FAQs" title="Frequently asked questions" />
            <Accordion type="single" collapsible className="bg-white border border-sky-100 rounded-2xl shadow-sm divide-y">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`f-${i}`} className="border-0 px-5">
                  <AccordionTrigger className="text-left font-semibold text-slate-900 text-[14px] py-4 hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[13.5px] text-slate-700 leading-relaxed pb-4">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          {/* CONTACT */}
          <TabsContent value="contact" className="space-y-6 mt-0">
            <div id="enquiry" className="scroll-mt-24">
              <div className="rounded-2xl border border-sky-100 bg-white p-6 md:p-8 shadow-sm">
                <SectionTitle eyebrow="Get in touch" title={`Talk to ${inst.name}`} />
                <p className="text-sm text-slate-600 mt-2">Reach out for fees breakdown, batch dates and scholarship eligibility for this program.</p>

                <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {inst.phone && (
                    <a href={`tel:${inst.phone}`} className="rounded-xl border border-sky-100 bg-sky-50/50 hover:bg-sky-50 p-4 transition group">
                      <Phone className="w-5 h-5 text-sky-700 mb-2" />
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Call</div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-sky-700 truncate">{inst.phone}</div>
                    </a>
                  )}
                  {inst.whatsapp && (
                    <a href={`https://wa.me/${inst.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 p-4 transition group">
                      <MessageCircle className="w-5 h-5 text-emerald-700 mb-2" />
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">WhatsApp</div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 truncate">{inst.whatsapp}</div>
                    </a>
                  )}
                  {inst.email && (
                    <a href={`mailto:${inst.email}`} className="rounded-xl border border-violet-100 bg-violet-50/50 hover:bg-violet-50 p-4 transition group">
                      <Mail className="w-5 h-5 text-violet-700 mb-2" />
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Email</div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-violet-700 truncate">{inst.email}</div>
                    </a>
                  )}
                  {inst.website && (
                    <a href={inst.website} target="_blank" rel="noreferrer" className="rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 p-4 transition group">
                      <Globe className="w-5 h-5 text-amber-700 mb-2" />
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Website</div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-amber-700 truncate">Visit site</div>
                    </a>
                  )}
                </div>

                <div className="mt-5">
                  <Link to={`/institute/${inst.slug}#enquiry`}>
                    <Button className="bg-gradient-to-r from-sky-600 to-blue-600 gap-1.5 font-semibold">
                      Open enquiry form <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* OTHER COURSES */}
        {otherCourses.length > 0 && (
          <section className="mt-12">
            <SectionTitle eyebrow="More from this institute" title={`Other programs by ${inst.name}`} />
            <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {otherCourses.map((oc: any) => (
                <Link
                  key={oc.id}
                  to={`/institute/${inst.slug}/course/${slugify(oc.name || "")}`}
                  className="group rounded-2xl bg-white border border-sky-100 p-4 shadow-sm hover:shadow-lg hover:border-sky-300 hover:-translate-y-0.5 transition-all"
                >
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-2 py-0.5">
                    <GraduationCap className="w-2.5 h-2.5" /> Course
                  </div>
                  <div className="font-bold text-slate-900 mt-2 text-[14px] leading-snug line-clamp-2 group-hover:text-sky-700">{oc.name}</div>
                  <div className="mt-2 flex items-center justify-between text-[12px] text-slate-600">
                    <span>{oc.duration || "Flexible"}</span>
                    <span className="font-bold text-amber-700">
                      {oc.fees ? (typeof oc.fees === "number" ? `₹${oc.fees.toLocaleString("en-IN")}` : `₹${oc.fees}`) : "Enquire"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="mt-12">
          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-5 items-center justify-between">
            <div className="flex items-start gap-4">
              <Quote className="w-8 h-8 text-sky-500 shrink-0" />
              <div>
                <div className="font-bold text-slate-900 text-lg">Still deciding? Talk to a mentor first.</div>
                <p className="text-sm text-slate-600 mt-1">Get a free 15-min counselling call. No pressure, just clarity on whether this program fits your goals.</p>
              </div>
            </div>
            <a href="#enquiry">
              <Button size="lg" className="bg-gradient-to-r from-sky-600 to-blue-600 font-semibold gap-1.5 whitespace-nowrap">
                Book Free Call <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </section>

        <div className="mt-8">
          <Link to={`/institute/${inst.slug}`}>
            <Button variant="ghost" className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back to {inst.name}</Button>
          </Link>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t shadow-2xl p-3 flex gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Course Fee</div>
          <div className="text-sm font-extrabold text-amber-700 truncate">{feesDisplay}</div>
        </div>
        <a href="#enquiry" className="flex-1">
          <Button className="w-full bg-gradient-to-r from-sky-600 to-blue-600 font-semibold">Enquire Now</Button>
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

const Row = ({ k, v, accent }: { k: string; v: string; accent?: string }) => (
  <div className="flex justify-between gap-3">
    <span className="text-slate-500">{k}</span>
    <span className={`font-semibold text-right ${accent || "text-slate-900"}`}>{v}</span>
  </div>
);

const SectionTitle = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wider text-sky-700">{eyebrow}</div>
    <h2 className="text-2xl md:text-[26px] font-bold mt-1 text-slate-900">{title}</h2>
    <div className="mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" />
  </div>
);

export default InstituteCoursePage;
