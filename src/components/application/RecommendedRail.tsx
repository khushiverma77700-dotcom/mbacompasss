// "Today's recommended applications" — an auto-scrolling rail that sits at the
// top of the MBA Application page. Pauses on hover/touch and on focus so it
// stays usable, and can be nudged with the arrow buttons.

import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ChevronLeft, ChevronRight, Sparkles, Timer } from "lucide-react";
import {
  deadlineInfo,
  formatDate,
  formatFee,
  type TrackerRow,
} from "@/lib/applicationTracker";
import { collegeUrl } from "@/lib/applicationSeo";

type Props = {
  rows: TrackerRow[];
  onApply: (row: TrackerRow) => void;
};

const TONE_CLASS: Record<string, string> = {
  today: "bg-rose-50 text-rose-700 border-rose-200",
  urgent: "bg-orange-50 text-orange-700 border-orange-200",
  soon: "bg-amber-50 text-amber-700 border-amber-200",
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function RecommendedRail({ rows, onApply }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || rows.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (paused) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + 1, behavior: atEnd ? "smooth" : "auto" });
    }, 24);
    return () => window.clearInterval(id);
  }, [paused, rows.length]);

  if (rows.length === 0) return null;

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section
      aria-label="Today's recommended MBA applications"
      className="relative overflow-hidden rounded-2xl border border-application-line bg-application-panel p-4 shadow-[0_8px_30px_rgb(19,36,58,0.05)] md:p-5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-application-line pb-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-application-blue/10 bg-application-blue-soft text-application-blue"
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold leading-tight text-application-ink">
              Today&rsquo;s recommended applications
            </h2>
            <p className="text-sm text-application-copy">
              Hand-picked by our MBA advisors — worth applying to right now.
            </p>
          </div>
        </div>
        <div className="hidden gap-1.5 sm:flex">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Scroll recommendations left"
            onClick={() => nudge(-1)}
            className="h-9 w-9 rounded-full bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Scroll recommendations right"
            onClick={() => nudge(1)}
            className="h-9 w-9 rounded-full bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {rows.map((row) => {
          const info = deadlineInfo(row);
          return (
            <article
              key={row.id}
              className="group flex w-[17.5rem] shrink-0 flex-col gap-3 rounded-2xl border border-application-line bg-application-panel p-4 shadow-[0_8px_30px_rgb(19,36,58,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-application-blue/30 hover:shadow-[0_16px_40px_rgb(19,36,58,0.10)]"
            >
              <div className="flex items-start gap-3">
                {row.logo_url ? (
                  <img
                    src={row.logo_url}
                    alt={row.seo_image_alt || `${row.name} MBA application form logo`}
                    loading="lazy"
                    decoding="async"
                    width={40}
                    height={40}
                    className="h-11 w-11 shrink-0 rounded-xl border border-application-blue/10 bg-application-blue-soft object-contain p-1 shadow-sm"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-application-blue/10 bg-application-blue-soft text-base font-bold text-application-blue shadow-sm"
                  >
                    {row.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-application-ink">
                    <Link to={collegeUrl(row)} className="transition-colors group-hover:text-application-blue">
                      {row.short_name || row.name}
                    </Link>
                  </h3>
                  <p className="truncate text-sm text-application-copy">
                    {row.program || row.location || "MBA / PGDM"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="rounded-md border-application-warning/20 bg-application-warning-soft text-[11px] font-bold uppercase tracking-wide text-application-warning">
                  {row.recommendation_label || "Advisor pick"}
                </Badge>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                    TONE_CLASS[info.tone] ?? TONE_CLASS["unknown"]
                  }`}
                >
                  <Timer className="h-3.5 w-3.5" /> {info.label}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-application-line bg-application-line text-sm">
                <div className="bg-application-canvas p-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-application-copy/70">Last date</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-application-ink">{formatDate(row.application_deadline)}</dd>
                </div>
                <div className="bg-application-canvas p-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-application-copy/70">Form fee</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-application-ink">{formatFee(row.application_fee)}</dd>
                </div>
              </dl>

              <div className="mt-auto flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl">
                  <Link to={collegeUrl(row)}>Details</Link>
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1 rounded-xl shadow-[0_4px_12px_rgb(22,119,184,0.25)]"
                  disabled={!info.isOpen}
                  onClick={() => onApply(row)}
                >
                  {info.isOpen ? "Apply" : "Closed"}
                  {info.isOpen && <ArrowUpRight className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
