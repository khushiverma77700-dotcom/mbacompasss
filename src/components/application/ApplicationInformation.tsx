import { BookOpen, GraduationCap, ListChecks, TrendingUp } from "lucide-react";
import { formatFee, type TrackerRow } from "@/lib/applicationTracker";
import { formatEditorialReadability } from "@/lib/editorialReadability";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

export default function ApplicationInformation({ row }: { row: TrackerRow }) {
  const facts = [
    { label: "Eligibility", value: row.eligibility, icon: GraduationCap },
    { label: "Selection process", value: row.selection_process, icon: ListChecks },
    { label: "Cutoff & admission notes", value: row.cutoff_note, icon: BookOpen },
    { label: "Advisor perspective", value: row.recommendation_note || row.inside_info_notes, icon: BookOpen },
  ].filter((item) => item.value?.trim());
  const packages = row.category === "exam" ? [] : [
    { label: "Average package", value: row.average_package },
    { label: "Median package", value: row.median_package },
    { label: "Highest package", value: row.highest_package },
  ].filter((item) => item.value != null);
  if (!row.details_html?.trim() && !facts.length && !packages.length && !row.short_description?.trim()) return null;
  return (
    <div className="application-information space-y-6">
      {row.short_description?.trim() && <p className="text-base leading-relaxed text-application-copy">{row.short_description}</p>}
      {!!facts.length && <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">{facts.map((item) => (
        <section key={item.label} className="border-l-2 border-application-line pl-4">
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-application-ink"><item.icon className="h-4 w-4 text-application-blue" />{item.label}</h3>
          <p className="whitespace-pre-line text-base leading-relaxed text-application-copy">{item.value}</p>
        </section>
      ))}</div>}
      {!!packages.length && <section className="border-y border-application-line py-4">
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><TrendingUp className="h-4 w-4 text-application-green" />Placement highlights</h3>
        <dl className="grid gap-4 sm:grid-cols-3">{packages.map((item) => <div key={item.label}><dt className="text-sm text-application-copy">{item.label}</dt><dd className="text-xl font-semibold text-application-ink">{formatFee(item.value)}</dd></div>)}</dl>
      </section>}
      {row.details_html?.trim() && <div className="application-editorial prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatEditorialReadability(row.details_html)) }} />}
    </div>
  );
}