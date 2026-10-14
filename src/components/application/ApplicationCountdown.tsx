import { useSyncExternalStore } from "react";
import { CalendarCheck2, CalendarX2, Hourglass, Timer } from "lucide-react";
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
  const tone = urgent ? "urgent" : info.isOpen ? "open" : info.label === "Opening Soon" ? "soon" : "closed";
  const Icon = tone === "closed" ? CalendarX2 : tone === "soon" ? Hourglass : running ? Timer : CalendarCheck2;
  const title = urgent ? "Closing Soon" : info.label;
  const note = info.isOpen
    ? row.application_deadline ? `Last date ${formatDate(row.application_deadline)}` : "Deadline not announced"
    : tone === "soon" ? "Registration has not opened" : row.application_deadline ? `Closed on ${formatDate(row.application_deadline)}` : "Applications closed";

  return (
    <div className={`application-countdown application-countdown-${tone}`} data-countdown={row.application_deadline ?? "undated"}>
      <div className="flex items-center gap-2.5">
        <span className="application-countdown-icon" aria-hidden><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
            {running && <span className="application-countdown-pulse" aria-hidden />}
            {title}
          </p>
          <p className="truncate text-sm leading-tight text-application-copy">{note}</p>
        </div>
      </div>
      {running && (
        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`${parts.days} days ${parts.hours} hours ${parts.minutes} minutes ${parts.seconds} seconds remaining`}>
          {[[parts.days, compact ? "D" : "Days"], [parts.hours, compact ? "H" : "Hrs"], [parts.minutes, compact ? "M" : "Min"], [parts.seconds, compact ? "S" : "Sec"]].map(([value, label]) => (
            <div key={label} className="application-countdown-cell">
              <span className={`${compact ? "text-base" : "text-xl"} block font-semibold leading-none tabular-nums`}>{String(value).padStart(2, "0")}</span>
              <span className="mt-1 block text-sm leading-none text-application-copy">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
