import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, Banknote, Clock, Users, Award, ExternalLink, FileText, Sparkles, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";
import EligibilityChecklist from "@/components/college/EligibilityChecklist";
import { useCollegeBySlug } from "@/hooks/useInstitutes";
import { useProgrammeBySlug, useProgrammeCourses } from "@/hooks/useProgrammeCourses";

const ProgrammeDetailPage = () => {
  const { slug, programmeSlug } = useParams<{ slug: string; programmeSlug: string }>();
  const navigate = useNavigate();
  const { data: college, isLoading: collegeLoading } = useCollegeBySlug(slug);
  const { data: programme, isLoading: progLoading } = useProgrammeBySlug(college?.id, programmeSlug);
  const { data: allProgrammes } = useProgrammeCourses(college?.id);

  if (collegeLoading || progLoading) {
    return (
      <div className="min-h-screen container mx-auto px-4 py-12 space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!college || !programme) {
    return (
      <div className="min-h-screen container mx-auto px-4 py-20 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">Programme not found</h1>
        <p className="text-muted-foreground mt-2">This MBA programme may have been removed or moved.</p>
        <Button asChild className="mt-6"><Link to={`/college/${slug}`}>Back to college</Link></Button>
      </div>
    );
  }

  const peerProgrammes = (allProgrammes || []).filter((p) => p.id !== programme.id).slice(0, 4);
  const title = `${programme.name} at ${college.name} — Eligibility, Fees & Admission ${programme.fees_year || ""}`.trim();
  const description = `Complete guide to ${programme.short_name || programme.name} at ${college.name}: eligibility checklist, accepted exams, fees ₹${programme.fees_total_lakhs || "—"} L, duration, specialisations and source-verified admission details.`.slice(0, 160);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={title.slice(0, 60)}
        description={description}
        canonical={`https://mbacompass.in/college/${slug}/programme/${programmeSlug}`}
        keywords={[
          programme.name,
          `${programme.short_name || programme.name} eligibility`,
          `${programme.short_name || programme.name} fees`,
          `${college.name} ${programme.programme_type}`,
          `${college.name} admission`,
          `MBA programme ${college.city}`,
        ]}
      />

      {/* Hero */}
      <header className="hero-gradient py-10 md:py-16">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/20 mb-3 text-xs">
              <GraduationCap className="w-3.5 h-3.5 mr-1" /> {programme.programme_type}
            </Badge>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground leading-tight">
              {programme.name}
            </h1>
            <Link to={`/college/${slug}`} className="inline-flex items-center gap-1.5 text-primary-foreground/80 hover:text-primary-foreground mt-3 text-sm">
              <Building2 className="w-4 h-4" /> {college.name}
              {college.city && <span className="opacity-60">· <MapPin className="w-3 h-3 inline" /> {college.city}</span>}
            </Link>
            <div className="flex flex-wrap gap-2 mt-5">
              {programme.duration && (
                <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20">
                  <Clock className="w-3.5 h-3.5 mr-1" /> {programme.duration}
                </Badge>
              )}
              {programme.mode && (
                <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20">
                  {programme.mode}
                </Badge>
              )}
              {programme.fees_total_lakhs && (
                <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20">
                  <Banknote className="w-3.5 h-3.5 mr-1" /> ₹{programme.fees_total_lakhs} L total
                </Badge>
              )}
              {programme.intake_seats && (
                <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20">
                  <Users className="w-3.5 h-3.5 mr-1" /> {programme.intake_seats} seats
                </Badge>
              )}
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 grid gap-8 lg:grid-cols-3 min-w-0">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <EligibilityChecklist programme={programme} />

          {/* Specialisations */}
          {programme.specializations && programme.specializations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Specialisations & Electives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {programme.specializations.map((s) => (
                    <Badge key={s} variant="outline" className="text-sm py-1.5 px-3">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fees breakdown */}
          {(programme.fees_breakdown || programme.fees_total_lakhs) && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" /> Fees & What's Included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Fees</div>
                    <div className="font-heading text-2xl font-extrabold text-primary mt-1">
                      {programme.fees_total_lakhs ? `₹${programme.fees_total_lakhs} L` : "—"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cycle</div>
                    <div className="font-heading text-lg font-bold text-foreground mt-1">{programme.fees_year || "—"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mode</div>
                    <div className="font-heading text-lg font-bold text-foreground mt-1">{programme.mode || "—"}</div>
                  </div>
                </div>
                {programme.fees_breakdown && (
                  <p className="text-sm text-muted-foreground">{programme.fees_breakdown}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Highlights */}
          {programme.highlights && programme.highlights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" /> Programme Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {programme.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {h}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Source Verification</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {programme.source_url ? (
                <a href={programme.source_url} target="_blank" rel="noreferrer noopener nofollow" className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground">Official programme page</div>
                    <div className="text-[10px] text-muted-foreground truncate">{programme.source_url.replace(/^https?:\/\//, "").slice(0, 40)}…</div>
                  </div>
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">No verified source on file.</p>
              )}
              {programme.source_brochure_url && (
                <a href={programme.source_brochure_url} target="_blank" rel="noreferrer noopener nofollow" className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all">
                  <FileText className="w-4 h-4 text-primary" />
                  <div className="text-xs font-semibold text-foreground">Programme brochure (PDF)</div>
                </a>
              )}
              {programme.source_verified_at && (
                <p className="text-[10px] text-muted-foreground">
                  Last verified: {new Date(programme.source_verified_at).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          {peerProgrammes.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">Other programmes here</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {peerProgrammes.map((p) => (
                  <Link key={p.id} to={`/college/${slug}/programme/${p.slug}`} className="block p-3 rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all">
                    <div className="text-sm font-semibold text-foreground">{p.short_name || p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.duration || "—"} · {p.fees_total_lakhs ? `₹${p.fees_total_lakhs} L` : "—"}</div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Button asChild className="w-full">
            <Link to={`/compare/programmes?from=${slug}`}>Compare with other MBA programmes</Link>
          </Button>
        </aside>
      </main>
    </div>
  );
};

export default ProgrammeDetailPage;
