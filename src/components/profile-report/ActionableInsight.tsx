import { Lightbulb, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { insightColor } from "@/lib/profileScoring";

export type InsightLevel = "good" | "warn" | "bad" | "info";

interface Props {
  level?: InsightLevel;
  title: string;
  children: React.ReactNode;
}

const ICONS: Record<InsightLevel, React.ComponentType<{ className?: string }>> = {
  good: CheckCircle2,
  warn: Lightbulb,
  bad: AlertTriangle,
  info: Info,
};

export const ActionableInsight = ({ level = "info", title, children }: Props) => {
  const Icon = ICONS[level];
  return (
    <div className={`rounded-xl border-2 p-4 ${insightColor(level)}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm mb-1">{title}</p>
          <div className="text-sm opacity-90 space-y-1">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default ActionableInsight;
