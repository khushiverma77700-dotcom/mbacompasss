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
import { ArrowLeft, MapPin, Star, Building2, Globe, Phone, Mail, MessageCircle, ChevronRight, Users, Award, Sparkles } from "lucide-react";
import InstituteSectionRenderer from "@/components/institute/InstituteSectionRenderer";
import { INSTITUTE_SECTIONS, getSection, isSectionEmpty } from "@/lib/instituteSections";

const InstitutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string>("");

  const { data: institute, isLoading } = useQuery({
    queryKey: ["institute_full", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutes")
        .select(`
          *,
          institute_courses(course:courses(id, name, slug, fees, duration, mode, description, category_id))
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

  // Active sections (enabled + has data)
  const activeSections = useMemo(() => {
    if (!institute) return [];
    const sections = institute.sections || {};
    return INSTITUTE_SECTIONS.filter((def) => {
      const s = getSection(sections, def.id);
      return s.enabled && !isSectionEmpty(def, s.data);
    });
  }, [institute]);

  // ToC scrollspy
  useEffect(() => {
    const onScroll = () => {
      const offsets = activeSections.map((s) => {
        const el = document.getElementById(`sec-${s.id}`);
        return { id: s.id, top: el?.getBoundingClientRect().top ?? 99999 };
      });
      const current = offsets.filter((o) => o.top <= 120).pop();
      if (current) setActiveId(current.id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeSections]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-4">
        <Skeleton className="h-44 w-full" />
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

  const isHybrid = institute.institute_type === "hybrid";
  const seoSchema = generateInstituteSchema(institute);

  return (
    <>
      <SEOHead
        title={institute.meta_title || `${institute.name} — Coaching Institute${institute.city ? ` in ${institute.city}` : ""} | MBA Compass`}
        description={institute.meta_description || institute.description || `${institute.name} offers MBA coaching with comprehensive programs.`}
        canonical={`${window.location.origin}/institute/${institute.slug}`}
        jsonLd={seoSchema}
        ogImage={institute.banner_url || institute.logo_url || undefined}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-sky-50 via-white to-blue-50 border-b">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Link to="/coaching" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-3 h-3 mr-1" /> All coaching institutes
          </Link>
          <div className="flex items-start gap-4 flex-wrap">
            {institute.logo_url && (
              <img src={institute.logo_url} alt={institute.name} className="w-20 h-20 rounded-xl border bg-white object-contain p-1 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  {isHybrid ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                  {isHybrid ? "Hybrid (Online + Offline)" : "City-wise"}
                </Badge>
                {institute.featured && <Badge className="gap-1"><Sparkles className="w-3 h-3" /> Featured</Badge>}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mt-2">{institute.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                {institute.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {institute.city}{institute.state ? `, ${institute.state}` : ""}</span>}
                {institute.rating ? <span className="inline-flex items-center gap-1 text-amber-600"><Star className="w-3.5 h-3.5 fill-current" /> {institute.rating}</span> : null}
                {institute.students_count ? <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {institute.students_count.toLocaleString()}+ students</span> : null}
                {institute.success_rate ? <span className="inline-flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {institute.success_rate}% success</span> : null}
              </div>
              {institute.description && <p className="mt-3 text-sm text-slate-700 max-w-3xl">{institute.description}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="#enquiry"><Button>Book Free Demo</Button></a>
                <a href="#enquiry"><Button variant="outline">Talk to Counselor</Button></a>
                <Link to="/compare"><Button variant="ghost">Compare Coaching</Button></Link>
                <Link to="/coaching-finder"><Button variant="ghost">AI Coaching Finder</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          {/* ToC */}
          {activeSections.length > 1 && (
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-1">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">On this page</div>
                {linkedCourses.length > 0 && (
                  <a href="#courses" className={`block text-xs px-2 py-1.5 rounded hover:bg-muted ${activeId === "courses" ? "bg-primary/10 text-primary font-semibold" : "text-slate-600"}`}>
                    Courses ({linkedCourses.length})
                  </a>
                )}
                {activeSections.map((s) => (
                  <a key={s.id} href={`#sec-${s.id}`}
                    className={`block text-xs px-2 py-1.5 rounded hover:bg-muted ${activeId === s.id ? "bg-primary/10 text-primary font-semibold" : "text-slate-600"}`}>
                    {s.label}
                  </a>
                ))}
              </div>
            </aside>
          )}

          {/* Body */}
          <div className="space-y-8 min-w-0">
            {/* Mobile ToC */}
            {activeSections.length > 1 && (
              <div className="lg:hidden -mx-4 px-4 overflow-x-auto">
                <div className="flex gap-2 whitespace-nowrap pb-2">
                  {linkedCourses.length > 0 && <a href="#courses" className="text-xs border rounded-full px-3 py-1.5">Courses</a>}
                  {activeSections.map((s) => (
                    <a key={s.id} href={`#sec-${s.id}`} className="text-xs border rounded-full px-3 py-1.5">{s.label}</a>
                  ))}
                </div>
              </div>
            )}

            {/* Linked courses */}
            {linkedCourses.length > 0 && (
              <section id="courses">
                <h2 className="text-xl font-bold mb-3">Courses Available</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {linkedCourses.map((c: any) => (
                    <Card key={c.id}>
                      <CardContent className="p-4">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {[c.duration, c.mode, c.fees].filter(Boolean).join(" · ")}
                        </div>
                        {c.description && <p className="text-sm text-slate-700 mt-2 line-clamp-3">{c.description}</p>}
                        <div className="mt-2">
                          {c.slug ? (
                            <Link to={`/course/${c.slug}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                              View course <ChevronRight className="w-3 h-3" />
                            </Link>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Dynamic sections */}
            {activeSections.map((def) => {
              const { data } = getSection(institute.sections, def.id);
              return (
                <section key={def.id} id={`sec-${def.id}`} className="scroll-mt-20">
                  <h2 className="text-xl font-bold mb-3">{def.label}</h2>
                  <InstituteSectionRenderer def={def} data={data} />
                </section>
              );
            })}

            {/* Enquiry */}
            <section id="enquiry" className="scroll-mt-20">
              <Card className="bg-gradient-to-br from-sky-50 to-white border-sky-100">
                <CardContent className="p-5">
                  <h2 className="text-xl font-bold">Get in touch with {institute.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Submit your details and an advisor will reach out.</p>
                  <EnquiryForm instituteId={institute.id} instituteName={institute.name} />
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {institute.phone && <a href={`tel:${institute.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" /> {institute.phone}</a>}
                    {institute.whatsapp && <a href={`https://wa.me/${institute.whatsapp.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 hover:text-primary"><MessageCircle className="w-3 h-3" /> WhatsApp</a>}
                    {institute.email && <a href={`mailto:${institute.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="w-3 h-3" /> {institute.email}</a>}
                  </div>
                </CardContent>
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
    </>
  );
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
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-2 mt-3">
      <Input placeholder="Your name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
      <Input placeholder="Phone *" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
      <Input className="md:col-span-2" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
      <Textarea className="md:col-span-2" rows={2} placeholder="Message (optional)" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
      <Button type="submit" className="md:col-span-2" disabled={loading}>{loading ? "Sending…" : "Submit Enquiry"}</Button>
    </form>
  );
};

export default InstitutePage;
