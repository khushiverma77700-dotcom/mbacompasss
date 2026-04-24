import { motion } from "framer-motion";
import { CheckCircle, XCircle, GraduationCap, Briefcase, Calendar, Trophy, BookOpen, ShieldCheck, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProgrammeCourse } from "@/hooks/useProgrammeCourses";

interface Props {
  programme: ProgrammeCourse;
}

const Row = ({ ok, label, value, icon: Icon }: { ok: boolean | null; label: string; value: string; icon: any }) => (
  <motion.div
    initial={{ opacity: 0, x: -8 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors"
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
      ok === true
        ? "bg-emerald-500/10 text-emerald-600"
        : ok === false
          ? "bg-muted text-muted-foreground"
          : "bg-primary/10 text-primary"
    }`}>
      {ok === true ? <CheckCircle className="w-5 h-5" /> : ok === false ? <XCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
    </div>
  </motion.div>
);

const EligibilityChecklist = ({ programme: p }: Props) => {
  const exams = [
    { key: "CAT", ok: p.accepts_cat, target: p.cat_percentile_target },
    { key: "XAT", ok: p.accepts_xat, target: p.xat_percentile_target },
    { key: "GMAT", ok: p.accepts_gmat, target: p.gmat_score_target },
    { key: "GRE", ok: p.accepts_gre, target: null },
    { key: "CMAT", ok: p.accepts_cmat, target: null },
    { key: "NMAT", ok: p.accepts_nmat, target: null },
    { key: "SNAP", ok: p.accepts_snap, target: null },
    { key: "IIFT", ok: p.accepts_iift, target: null },
  ];
  const acceptedExams = exams.filter((e) => e.ok);

  const workExMin = p.min_work_ex_months || 0;
  const workExMax = p.max_work_ex_months || 0;
  let workExLabel = "Not required";
  if (workExMin > 0 && workExMax > 0) workExLabel = `${Math.round(workExMin / 12)}–${Math.round(workExMax / 12)} years`;
  else if (workExMin > 0) workExLabel = `${Math.round(workExMin / 12)}+ years`;

  let ageLabel = "No restriction";
  if (p.min_age && p.max_age) ageLabel = `${p.min_age}–${p.max_age} years`;
  else if (p.max_age) ageLabel = `≤ ${p.max_age} years`;
  else if (p.min_age) ageLabel = `≥ ${p.min_age} years`;

  return (
    <Card className="overflow-hidden border-border/60 shadow-md">
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="font-heading flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            Eligibility Checklist
          </CardTitle>
          {p.source_url && (
            <a
              href={p.source_url}
              target="_blank"
              rel="noreferrer noopener nofollow"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Verify on official site <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          <Row
            ok={null}
            label="Academic minimum"
            value={p.min_graduation_percent ? `Graduation ≥ ${p.min_graduation_percent}% (50% for reserved)` : "Bachelor's degree"}
            icon={GraduationCap}
          />
          <Row
            ok={workExMin > 0}
            label="Work experience"
            value={workExLabel}
            icon={Briefcase}
          />
          <Row
            ok={null}
            label="Age requirement"
            value={ageLabel}
            icon={Calendar}
          />
          <Row
            ok={null}
            label="Programme intake"
            value={p.intake_seats ? `${p.intake_seats} seats / year` : "See official page"}
            icon={BookOpen}
          />
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Accepted entrance exams</div>
          <div className="flex flex-wrap gap-2">
            {acceptedExams.length === 0 && <span className="text-sm text-muted-foreground">Profile-based admission</span>}
            {acceptedExams.map((e) => (
              <div key={e.key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200/60 bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
                <Trophy className="w-3 h-3" />
                {e.key}
                {e.target && <span className="text-[10px] text-emerald-600/80 font-normal">· {e.target}</span>}
              </div>
            ))}
            {exams.filter((e) => !e.ok).map((e) => (
              <Badge key={e.key} variant="outline" className="text-[10px] text-muted-foreground/70">
                {e.key} not accepted
              </Badge>
            ))}
          </div>
        </div>

        {p.evidence_snippet && (
          <div className="mt-5 p-3 rounded-lg bg-muted/40 border border-border/40">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Source evidence
            </div>
            <p className="text-xs italic text-muted-foreground">"{p.evidence_snippet}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EligibilityChecklist;
