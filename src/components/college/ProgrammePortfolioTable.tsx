import { motion } from "framer-motion";
import { ShieldCheck, Clock, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProgrammeCourse } from "@/hooks/useProgrammeCourses";

interface Props {
  collegeSlug: string;
  programmes: ProgrammeCourse[];
  fallbackCourses?: { name?: string; duration?: string; eligibility?: string; fees?: string; specializations?: string | string[] }[];
}

const acceptedExamLabels = (p: ProgrammeCourse) => {
  const arr: string[] = [];
  if (p.accepts_cat) arr.push("CAT");
  if (p.accepts_xat) arr.push("XAT");
  if (p.accepts_gmat) arr.push("GMAT");
  if (p.accepts_gre) arr.push("GRE");
  if (p.accepts_cmat) arr.push("CMAT");
  if (p.accepts_nmat) arr.push("NMAT");
  if (p.accepts_snap) arr.push("SNAP");
  if (p.accepts_iift) arr.push("IIFT");
  if (Array.isArray(p.accepts_other_exams)) arr.push(...p.accepts_other_exams);
  return arr;
};

const eligibilitySummary = (p: ProgrammeCourse) => {
  const bits: string[] = [];
  if (p.min_graduation_percent != null) bits.push(`Grad ≥ ${p.min_graduation_percent}%`);
  if (p.accepts_cat && p.cat_percentile_target) bits.push(`CAT ${p.cat_percentile_target}%`);
  if (p.accepts_xat && p.xat_percentile_target) bits.push(`XAT ${p.xat_percentile_target}%`);
  if (p.accepts_gmat && p.gmat_score_target) bits.push(`GMAT ${p.gmat_score_target}`);
  if ((p.min_work_ex_months || 0) > 0) bits.push(`Work-ex ≥ ${Math.round((p.min_work_ex_months || 0) / 12)}y`);
  return bits.join(" · ") || "—";
};

const ProgrammePortfolioTable = ({ programmes, fallbackCourses }: Props) => {
  const hasVerified = programmes && programmes.length > 0;

  if (!hasVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> Programme Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fallbackCourses && fallbackCourses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Programme</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Duration</th>
                    <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Eligibility</th>
                    <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {fallbackCourses.map((c, i) => (
                    <tr key={i} className="border-b border-border hover:bg-muted/30">
                      <td className="py-3 px-3 font-medium text-foreground">{c.name}</td>
                      <td className="py-3 px-3 text-muted-foreground">{c.duration || "—"}</td>
                      <td className="py-3 px-3 text-muted-foreground">{c.eligibility || "—"}</td>
                      <td className="py-3 px-3 text-right font-heading font-bold text-primary">{c.fees || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Programme portfolio coming soon.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/60 shadow-md">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-heading flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            Programme Portfolio
            <Badge variant="secondary" className="ml-1 text-[10px] uppercase tracking-wider">
              {programmes.length} programmes
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Source-verified
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border min-w-[200px]">Programme</th>
                <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Duration</th>
                <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border min-w-[140px]">Exams</th>
                <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border min-w-[180px]">Specialisations</th>
                <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border min-w-[200px]">Eligibility</th>
                <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border whitespace-nowrap">Seats</th>
                <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border whitespace-nowrap min-w-[110px]">Fees</th>
              </tr>
            </thead>
            <tbody>
              {programmes.map((p, i) => {
                const exams = acceptedExamLabels(p);
                const specs = p.specializations || [];
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="border-b border-border hover:bg-muted/30"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-foreground">{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">{p.programme_type}</Badge>
                        {p.mode && <span className="text-[10px] text-muted-foreground">{p.mode}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                        {p.duration || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {exams.length === 0 && <span className="text-xs text-muted-foreground">Profile-based</span>}
                        {exams.slice(0, 4).map((e) => (
                          <Badge key={e} variant="secondary" className="text-[10px] py-0 px-1.5">{e}</Badge>
                        ))}
                        {exams.length > 4 && <span className="text-[10px] text-muted-foreground">+{exams.length - 4}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {specs.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {specs.slice(0, 3).map((s) => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{s}</span>
                        ))}
                        {specs.length > 3 && <span className="text-[10px] text-muted-foreground self-center">+{specs.length - 3}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{eligibilitySummary(p)}</td>
                    <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{p.intake_seats || "—"}</td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="font-heading font-bold text-primary">
                        {p.fees_total_lakhs ? `₹${p.fees_total_lakhs} L` : "—"}
                      </div>
                      {p.fees_year && <div className="text-[10px] text-muted-foreground">{p.fees_year}</div>}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgrammePortfolioTable;
