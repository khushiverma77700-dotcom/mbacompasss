import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Star, Monitor, Building, Wifi, Users, GraduationCap,
  TrendingUp, BadgeCheck, Trophy, BookOpen, Phone, ShieldCheck, ChevronRight,
  Scale, Check, Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCoachingCompare } from "@/contexts/CoachingCompareContext";

interface Props {
  inst: any;
  index?: number;
  rank?: number;
}

const ModeIcon = ({ mode }: { mode?: string }) =>
  mode === "Online" ? <Monitor className="w-3 h-3" /> :
  mode === "Hybrid" ? <Wifi className="w-3 h-3" /> :
  <Building className="w-3 h-3" />;

const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

const InstituteGridCard = ({ inst, index = 0, rank }: Props) => {
  const courses = (inst.courses || []) as any[];
  const features = inst.features || [];
  const specs = inst.specializations || [];

  const feeNums = courses
    .map((c: any) => Number(String(c.fees ?? "").replace(/[^0-9.]/g, "")))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  const minFee = feeNums.length ? Math.min(...feeNums) : null;
  const maxFee = feeNums.length ? Math.max(...feeNums) : null;
  const feeDisplay =
    minFee != null && maxFee != null
      ? minFee === maxFee ? fmt(minFee) : `${fmt(minFee)} – ${fmt(maxFee)}`
      : inst.fees_lakhs ? `₹${inst.fees_lakhs}L` : null;

  const compare = useCoachingCompare();
  const isInCompare = compare.has(inst.id);

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    compare.toggle({ id: inst.id, name: inst.name, slug: inst.slug, logo_url: inst.logo_url, city: inst.city, rating: inst.rating });
  };

  const tags = [...specs.slice(0, 2), ...features.slice(0, 2)].slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.4 }}
      className="relative h-full"
    >
      <button
        onClick={handleCompareToggle}
        aria-label={isInCompare ? "Remove from compare" : "Add to compare"}
        className={`absolute top-3 right-3 z-10 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border-2 transition-all ${
          isInCompare
            ? "bg-sky-600 text-white border-sky-600 shadow-md"
            : "bg-white/95 backdrop-blur text-slate-700 border-slate-200 hover:border-sky-400 hover:text-sky-700"
        }`}
      >
        {isInCompare ? <Check className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
        {isInCompare ? "Added" : "Compare"}
      </button>

      <Link
        to={`/institute/${inst.slug}`}
        className="group relative flex flex-col h-full bg-card rounded-2xl border border-border hover:border-primary/40 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.25)] transition-all duration-300 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* HEADER */}
        <div className="p-5 pb-4 border-b border-border bg-gradient-to-br from-muted/30 to-transparent">
          <div className="flex items-start gap-3 pr-24">
            <div className="w-14 h-14 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
              {inst.logo_url ? (
                <img src={inst.logo_url} alt={inst.name} loading="lazy" className="w-12 h-12 object-contain" />
              ) : (
                <span className="font-heading font-extrabold text-primary text-xl">{inst.name?.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {rank !== undefined && rank <= 50 && (
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md mb-1.5 uppercase tracking-wider">
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

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {inst.featured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-2.5 h-2.5" /> Verified
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground bg-muted border border-border px-2 py-0.5 rounded-md">
              <ModeIcon mode={inst.mode} /> {inst.mode || "Offline"}
            </span>
            {inst.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                <Star className="w-2.5 h-2.5 fill-current" /> {inst.rating}
                {inst.total_reviews ? <span className="font-normal text-amber-700/70">({inst.total_reviews})</span> : null}
              </span>
            )}
            {inst.offer && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <Tag className="w-2.5 h-2.5" /> Offer
              </span>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 flex-1 flex flex-col gap-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={TrendingUp} label="Success" value={inst.success_rate ? `${inst.success_rate}%` : "—"} />
            <Stat icon={Users} label="Students" value={inst.students_count ? (inst.students_count >= 1000 ? `${(inst.students_count / 1000).toFixed(1)}K+` : `${inst.students_count}+`) : "—"} />
            <Stat icon={BookOpen} label="Courses" value={courses.length || "—"} />
          </div>

          {inst.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {inst.description.replace(/<[^>]+>/g, "")}
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {specs.slice(0, 2).map((s: string) => (
                <Badge key={s} variant="secondary" className="text-[10px] font-medium">{s}</Badge>
              ))}
              {features.slice(0, 2).map((f: string) => (
                <Badge key={f} variant="outline" className="text-[10px] gap-1 font-medium">
                  <BadgeCheck className="w-2.5 h-2.5 text-emerald-600" /> {f}
                </Badge>
              ))}
            </div>
          )}

          {courses.length > 0 && (
            <div className="flex items-start gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                {courses.slice(0, 3).map((c: any) => (
                  <span key={c.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/15 line-clamp-1">
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

        {/* FOOTER */}
        <div className="mt-auto p-5 pt-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <div>
            {feeDisplay ? (
              <>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">Fee Range</span>
                <span className="font-heading font-extrabold text-foreground text-base block leading-tight mt-0.5">
                  {feeDisplay}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="w-2.5 h-2.5" /> Free Counselling
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">View</span>
                <span className="font-heading font-extrabold text-foreground text-base block mt-0.5">Pricing</span>
              </>
            )}
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs group-hover:bg-primary/90 transition-all shadow-sm whitespace-nowrap">
            View Details <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const Stat = ({ icon: Icon, label, value }: any) => (
  <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
    <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
      <Icon className="w-2.5 h-2.5" /> {label}
    </div>
    <p className="text-sm font-extrabold text-foreground leading-none">{value}</p>
  </div>
);

export default InstituteGridCard;
