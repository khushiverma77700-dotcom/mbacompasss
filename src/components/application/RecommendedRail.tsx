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
      className="relative overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-sky-50/70 p-4 md:p-5"
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-600"
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[1.375rem] font-semibold leading-tight text-slate-900">
              Today&rsquo;s recommended applications
            </h2>
            <p className="text-sm text-slate-600">
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
              className="flex w-[17.5rem] shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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
                    className="h-10 w-10 shrink-0 rounded-xl border border-sky-100 bg-white object-contain p-1"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sm font-semibold text-sky-700"
                  >
                    {row.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-base font-medium text-slate-900">
                    <Link to={collegeUrl(row)} className="hover:text-sky-700">
                      {row.short_name || row.name}
                    </Link>
                  </h3>
                  <p className="truncate text-sm text-slate-500">
                    {row.program || row.location || "MBA / PGDM"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  {row.recommendation_label || "Advisor pick"}
                </Badge>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm ${
                    TONE_CLASS[info.tone] ?? TONE_CLASS["unknown"]
                  }`}
                >
                  <Timer className="h-3.5 w-3.5" /> {info.label}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-slate-500">Last date</dt>
                  <dd className="text-slate-900">{formatDate(row.application_deadline)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Form fee</dt>
                  <dd className="text-slate-900">{formatFee(row.application_fee)}</dd>
                </div>
              </dl>

              <div className="mt-auto flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={collegeUrl(row)}>Details</Link>
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1"
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
