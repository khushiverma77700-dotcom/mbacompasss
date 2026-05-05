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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import SEOHead, { generateInstituteSchema } from "@/components/SEOHead";
import {
  ArrowLeft, MapPin, Star, Building2, Globe, Phone, Mail, MessageCircle,
  ChevronRight, Users, Award, Sparkles, CheckCircle2, ShieldCheck, TrendingUp,
  GraduationCap, Calendar, BookOpen, Clock, Trophy, X
} from "lucide-react";
import InstituteSectionRenderer from "@/components/institute/InstituteSectionRenderer";
import { INSTITUTE_SECTIONS, getSection, isSectionEmpty } from "@/lib/instituteSections";

function stripHtml(html: string, max = 160): string {
  if (!html) return "";
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\[src:[^\]]+\]/g, "")
    .replace(/Quick Summary:\s*/i, "")
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

const InstitutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [activeId, setActiveId] = useState<string>("");
  const [openCourse, setOpenCourse] = useState<any | null>(null);
  const [courseMode, setCourseMode] = useState<string>("All");
  const [courseSort, setCourseSort] = useState<string>("default");
  const [courseSearch, setCourseSearch] = useState<string>("");

  const { data: institute, isLoading } = useQuery({
    queryKey: ["institute_full", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutes")
        .select(`
          *,
          institute_courses(course:courses(id, name, fees, duration, mode, description, course_category_id, curriculum, highlights, eligibility, batch_info, start_date, brochure_url, discount_text, total_seats, rating)),
          direct_courses:courses!courses_institute_id_fkey(id, name, fees, duration, mode, description, course_category_id, curriculum, highlights, eligibility, batch_info, start_date, brochure_url, discount_text, total_seats, rating)
        `)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const linkedCourses = useMemo(() => {
    const fromJoin = (institute?.institute_courses || []).map((r: any) => r.course).filter(Boolean);
    const direct = (institute?.direct_courses || []).filter(Boolean);
    const map = new Map<string, any>();
    [...fromJoin, ...direct].forEach((c: any) => { if (c?.id) map.set(c.id, c); });
    return Array.from(map.values());
  }, [institute]);

  const courseModes = useMemo(() => {
    const set = new Set<string>();
    linkedCourses.forEach((c: any) => { if (c.mode) set.add(c.mode); });
    return ["All", ...Array.from(set)];
  }, [linkedCourses]);

  const filteredCourses = useMemo(() => {
    let list = [...linkedCourses];
    if (courseMode !== "All") list = list.filter((c: any) => c.mode === courseMode);
    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase();
      list = list.filter((c: any) => (c.name || "").toLowerCase().includes(q));
    }
    if (courseSort === "fees-asc") list.sort((a: any, b: any) => (Number(a.fees) || 0) - (Number(b.fees) || 0));
    else if (courseSort === "fees-desc") list.sort((a: any, b: any) => (Number(b.fees) || 0) - (Number(a.fees) || 0));
    else if (courseSort === "name") list.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    return list;
  }, [linkedCourses, courseMode, courseSearch, courseSort]);


  // Render every enabled section that has data, in the canonical order.
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
        <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-blue-200/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {institute.banner_url && (
          <div
            className="pointer-events-none absolute inset-0 opacity-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${institute.banner_url})` }}
          />
        )}

        <div className="relative container mx-auto px-4 py-12 md:py-14 max-w-6xl">
          <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-5">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/coaching" className="hover:text-foreground">Coaching Institutes</Link>
            {institute.city && <><ChevronRight className="w-3 h-3" /><span className="text-foreground/80">{institute.city}</span></>}
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate">{institute.name}</span>
          </nav>

          <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
            <div className="flex items-start gap-5 flex-wrap">
              {institute.logo_url ? (
                <img
                  src={institute.logo_url}
                  alt={institute.name}
                  className="w-28 h-28 rounded-2xl border bg-white object-contain p-2.5 shrink-0 shadow-md ring-1 ring-sky-100"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl border bg-white grid place-items-center shrink-0 shadow-md ring-1 ring-sky-100">
                  <Building2 className="w-12 h-12 text-sky-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1 bg-white text-[12px] py-0.5">
                    {isHybrid ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                    {isHybrid ? "Hybrid (Online + Offline)" : "City-wise Centers"}
                  </Badge>
                  {institute.featured && (
                    <Badge className="gap-1 bg-amber-500 hover:bg-amber-500 text-[12px] py-0.5">
                      <Sparkles className="w-3 h-3" /> Featured
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1 bg-white text-[12px] py-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                  </Badge>
                  {inst.category?.name && (
                    <Badge variant="outline" className="gap-1 bg-white text-[12px] py-0.5">{inst.category.name}</Badge>
                  )}
                </div>
                <h1 className="font-heading text-[30px] md:text-[40px] leading-[1.1] font-extrabold mt-3 tracking-tight text-slate-900">
                  {institute.name}
                </h1>
                <p className="mt-2 text-[15px] text-slate-600 font-medium">
                  {isHybrid ? "Online + Offline MBA Coaching" : "MBA Entrance Coaching Institute"}
                  {institute.city ? ` · ${institute.city}` : ""}{institute.state ? `, ${institute.state}` : ""}
                </p>
                <div className="flex items-center gap-x-4 gap-y-1.5 mt-3 text-[13px] text-slate-600 flex-wrap">
                  {institute.city && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-sky-600" /> {institute.city}{institute.state ? `, ${institute.state}` : ""}
                    </span>
                  )}
                  {institute.rating ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold">
                      <Star className="w-4 h-4 fill-current" /> {institute.rating}
                      {institute.total_reviews ? <span className="text-slate-500 font-normal">({institute.total_reviews} reviews)</span> : null}
                    </span>
                  ) : null}
                  {inst.established_year && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-sky-600" /> Est. {inst.established_year}
                    </span>
                  )}
                  {linkedCourses.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-sky-600" /> {linkedCourses.length} Programs
                    </span>
                  )}
                </div>
                {institute.description && (
                  <p className="mt-4 text-[15px] text-slate-700 max-w-3xl leading-relaxed">{institute.description}</p>
                )}
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <a href="#enquiry">
                    <Button size="lg" className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-md text-[14px] font-semibold">
                      Book Free Demo Class
                    </Button>
                  </a>
                  <a href="#enquiry"><Button size="lg" variant="outline" className="text-[14px] font-semibold border-slate-300">Talk to Counselor</Button></a>
                  <Link to="/compare"><Button size="lg" variant="ghost" className="text-[14px] font-semibold">Compare</Button></Link>
                </div>
              </div>
            </div>

            {/* Hero side card */}
            <Card className="border-sky-100 bg-white/90 backdrop-blur shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">At a Glance</div>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                {heroStats.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {heroStats.map((s, i) => (
                      <div key={i} className="rounded-xl border bg-gradient-to-br from-sky-50/70 to-white p-3">
                        <s.icon className="w-4 h-4 text-sky-600 mb-1.5" />
                        <div className="text-[18px] font-extrabold text-slate-900 leading-tight">{s.value}</div>
                        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-slate-600">Get personalised batch info, fees and scholarship details.</p>
                )}
                <div className="mt-4 space-y-2">
                  <a href="#enquiry" className="block">
                    <Button className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-[13px] font-semibold">
                      Get Fees & Brochure
                    </Button>
                  </a>
                  {institute.phone && (
                    <a href={`tel:${institute.phone}`} className="block">
                      <Button variant="outline" className="w-full text-[13px] font-semibold gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Call Now
                      </Button>
                    </a>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% Free Counselling · No Spam
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust strip */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {trustItems.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur border border-sky-100 px-3.5 py-2.5 shadow-sm">
                <t.icon className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-[13px] font-semibold text-slate-700">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="grid lg:grid-cols-[230px_1fr] gap-8">
          {/* ToC — always visible on desktop when there's any content */}
          {(activeSections.length > 0 || linkedCourses.length > 0) && (
            <aside className="hidden lg:block">
              <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto space-y-1 bg-white border rounded-xl p-3 shadow-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-2">On this page</div>
                {activeSections.map((s) => (
                  <a key={s.id} href={`#sec-${s.id}`}
                    className={`block text-sm px-3 py-2 rounded-lg transition hover:bg-sky-50 ${activeId === s.id ? "bg-sky-50 text-sky-700 font-semibold border-l-2 border-sky-600" : "text-slate-600"}`}>
                    {s.label}
                  </a>
                ))}
                {linkedCourses.length > 0 && (
                  <a href="#courses" className={`block text-sm px-3 py-2 rounded-lg transition hover:bg-sky-50 ${activeId === "courses" ? "bg-sky-50 text-sky-700 font-semibold border-l-2 border-sky-600" : "text-slate-600"}`}>
                    Courses ({linkedCourses.length})
                  </a>
                )}
                <a href="#enquiry" className="block text-sm px-3 py-2 rounded-lg text-sky-700 font-semibold hover:bg-sky-50 mt-2 border-t pt-3">
                  Enquire Now →
                </a>
              </div>
            </aside>
          )}

          {/* Body */}
          <div className="space-y-10 min-w-0">
            {/* Mobile ToC */}
            {(activeSections.length > 0 || linkedCourses.length > 0) && (
              <div className="lg:hidden -mx-4 px-4 overflow-x-auto sticky top-14 z-30 bg-white/90 backdrop-blur border-b py-2">
                <div className="flex gap-2 whitespace-nowrap">
                  {activeSections.map((s) => (
                    <a key={s.id} href={`#sec-${s.id}`} className="text-sm border rounded-full px-3 py-1.5 bg-white">{s.label}</a>
                  ))}
                  {linkedCourses.length > 0 && <a href="#courses" className="text-sm border rounded-full px-3 py-1.5 bg-white">Courses</a>}
                </div>
              </div>
            )}

            {/* (courses moved below sections) */}



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
                >
                  <InstituteSectionRenderer def={def} data={data} />
                </SectionShell>
              );
            })}

            {/* Linked courses — moved below sections */}
            {linkedCourses.length > 0 && (
              <SectionShell
                id="courses"
                eyebrow="Programs"
                title={`Courses Offered (${linkedCourses.length})`}
                subtitle={`Explore every program currently offered by ${institute.name}. Click a card for full details, fees, batch dates, curriculum and mentors.`}
              >
                {/* Filters bar */}
                <div className="mb-5 -mt-1 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Input
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Search programs…"
                      className="h-9 text-sm pl-8 bg-white"
                    />
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {courseModes.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCourseMode(m)}
                        className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border transition ${courseMode === m ? "bg-sky-600 text-white border-sky-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-sky-400 hover:text-sky-700"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <select
                    value={courseSort}
                    onChange={(e) => setCourseSort(e.target.value)}
                    className="h-9 text-[12px] font-medium border border-slate-200 rounded-md px-2 bg-white text-slate-700"
                  >
                    <option value="default">Sort: Default</option>
                    <option value="name">Name A-Z</option>
                    <option value="fees-asc">Fees: Low → High</option>
                    <option value="fees-desc">Fees: High → Low</option>
                  </select>
                  <Link to="/compare" className="ml-auto">
                    <Button variant="outline" size="sm" className="h-9 text-[12px] gap-1 border-sky-200 text-sky-700 hover:bg-sky-50">
                      <TrendingUp className="w-3.5 h-3.5" /> Compare Coachings
                    </Button>
                  </Link>
                </div>

                <div className="text-[12px] text-slate-500 mb-3">
                  Showing <span className="font-semibold text-slate-700">{filteredCourses.length}</span> of {linkedCourses.length} programs
                </div>

                {filteredCourses.length === 0 ? (
                  <div className="text-center py-10 text-sm text-slate-500 border border-dashed rounded-xl">
                    No programs match your filters.
                    <button onClick={() => { setCourseMode("All"); setCourseSearch(""); setCourseSort("default"); }} className="ml-2 text-sky-700 font-semibold hover:underline">Reset</button>
                  </div>
                ) : (
                <div className="grid sm:grid-cols-2 gap-5">
                  {filteredCourses.map((c: any, i: number) => {
                    const accents = [
                      "from-sky-500 to-blue-600",
                      "from-emerald-500 to-teal-600",
                      "from-amber-500 to-orange-600",
                      "from-violet-500 to-fuchsia-600",
                      "from-rose-500 to-pink-600",
                    ];
                    const accent = accents[i % accents.length];
                    const preview = stripHtml(c.description || "", 180);
                    const highlights: string[] = Array.isArray(c.highlights) ? c.highlights : [];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setOpenCourse(c)}
                        className="group relative rounded-2xl border border-sky-100 bg-white p-5 text-left shadow-sm hover:shadow-xl hover:border-sky-300 hover:-translate-y-0.5 transition-all overflow-hidden"
                      >
                        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accent}`} />
                        <div className="flex items-start gap-3">
                          <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${accent} text-white grid place-items-center shadow-md`}>
                            <GraduationCap className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Program #{String(i + 1).padStart(2, "0")}</div>
                            <h3 className="font-bold text-[15px] text-slate-900 leading-snug line-clamp-2 group-hover:text-sky-700 transition-colors mt-0.5">
                              {c.name}
                            </h3>
                          </div>
                        </div>

                        {preview && (
                          <p className="mt-3 text-[13px] text-slate-600 line-clamp-3 leading-relaxed">
                            {preview}
                          </p>
                        )}

                        {highlights.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {highlights.slice(0, 3).map((h, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-[12px] text-slate-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{h}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {c.mode && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                              <BookOpen className="w-3 h-3" /> {c.mode}
                            </span>
                          )}
                          {c.duration && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <Clock className="w-3 h-3" /> {c.duration}
                            </span>
                          )}
                          {c.fees && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                              ₹{typeof c.fees === "number" ? c.fees.toLocaleString("en-IN") : c.fees}
                            </span>
                          )}
                          {c.start_date && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                              <Calendar className="w-3 h-3" /> {c.start_date}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">View full details</span>
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 group-hover:text-sky-900">
                            Open <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                )}

              </SectionShell>
            )}

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

      {/* Course detail dialog */}
      <Dialog open={!!openCourse} onOpenChange={(v) => !v && setOpenCourse(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {openCourse && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white grid place-items-center shadow-md">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-sky-700 font-bold">{institute.name}</div>
                    <DialogTitle className="text-xl text-left leading-tight">{openCourse.name}</DialogTitle>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {openCourse.mode && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100"><BookOpen className="w-3 h-3" /> {openCourse.mode}</span>}
                {openCourse.duration && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"><Clock className="w-3 h-3" /> {openCourse.duration}</span>}
                {openCourse.fees && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">₹{typeof openCourse.fees === "number" ? openCourse.fees.toLocaleString("en-IN") : openCourse.fees}</span>}
                {openCourse.start_date && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100"><Calendar className="w-3 h-3" /> {openCourse.start_date}</span>}
                {openCourse.eligibility && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">Eligibility: {openCourse.eligibility}</span>}
              </div>

              {Array.isArray(openCourse.highlights) && openCourse.highlights.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Key Highlights</h4>
                  <ul className="mt-2 grid sm:grid-cols-2 gap-1.5">
                    {openCourse.highlights.map((h: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {openCourse.description && (
                <div className="mt-5">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">About this Program</h4>
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-a:text-sky-700 prose-table:text-sm"
                    dangerouslySetInnerHTML={{ __html: openCourse.description }}
                  />
                </div>
              )}

              {Array.isArray(openCourse.curriculum) && openCourse.curriculum.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Curriculum</h4>
                  <ol className="mt-2 grid sm:grid-cols-2 gap-1.5 list-decimal list-inside text-sm text-slate-700">
                    {openCourse.curriculum.map((m: string, i: number) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ol>
                </div>
              )}

              {openCourse.batch_info && (
                <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-sm text-slate-700">
                  <span className="font-semibold text-sky-800">Batch info: </span>{openCourse.batch_info}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <a href="#enquiry" onClick={() => setOpenCourse(null)} className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700">Enquire about this course</Button>
                </a>
                {openCourse.brochure_url && (
                  <a href={openCourse.brochure_url} target="_blank" rel="noreferrer">
                    <Button variant="outline">Download brochure</Button>
                  </a>
                )}
                {institute.phone && (
                  <a href={`tel:${institute.phone}`}>
                    <Button variant="outline" className="gap-1.5"><Phone className="w-4 h-4" /> Call</Button>
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
    <div className="rounded-2xl border bg-white p-5 md:p-6 shadow-sm overflow-x-auto">{children}</div>
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
