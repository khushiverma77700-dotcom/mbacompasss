import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { formatFee } from "@/lib/applicationTracker";
import type { ExpenseBreakdown as Breakdown } from "@/lib/applicationExpenses";

type Props = {
  name: string;
  breakdown: Breakdown;
  /** Renders a tighter version for the tracking portal cards. */
  compact?: boolean;
};

/**
 * Line-by-line money view for one application: application-stage spends, the
 * programme fee split, costs outside the fee slip and loan interest.
 */
export default function ExpenseBreakdownView({ name, breakdown, compact = false }: Props) {
  const summary: { label: string; value: string; tone: string }[] = [
    {
      label: "Application stage",
      value: formatFee(breakdown.applicationStageTotal),
      tone: "border-sky-200 bg-sky-50/70",
    },
    {
      label: "Programme fee",
      value: formatFee(breakdown.programmeTotal),
      tone: "border-slate-200 bg-white",
    },
    {
      label: "Outside the fee slip",
      value: formatFee(breakdown.additionalTotal),
      tone: "border-slate-200 bg-white",
    },
    {
      label: "Total cost of the MBA",
      value: breakdown.grandTotal === null ? "Fee awaited" : formatFee(breakdown.grandTotal),
      tone: "border-emerald-200 bg-emerald-50/70",
    },
  ];

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.tone}`}>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="pt-0.5 text-base font-semibold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <Accordion type="multiple" className="space-y-2">
        {breakdown.groups.map((group) => (
          <AccordionItem
            key={group.title}
            value={group.title}
            className="rounded-xl border border-slate-200 bg-white px-4"
          >
            <AccordionTrigger className="text-left text-base">
              <span className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2">
                <span className="font-medium text-slate-900">{group.title}</span>
                <span className="text-sm text-slate-600">
                  {group.total === null ? "Not published" : formatFee(group.total)}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="pb-3 text-sm text-slate-500">{group.caption}</p>
              <ul className="space-y-2">
                {group.lines.map((line) => (
                  <li
                    key={line.label}
                    className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900">{line.label}</span>
                      <span className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            line.actual
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600"
                          }
                        >
                          {line.actual ? "Published" : "Estimate"}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-900">
                          {line.amount === null ? "—" : formatFee(line.amount)}
                        </span>
                      </span>
                    </div>
                    <p className="pt-1 text-sm text-slate-500">{line.note}</p>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="text-sm text-slate-500">
        Fees marked “Published” come from {name}. Lines marked “Estimate” are indicative India MBA
        benchmarks so nothing in your budget is missed — always confirm the final numbers on the
        official fee structure.
      </p>
    </div>
  );
}
