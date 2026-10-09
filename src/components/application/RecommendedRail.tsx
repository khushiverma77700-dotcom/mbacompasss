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
import ApplicationCountdown from "@/components/application/ApplicationCountdown";
import { collegeUrl } from "@/lib/applicationSeo";

type Props = {
  rows: TrackerRow[];
  onApply: (row: TrackerRow) => void;
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
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + 312, behavior: "smooth" });
    }, 6000);
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
      className="min-w-0 overflow-hidden border-y border-application-line py-5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-application-line pb-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-application-blue/10 bg-application-blue-soft text-application-blue"
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold leading-tight text-application-ink">
              Today&rsquo;s recommended applications
            </h2>
            <p className="text-sm text-application-copy">
              Advisor picks · {rows.length} applications
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Scroll recommendations left"
            onClick={() => nudge(-1)}
            className="h-9 w-9 rounded-full bg-application-panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Scroll recommendations right"
            onClick={() => nudge(1)}
            className="h-9 w-9 rounded-full bg-application-panel"
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
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        className="flex gap-3 overflow-x-auto pt-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {rows.map((row) => {
          const info = deadlineInfo(row);
          return (
            <article
              key={row.id}
              className="group flex w-[19rem] max-w-full shrink-0 flex-col gap-3 rounded-lg border border-application-line bg-application-panel p-4 transition-colors hover:border-application-blue/30"
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
                    className="h-11 w-11 shrink-0 rounded-lg border border-application-blue/10 bg-application-blue-soft object-contain p-1 shadow-sm"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-application-blue/10 bg-application-blue-soft text-base font-bold text-application-blue shadow-sm"
                  >
                    {row.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="line-clamp-2 min-h-12 text-base font-semibold text-application-ink">
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
                <Badge variant="outline" className="rounded-md border-application-warning/20 bg-application-warning-soft text-sm font-bold uppercase tracking-wide text-application-warning">
                  {row.recommendation_label || "Advisor pick"}
                </Badge>
              </div>
              {row.recommendation_note?.trim() && <p className="line-clamp-3 text-sm leading-relaxed text-application-copy">{row.recommendation_note}</p>}
              <ApplicationCountdown row={row} compact />

              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-application-line bg-application-line text-sm">
                <div className="bg-application-canvas p-2.5">
                  <dt className="text-sm font-bold uppercase tracking-wider text-application-copy/70">Last date</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-application-ink">{formatDate(row.application_deadline)}</dd>
                </div>
                <div className="bg-application-canvas p-2.5">
                  <dt className="text-sm font-bold uppercase tracking-wider text-application-copy/70">Form fee</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-application-ink">{formatFee(row.application_fee)}</dd>
                </div>
              </dl>

              <div className="mt-auto flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1 rounded-lg">
                  <Link to={collegeUrl(row)}>Details</Link>
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1 rounded-lg shadow-sm"
                  disabled={!info.isOpen || !row.apply_url}
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
