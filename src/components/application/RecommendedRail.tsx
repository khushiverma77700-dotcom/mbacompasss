// "Today's recommended applications" — an auto-scrolling rail that sits at the
// top of the MBA Application page. Pauses on hover/touch and on focus so it
// stays usable, and can be nudged with the arrow buttons.

import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  deadlineInfo,
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
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 639px)").matches) return;
    const id = window.setInterval(() => {
      if (paused) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      const card = el.querySelector("article");
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + (card?.getBoundingClientRect().width ?? 320) + 16, behavior: "smooth" });
    }, 6000);
    return () => window.clearInterval(id);
  }, [paused, rows.length]);

  if (rows.length === 0) return null;

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("article");
    el.scrollBy({ left: dir * ((card?.getBoundingClientRect().width ?? el.clientWidth) + 16), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return (
    <section
      aria-label="Today's recommended MBA applications"
      className="min-w-0 overflow-hidden"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-application-line pb-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-tight text-application-ink">
              Recommended colleges
            </h2>
            <p className="text-sm text-application-copy">
              Advisor picks · {rows.length} applications
            </p>
          </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Scroll recommendations left"
            onClick={() => nudge(-1)}
            className="h-10 w-10 rounded-md bg-application-panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Scroll recommendations right"
            onClick={() => nudge(1)}
            className="h-10 w-10 rounded-md bg-application-panel"
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
        className="application-recommendations flex gap-4 overflow-x-auto pt-4 pb-3"
      >
        {rows.map((row) => {
          const info = deadlineInfo(row);
          return (
            <article
              key={row.id}
              className="application-card application-recommendation group flex min-w-0 flex-col gap-4 p-4"
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
                    className="h-11 w-11 shrink-0 rounded-md border border-application-line bg-application-panel object-contain p-1"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-application-line bg-application-blue-soft text-base font-semibold text-application-blue"
                  >
                    {row.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-snug text-application-ink">
                    <Link to={collegeUrl(row)} className="transition-colors group-hover:text-application-blue">
                      {row.short_name || row.name}
                    </Link>
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-application-copy">
                    {row.program || row.location || "MBA / PGDM"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="max-w-full whitespace-normal rounded border-application-line bg-application-blue-soft text-sm font-medium text-application-blue">
                  {row.recommendation_label || "Advisor pick"}
                </Badge>
              </div>
              {row.recommendation_note?.trim() && <p className="line-clamp-2 text-sm leading-relaxed text-application-copy">{row.recommendation_note}</p>}
              <div className="mt-auto"><ApplicationCountdown row={row} compact /></div>

              <dl className="grid grid-cols-2 gap-3 border-b border-application-line pb-3 text-sm">
                <div className="min-w-0">
                  <dt className="text-sm text-application-copy">Tier</dt>
                  <dd className="mt-1 text-sm font-semibold text-application-ink">{row.tier || "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm text-application-copy">Application fee</dt>
                  <dd className="mt-1 text-sm font-semibold text-application-ink">{formatFee(row.application_fee)}</dd>
                </div>
              </dl>

              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="h-11 min-w-0 rounded-md">
                  <Link to={collegeUrl(row)}>View Details</Link>
                </Button>
                <Button
                  className="h-11 min-w-0 gap-1 rounded-md"
                  disabled={!info.isOpen || !row.apply_url}
                  onClick={() => onApply(row)}
                >
                  {info.isOpen ? "Apply Now" : "Closed"}
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
