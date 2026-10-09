import { useSyncExternalStore } from "react";
import { Timer } from "lucide-react";
import { countdownParts } from "@/lib/applicationDeadline";
import { deadlineInfo, formatDate, type TrackerRow } from "@/lib/applicationTracker";

// All visible clocks share one timer; only clocks, not the whole directory, rerender each second.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let current: number | null = null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => { current = Date.now(); listeners.forEach((notify) => notify()); }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { clearInterval(timer); timer = undefined; }
  };
}
const snapshot = () => current;
const serverSnapshot = () => null;

export default function ApplicationCountdown({ row, compact = false }: { row: Pick<TrackerRow, "application_deadline" | "status">; compact?: boolean }) {
  const now = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const info = deadlineInfo(row, now ?? undefined);
  const parts = now === null ? null : countdownParts(row.application_deadline, now);
  const running = info.isOpen && parts && !parts.expired;
  const urgent = info.isOpen && info.daysLeft !== null && info.daysLeft <= 5;
  return (
    <div className={`application-countdown ${urgent ? "application-countdown-urgent" : ""}`} data-countdown={row.application_deadline ?? "undated"}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold"><Timer className="h-4 w-4 shrink-0" />{urgent ? "Closing Soon" : info.label}</span>
        {!compact && <span className="text-application-copy">{formatDate(row.application_deadline)}</span>}
      </div>
      {running ? (
        <div className="mt-2 grid grid-cols-4 gap-1.5" aria-label={`${parts.days} days ${parts.hours} hours ${parts.minutes} minutes ${parts.seconds} seconds remaining`}>
          {[[parts.days, "Days"], [parts.hours, "Hrs"], [parts.minutes, "Min"], [parts.seconds, "Sec"]].map(([value, label]) => (
            <div key={label} className="min-w-0 border-l border-application-line text-center first:border-l-0">
              <span className={`${compact ? "text-base" : "text-xl"} block font-semibold tabular-nums text-application-ink`}>{String(value).padStart(2, "0")}</span>
              <span className="text-sm text-application-copy">{label}</span>
            </div>
          ))}
        </div>
      ) : <p className="mt-1 text-sm text-application-copy">{info.isOpen ? (row.application_deadline ? `Last date: ${formatDate(row.application_deadline)}` : "Deadline not announced") : info.label === "Opening Soon" ? "Registration has not opened" : `Last date: ${formatDate(row.application_deadline)}`}</p>}
    </div>
  );
}