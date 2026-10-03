import { motion } from "framer-motion";
import { AlertTriangle, Award, BookOpenCheck, BriefcaseBusiness, Building2, Gauge, IndianRupee, Target, TrendingUp } from "lucide-react";
import { parseProfileNarrative, type ProfileNarrative } from "@/lib/profileNarrative";

interface Props {
  text?: unknown;
  name?: string;
  narrative?: ProfileNarrative | null;
  profileScore?: number;
  rankPercentile?: number;
}
const insightConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  academics: { label: "Academic Profile", icon: BookOpenCheck },
  work_ex: { label: "Work Experience", icon: BriefcaseBusiness },
  college_strategy: { label: "College Strategy", icon: Building2 },
  exam_prep: { label: "Exam Plan", icon: Target },
  roi: { label: "Financial Outlook", icon: IndianRupee },
};

export const SummaryHighlights = ({ text, name, narrative, profileScore, rankPercentile }: Props) => {
  const parsed = narrative ?? parseProfileNarrative(text);
  const fallbackText = !parsed && typeof text === "string" && !text.trim().startsWith("{") ? text.trim() : "";
  if (!parsed && !fallbackText && profileScore == null) return null;

  const firstName = name?.trim().split(" ")[0];
  const insights = Object.entries(parsed?.section_insights ?? {});
  const topPercent = rankPercentile == null ? null : Math.max(1, Math.round(100 - rankPercentile));

  return (
    <section className="w-full space-y-6 text-left" aria-labelledby="report-snapshot-title">
      <div className="overflow-hidden rounded-lg border border-primary/20 bg-card shadow-sm">
        <div className="grid md:grid-cols-[1fr_auto]">
          <div className="p-5 md:p-7">
            <p className="mb-2 text-sm font-bold uppercase text-primary">MBA readiness assessment{firstName ? ` · ${firstName}` : ""}</p>
            <h3 id="report-snapshot-title" className="text-xl font-bold text-foreground">{parsed?.one_line_summary || fallbackText || "Your profile assessment is ready."}</h3>
          </div>
          {(profileScore != null || topPercent != null) && (
            <div className="grid grid-cols-2 border-t border-primary/15 bg-primary/5 md:border-l md:border-t-0">
              {profileScore != null && (
                <div className="flex min-w-32 flex-col justify-center p-5">
                  <Gauge className="mb-2 h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold text-primary">{profileScore}/10</span>
                  <span className="text-sm text-muted-foreground">Profile score</span>
                </div>
              )}
              {topPercent != null && (
                <div className="flex min-w-32 flex-col justify-center border-l border-primary/15 p-5">
                  <TrendingUp className="mb-2 h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold text-primary">Top {topPercent}%</span>
                  <span className="text-sm text-muted-foreground">Peer position</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {insights.length > 0 && (
        <div>
          <h3 className="mb-3 text-xl font-bold">Strategic priorities</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {insights.map(([key, insight], index) => {
              const config = insightConfig[key] ?? { label: key.replaceAll("_", " "), icon: Target };
              const Icon = config.icon;
              return (
                <motion.article key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-primary"><Icon className="h-5 w-5" /><h4 className="text-sm font-bold uppercase">{config.label}</h4></div>
                  <p className="text-sm leading-relaxed text-foreground/80">{insight}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      )}

      {(parsed?.top_advantages?.length || parsed?.top_risks?.length) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="mb-4 flex items-center gap-2 text-emerald-700"><Award className="h-5 w-5" /><h3 className="text-xl font-bold">Competitive strengths</h3></div>
            <div className="space-y-4">
              {parsed?.top_advantages?.map((item, index) => <div key={`${item.title}-${index}`} className="border-l-2 border-emerald-500 pl-3"><p className="text-sm font-bold text-emerald-950">{item.title}</p><p className="mt-1 text-sm leading-relaxed text-emerald-900/80">{item.why}</p></div>)}
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-5">
            <div className="mb-4 flex items-center gap-2 text-amber-700"><AlertTriangle className="h-5 w-5" /><h3 className="text-xl font-bold">Risks and response plan</h3></div>
            <div className="space-y-4">
              {parsed?.top_risks?.map((item, index) => <div key={`${item.title}-${index}`} className="border-l-2 border-amber-500 pl-3"><p className="text-sm font-bold text-amber-950">{item.title}</p><p className="mt-1 text-sm leading-relaxed text-amber-900/80">{item.mitigation}</p></div>)}
            </div>
          </div>
        </div>
      )}

      {parsed?.final_verdict && (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-5 md:p-6">
          <div className="mb-2 flex items-center gap-2 text-primary"><TrendingUp className="h-5 w-5" /><h3 className="text-xl font-bold">Advisor verdict</h3></div>
          <p className="text-base leading-relaxed text-foreground/85">{parsed.final_verdict}</p>
        </div>
      )}
    </div>
  );
};

export default SummaryHighlights;
