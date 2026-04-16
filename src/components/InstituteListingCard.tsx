import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Star, Award, Building, Monitor, Wifi, Users, GraduationCap,
  TrendingUp, ArrowRight, BadgeCheck, Trophy, BookOpen, Calendar, Phone,
  ShieldCheck, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  inst: any;
  index?: number;
  rank?: number;
}

const ModeIcon = ({ mode }: { mode?: string }) =>
  mode === "Online" ? <Monitor className="w-3 h-3" /> :
  mode === "Hybrid" ? <Wifi className="w-3 h-3" /> :
  <Building className="w-3 h-3" />;

const InstituteListingCard = ({ inst, index = 0, rank }: Props) => {
  const courses = inst.courses || [];
  const faculty = inst.faculty || [];
  const features = inst.features || [];
  const specs = inst.specializations || [];
  const startingFee = courses[0]?.fees ? Number(courses[0].fees) : null;
  const successPct = inst.success_rate || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.4 }}
    >
      <Link
        to={`/institute/${inst.slug}`}
        className="group relative block bg-card rounded-2xl border border-border hover:border-primary/40 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.25)] transition-all duration-300 overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex flex-col md:flex-row">
          {/* ===== LEFT: Identity Block ===== */}
          <div className="md:w-72 flex-shrink-0 p-5 md:border-r border-border bg-gradient-to-br from-muted/30 to-transparent">
            <div className="flex items-start gap-3 mb-4">
              {/* Logo / Initial */}
              <div className="w-14 h-14 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                {inst.logo_url ? (
                  <img src={inst.logo_url} alt={inst.name} loading="lazy" className="w-12 h-12 object-contain" />
                ) : (
                  <span className="font-heading font-extrabold text-primary text-xl">
                    {inst.name?.charAt(0)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {rank !== undefined && rank <= 50 && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 px-2 py-0.5 rounded-md mb-1.5 uppercase tracking-wider">
                    <Trophy className="w-2.5 h-2.5" /> Rank #{rank}
                  </div>
                )}
                <h3 className="font-heading font-extrabold text-foreground text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {inst.name}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="line-clamp-1">{inst.city}{inst.state ? `, ${inst.state}` : ""}</span>
                </div>
              </div>
            </div>

            {/* Verified / Mode badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {inst.featured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground bg-muted border border-border px-2 py-0.5 rounded-md">
                <ModeIcon mode={inst.mode} /> {inst.mode || "Offline"}
              </span>
              {inst.rating > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 px-2 py-0.5 rounded-md">
                  <Star className="w-2.5 h-2.5 fill-current" /> {inst.rating}
                </span>
              )}
            </div>

            {/* Faculty preview */}
            {faculty.length > 0 && (
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <div className="flex -space-x-2">
                  {faculty.slice(0, 4).map((f: any, idx: number) => (
                    <div key={idx} className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/80 to-primary/50 ring-2 ring-card flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                      {f.name?.charAt(0) || "F"}
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  <span className="font-bold text-foreground">{faculty.length}+</span> Expert<br />Faculty
                </div>
              </div>
            )}
          </div>

          {/* ===== CENTER: Detailed Content ===== */}
          <div className="flex-1 p-5 min-w-0">
            {/* Description */}
            {inst.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                {inst.description.replace(/<[^>]+>/g, "")}
              </p>
            )}

            {/* Key Stats — clean horizontal row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3 mb-4 pb-4 border-b border-dashed border-border">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  <Star className="w-2.5 h-2.5" /> Rating
                </div>
                <p className="text-base font-extrabold text-foreground leading-none">
                  {inst.rating || "—"}
                  {inst.total_reviews > 0 && (
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">({inst.total_reviews})</span>
                  )}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  <TrendingUp className="w-2.5 h-2.5" /> Success Rate
                </div>
                <p className="text-base font-extrabold text-foreground leading-none">
                  {successPct ? `${successPct}%` : "—"}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  <Users className="w-2.5 h-2.5" /> Students
                </div>
                <p className="text-base font-extrabold text-foreground leading-none">
                  {inst.students_count ? `${inst.students_count >= 1000 ? `${(inst.students_count / 1000).toFixed(1)}K` : inst.students_count}+` : "—"}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  <BookOpen className="w-2.5 h-2.5" /> Courses
                </div>
                <p className="text-base font-extrabold text-foreground leading-none">
                  {courses.length || "—"}
                </p>
              </div>
            </div>

            {/* Specializations / Features */}
            {(specs.length > 0 || features.length > 0) && (
              <div className="mb-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                  <Award className="w-2.5 h-2.5" /> Specializations
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {specs.slice(0, 3).map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-[10px] font-medium">{s}</Badge>
                  ))}
                  {features.slice(0, 2).map((f: string) => (
                    <Badge key={f} variant="outline" className="text-[10px] gap-1 font-medium">
                      <BadgeCheck className="w-2.5 h-2.5 text-emerald-600" /> {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Course chips */}
            {courses.length > 0 && (
              <div className="flex items-start gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                  {courses.slice(0, 3).map((c: any) => (
                    <span key={c.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/15">
                      {c.name}
                    </span>
                  ))}
                  {courses.length > 3 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      +{courses.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ===== RIGHT: CTA Panel ===== */}
          <div className="flex md:flex-col items-center justify-between md:justify-center gap-3 p-5 md:w-48 flex-shrink-0 md:border-l border-t md:border-t-0 border-border bg-muted/20">
            <div className="text-center">
              {startingFee ? (
                <>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">Starts From</span>
                  <span className="font-heading font-extrabold text-foreground text-xl block leading-none mt-1">
                    ₹{(startingFee / 1000).toFixed(0)}K
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-1">per course</span>
                </>
              ) : inst.fees_lakhs ? (
                <>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">Fees</span>
                  <span className="font-heading font-extrabold text-foreground text-xl block leading-none mt-1">
                    ₹{inst.fees_lakhs}L
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">View</span>
                  <span className="font-heading font-extrabold text-foreground text-base block mt-1">Pricing</span>
                </>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-2 w-full max-w-[160px]">
              <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs group-hover:bg-primary/90 transition-all shadow-sm">
                View Details <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Phone className="w-2.5 h-2.5" /> Free Counselling
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default InstituteListingCard;
