import { Link } from "react-router-dom";

import {
  MapPin, Star, Award, Users, GraduationCap, TrendingUp, ChevronRight,
  BadgeCheck, Trophy, BookOpen, Calendar, IndianRupee, Briefcase, ShieldCheck,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  college: any;
  index?: number;
  rank?: number;
}

const CollegeListingCard = ({ college, index = 0, rank }: Props) => {
  const exams = college.exams_accepted || [];
  const specs = college.specializations || [];
  const recruiters = college.top_recruiters || [];
  const accreditations = college.accreditations || [];
  const displayRank = college.ranking || rank;

  return (
    <div className="animate-fade-in">
      <Link
        to={`/college/${college.slug}`}
        className="group relative block bg-card rounded-2xl border border-border hover:border-primary/40 hover:shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.3)] hover:-translate-y-1 transition-all duration-500 overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Top-3 corner ribbon */}
        {displayRank && displayRank <= 3 && (
          <div className="absolute -right-12 top-5 rotate-45 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-12 py-1 shadow-lg z-10">
            TOP {displayRank}
          </div>
        )}

        <div className="flex flex-col md:flex-row">
          {/* ===== LEFT: Identity ===== */}
          <div className="md:w-72 flex-shrink-0 p-5 md:border-r border-border bg-gradient-to-br from-muted/30 to-transparent">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                {college.logo_url ? (
                  <img src={college.logo_url} alt={college.name} loading="lazy" className="w-12 h-12 object-contain" />
                ) : (
                  <GraduationCap className="w-7 h-7 text-primary" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                {displayRank && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 px-2 py-0.5 rounded-md mb-1.5 uppercase tracking-wider">
                    <Trophy className="w-2.5 h-2.5" /> Rank #{displayRank}
                  </div>
                )}
                <h3 className="font-heading font-extrabold text-foreground text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {college.name}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="line-clamp-1">{college.city}{college.state ? `, ${college.state}` : ""}</span>
                </div>
              </div>
            </div>

            {/* Type / Tier / Established */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {college.tier && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-2.5 h-2.5" /> {college.tier}
                </span>
              )}
              {college.type && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground bg-muted border border-border px-2 py-0.5 rounded-md">
                  <Building2 className="w-2.5 h-2.5" /> {college.type}
                </span>
              )}
              {college.established && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md">
                  <Calendar className="w-2.5 h-2.5" /> Est. {college.established}
                </span>
              )}
            </div>

            {/* Accreditations */}
            {accreditations.length > 0 && (
              <div className="pt-3 border-t border-border">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                  <BadgeCheck className="w-2.5 h-2.5" /> Accreditations
                </div>
                <div className="flex flex-wrap gap-1">
                  {accreditations.slice(0, 4).map((a: string) => (
                    <span key={a} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Campus / Students */}
            {(college.campus_size || college.total_students) && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
                {college.total_students && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span><span className="font-bold text-foreground">{college.total_students}+</span> Students</span>
                  </div>
                )}
                {college.campus_size && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span className="font-semibold text-foreground">{college.campus_size}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== CENTER: Detailed Content ===== */}
          <div className="flex-1 p-5 min-w-0">
            {college.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                {college.description.replace(/<[^>]+>/g, "")}
              </p>
            )}

            {/* Key Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3 mb-4 pb-4 border-b border-dashed border-border">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  <IndianRupee className="w-2.5 h-2.5" /> Total Fees
                </div>
                <p className="text-sm font-extrabold text-foreground leading-tight">{college.fees || "—"}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  <TrendingUp className="w-2.5 h-2.5" /> Avg CTC
                </div>
                <p className="text-sm font-extrabold text-foreground leading-tight">{college.placement_avg || "—"}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  <Star className="w-2.5 h-2.5" /> Highest CTC
                </div>
                <p className="text-sm font-extrabold text-foreground leading-tight">{college.placement_highest || "—"}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  <Award className="w-2.5 h-2.5" /> Median CTC
                </div>
                <p className="text-sm font-extrabold text-foreground leading-tight">{college.placement_median || "—"}</p>
              </div>
            </div>

            {/* Exams Accepted */}
            {exams.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                  <BookOpen className="w-2.5 h-2.5" /> Exams Accepted
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {exams.slice(0, 5).map((e: string) => (
                    <span key={e} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/15">
                      {e}
                    </span>
                  ))}
                  {exams.length > 5 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      +{exams.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Specializations */}
            {specs.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                  <GraduationCap className="w-2.5 h-2.5" /> Specializations
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {specs.slice(0, 4).map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-[10px] font-medium">{s}</Badge>
                  ))}
                  {specs.length > 4 && (
                    <Badge variant="secondary" className="text-[10px] font-medium">+{specs.length - 4}</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Top Recruiters */}
            {recruiters.length > 0 && (
              <div className="flex items-start gap-2">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Top Recruiters: </span>
                  <span className="line-clamp-1">{recruiters.slice(0, 5).join(" · ")}{recruiters.length > 5 ? ` +${recruiters.length - 5}` : ""}</span>
                </div>
              </div>
            )}
          </div>

          {/* ===== RIGHT: CTA ===== */}
          <div className="flex md:flex-col items-center justify-between md:justify-center gap-3 p-5 md:w-48 flex-shrink-0 md:border-l border-t md:border-t-0 border-border bg-gradient-to-br from-primary/5 via-muted/20 to-transparent">
            <div className="text-center">
              {college.fees_lakhs ? (
                <>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">Total Fees</span>
                  <span className="font-heading font-extrabold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent text-2xl block leading-none mt-1">
                    ₹{college.fees_lakhs}L
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Full Program</span>
                </>
              ) : (
                <>
                  <Award className="w-7 h-7 text-primary mx-auto mb-1" />
                  <span className="font-heading font-extrabold text-foreground text-base block">View College</span>
                </>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-2 w-full max-w-[160px]">
              <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary/85 text-primary-foreground font-bold text-xs group-hover:shadow-lg group-hover:shadow-primary/30 transition-all">
                View Details <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 font-medium">
                <BadgeCheck className="w-2.5 h-2.5 text-primary" /> Free Brochure
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default CollegeListingCard;
