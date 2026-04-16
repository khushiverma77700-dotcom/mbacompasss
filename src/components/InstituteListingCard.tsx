import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Star, Award, Building, Building2, Monitor, Wifi, Users, GraduationCap,
  TrendingUp, ArrowRight, Sparkles, Clock, BadgeCheck, Trophy, BookOpen, Tag, Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLocationImage } from "@/data/cityImages";

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
  const heroImg = inst.banner_url || getLocationImage(inst.city, inst.state);
  const courses = inst.courses || [];
  const faculty = inst.faculty || [];
  const features = inst.features || [];
  const specs = inst.specializations || [];
  const startingFee = courses[0]?.fees ? Number(courses[0].fees) : null;
  const successPct = inst.success_rate || 0;
  const ratingPct = inst.rating ? (Number(inst.rating) / 5) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.35), duration: 0.45 }}
      whileHover={{ y: -4 }}
    >
      <Link
        to={`/institute/${inst.slug}`}
        className="group relative block bg-card rounded-3xl shadow-md hover:shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.35)] transition-all duration-500 border border-border hover:border-primary/40 overflow-hidden"
      >
        {/* Decorative gradient accent ring on hover */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.06), transparent 40%, hsl(var(--primary)/0.05))" }} />

        <div className="flex flex-col lg:flex-row relative">
          {/* ===== LEFT: Hero Image + Brand ===== */}
          <div className="relative lg:w-80 h-56 lg:h-auto flex-shrink-0 overflow-hidden">
            <img
              src={heroImg}
              alt={inst.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
            />
            {/* Multi-layer gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent mix-blend-overlay" />

            {/* Decorative corner mesh */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

            {/* Rank ribbon */}
            {rank !== undefined && rank <= 10 && (
              <div className="absolute top-0 left-0 z-10">
                <div className="relative bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 font-extrabold px-3 py-1.5 pr-5 shadow-lg flex items-center gap-1 text-xs uppercase tracking-wider">
                  <Trophy className="w-3.5 h-3.5" /> Rank #{rank}
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-card" style={{ clipPath: "polygon(100% 0, 0 50%, 100% 100%)" }} />
                </div>
              </div>
            )}

            {/* Top right: Rating pill */}
            {inst.rating > 0 && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1.5 rounded-full ring-1 ring-white/20">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {inst.rating}
                <span className="text-white/60 font-normal text-[10px]">({inst.total_reviews || 0})</span>
              </div>
            )}

            {/* Mid badges */}
            <div className="absolute top-12 left-3 flex flex-col gap-1.5">
              {inst.featured && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" /> Featured
                </span>
              )}
              <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur text-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
                <ModeIcon mode={inst.mode} /> {inst.mode || "Offline"}
              </span>
              {inst.discount && (
                <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg">
                  <Flame className="w-2.5 h-2.5" /> {inst.discount}
                </span>
              )}
            </div>

            {/* Bottom: Logo + Name + Location */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              <div className="flex items-end gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-2xl flex items-center justify-center flex-shrink-0 ring-2 ring-white/50">
                  {inst.logo_url ? (
                    <img src={inst.logo_url} alt="" className="w-11 h-11 object-contain rounded-lg" />
                  ) : (
                    <span className="font-extrabold text-primary text-xl">{inst.name?.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-extrabold text-white line-clamp-1 text-lg drop-shadow-lg leading-tight">
                    {inst.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-white/95 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-1">{inst.city}{inst.state ? `, ${inst.state}` : ""}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CENTER: Rich Content ===== */}
          <div className="flex-1 p-5 bg-gradient-to-br from-background via-background to-muted/20 min-w-0">
            {/* Quick highlight badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {inst.fees_lakhs && (
                <Badge variant="outline" className="text-[10px] gap-1 font-semibold border-primary/30 text-primary bg-primary/5">
                  <Tag className="w-2.5 h-2.5" /> ₹{inst.fees_lakhs}L
                </Badge>
              )}
              {features.slice(0, 2).map((f: string) => (
                <Badge key={f} variant="outline" className="text-[10px] gap-1 font-medium">
                  <BadgeCheck className="w-2.5 h-2.5 text-emerald-600" /> {f}
                </Badge>
              ))}
              {specs.slice(0, 2).map((s: string) => (
                <Badge key={s} variant="secondary" className="text-[10px] font-medium">{s}</Badge>
              ))}
            </div>

            {/* Description preview */}
            {inst.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                {inst.description.replace(/<[^>]+>/g, "")}
              </p>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 p-2.5">
                <div className="flex items-center gap-1 text-[9px] text-amber-700 dark:text-amber-400 uppercase tracking-wider font-bold mb-1">
                  <Star className="w-2.5 h-2.5" /> Rating
                </div>
                <p className="text-base font-extrabold text-foreground leading-none">
                  {inst.rating || "—"}
                  <span className="text-[10px] text-muted-foreground font-normal ml-0.5">/5</span>
                </p>
                <div className="mt-1.5 h-1 rounded-full bg-amber-100 dark:bg-amber-950/50 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-700" style={{ width: `${ratingPct}%` }} />
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-950/30 dark:to-emerald-950/10 border border-emerald-200/60 dark:border-emerald-900/40 p-2.5">
                <div className="flex items-center gap-1 text-[9px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-bold mb-1">
                  <TrendingUp className="w-2.5 h-2.5" /> Success
                </div>
                <p className="text-base font-extrabold text-foreground leading-none">
                  {successPct ? `${successPct}%` : "—"}
                </p>
                <div className="mt-1.5 h-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700" style={{ width: `${Math.min(successPct, 100)}%` }} />
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-sky-50 to-sky-100/40 dark:from-sky-950/30 dark:to-sky-950/10 border border-sky-200/60 dark:border-sky-900/40 p-2.5">
                <div className="flex items-center gap-1 text-[9px] text-sky-700 dark:text-sky-400 uppercase tracking-wider font-bold mb-1">
                  <Users className="w-2.5 h-2.5" /> Students
                </div>
                <p className="text-base font-extrabold text-foreground leading-none">
                  {inst.students_count ? `${inst.students_count >= 1000 ? `${(inst.students_count / 1000).toFixed(1)}K` : inst.students_count}+` : "—"}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">Enrolled</p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/40 dark:from-violet-950/30 dark:to-violet-950/10 border border-violet-200/60 dark:border-violet-900/40 p-2.5">
                <div className="flex items-center gap-1 text-[9px] text-violet-700 dark:text-violet-400 uppercase tracking-wider font-bold mb-1">
                  <BookOpen className="w-2.5 h-2.5" /> Courses
                </div>
                <p className="text-base font-extrabold text-foreground leading-none">
                  {courses.length || "—"}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">Available</p>
              </div>
            </div>

            {/* Course chips strip */}
            {courses.length > 0 && (
              <div className="flex items-center gap-2 pt-3 border-t border-dashed border-border">
                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
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

            {/* Faculty hint */}
            {faculty.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                <div className="flex -space-x-1.5">
                  {faculty.slice(0, 3).map((f: any, idx: number) => (
                    <div key={idx} className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/60 ring-2 ring-card flex items-center justify-center text-[8px] text-primary-foreground font-bold">
                      {f.name?.charAt(0) || "F"}
                    </div>
                  ))}
                </div>
                <span><span className="font-bold text-foreground">{faculty.length}+</span> Expert Faculty</span>
              </div>
            )}
          </div>

          {/* ===== RIGHT: CTA Panel ===== */}
          <div className="flex lg:flex-col items-center justify-between lg:justify-center gap-3 p-5 lg:w-48 flex-shrink-0 bg-gradient-to-br from-primary/8 via-primary/5 to-primary/12 border-t lg:border-t-0 lg:border-l border-border relative overflow-hidden">
            {/* Decorative blob */}
            <div className="pointer-events-none absolute -bottom-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

            <div className="text-center relative">
              {startingFee ? (
                <>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold block">Starts From</span>
                  <span className="font-heading font-extrabold text-primary text-2xl block leading-none mt-0.5">
                    ₹{(startingFee / 1000).toFixed(0)}K
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">per course</span>
                </>
              ) : (
                <>
                  <Award className="w-7 h-7 text-primary mx-auto mb-1" />
                  <span className="font-heading font-extrabold text-primary text-base block">View Fees</span>
                </>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 relative w-full">
              <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-extrabold text-xs group-hover:gap-3 transition-all shadow-lg shadow-primary/30 w-full">
                Explore <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Free Counselling
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default InstituteListingCard;
