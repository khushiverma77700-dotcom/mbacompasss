// Shared "live server room" animation primitives for the AI SEO Intelligence
// Center. Purely presentational — every component takes real numbers from the
// backend and animates how they change. Nothing here invents data.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── count-up number that replays whenever `replay` changes ── */
export const FxCounter = ({
  value,
  format,
  replay = 0,
  duration = 900,
  from: fromProp,
}: {
  value: number | null | undefined;
  format: (v: number | null) => string;
  replay?: number;
  duration?: number;
  /** Explicit starting value — used when replaying a recorded before → after event. */
  from?: number;
}) => {
  const [shown, setShown] = useState<number | null>(value ?? null);
  const prev = useRef<number | null>(0);
  useEffect(() => {
    if (value === null || value === undefined) { setShown(null); prev.current = null; return; }
    const from = fromProp ?? prev.current ?? 0;
    prev.current = value;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / Math.max(1, duration));
      setShown(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, replay, duration, fromProp]);
  return <>{format(shown)}</>;
};


/* ── animated conic gauge ring (0–100) ── */
export const GaugeRing = ({
  pct,
  label,
  value,
  tone = "emerald",
  size = 104,
  live = false,
}: {
  pct: number;
  label: string;
  value: string;
  tone?: "emerald" | "sky" | "amber" | "violet";
  size?: number;
  live?: boolean;
}) => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const stroke = { emerald: "hsl(150 62% 42%)", sky: "hsl(205 90% 52%)", amber: "hsl(38 92% 50%)", violet: "hsl(265 75% 58%)" }[tone];
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(210 20% 90%)" strokeWidth={8} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * clamped) / 100 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </svg>
        {live && (
          <span className="absolute inset-1 rounded-full" style={{ boxShadow: `0 0 22px 0 ${stroke}55` }} />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
        </div>
      </div>
      <span className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
};

/* ── stage pipeline with packets travelling between stages ── */
export interface FxStage {
  key: string;
  label: string;
  count: number | null;
  active: boolean;
  icon?: any;
}

export const PipelineFlow = ({ stages }: { stages: FxStage[] }) => (
  <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
    {stages.map((s, i) => (
      <div key={s.key} className="flex min-w-0 items-center gap-1">
        <div
          className={cn(
            "relative min-w-[124px] overflow-hidden rounded-lg border px-3 py-2",
            s.active ? "border-emerald-300 bg-emerald-50/70" : "border-border bg-muted/30",
          )}
        >
          {s.active && (
            <motion.span
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent"
              animate={{ x: ["0%", "420%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
          )}
          <div className="relative flex items-center gap-1.5">
            {s.icon && <s.icon className={cn("h-3.5 w-3.5", s.active ? "text-emerald-600" : "text-muted-foreground")} />}
            <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</span>
          </div>
          <div className="relative mt-0.5 font-mono text-lg font-semibold tabular-nums">
            <FxCounter value={s.count} format={(v) => (v === null ? "—" : Math.round(v).toLocaleString("en-IN"))} />
          </div>
        </div>
        {i < stages.length - 1 && (
          <div className="relative h-0.5 w-8 shrink-0 rounded-full bg-border">
            <motion.span
              className="absolute -top-[3px] h-2 w-2 rounded-full bg-emerald-500"
              animate={{ left: ["0%", "100%"], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
            />
          </div>
        )}
      </div>
    ))}
  </div>
);

/* ── radar sweep: one blip per tracked item ── */
export const RadarSweep = ({ blips = 12, active = true, size = 132 }: { blips?: number; active?: boolean; size?: number }) => {
  const dots = useMemo(
    () => Array.from({ length: Math.max(0, Math.min(28, blips)) }, (_, i) => ({
      a: (i * 137.5) % 360,
      d: 0.25 + ((i * 37) % 70) / 100,
      k: i,
    })),
    [blips],
  );
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border border-emerald-200" />
      <div className="absolute inset-[14%] rounded-full border border-emerald-200/70" />
      <div className="absolute inset-[32%] rounded-full border border-emerald-200/50" />
      <div className="absolute inset-[48%] rounded-full border border-emerald-200/40" />
      {active && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "conic-gradient(from 0deg, hsl(150 62% 42% / 0.35), transparent 28%)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        />
      )}
      {dots.map((d) => {
        const rad = (d.a * Math.PI) / 180;
        const x = 50 + Math.cos(rad) * d.d * 46;
        const y = 50 + Math.sin(rad) * d.d * 46;
        return (
          <motion.span
            key={d.k}
            className="absolute h-1.5 w-1.5 rounded-full bg-emerald-500"
            style={{ left: `${x}%`, top: `${y}%` }}
            animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 3.2, repeat: Infinity, delay: (d.a / 360) * 3.2 }}
          />
        );
      })}
    </div>
  );
};

/* ── server heat grid: one cell per stage/item, colour = load ── */
export const HeatGrid = ({
  cells,
  columns = 12,
}: {
  cells: Array<{ key: string; label: string; load: number; failed?: boolean }>;
  columns?: number;
}) => (
  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
    {cells.map((c, i) => {
      const load = Math.max(0, Math.min(1, c.load));
      const bg = c.failed
        ? `hsl(0 72% ${72 - load * 24}%)`
        : load === 0
          ? "hsl(210 20% 92%)"
          : `hsl(${150 - load * 40} ${50 + load * 30}% ${78 - load * 32}%)`;
      return (
        <motion.div
          key={c.key}
          title={`${c.label} · load ${(load * 100).toFixed(0)}%`}
          className="h-6 rounded-sm"
          style={{ background: bg }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: Math.min(i * 0.012, 0.5) }}
        />
      );
    })}
  </div>
);

/* ── auto-scrolling terminal-style stream ── */
export const TerminalStream = ({
  lines,
  height = 220,
  live = true,
}: {
  lines: Array<{ id: string; time: string; tag: string; text: string; tone?: "ok" | "warn" | "err" | "info" }>;
  height?: number;
  live?: boolean;
}) => {
  const toneClass = { ok: "text-emerald-400", warn: "text-amber-300", err: "text-red-400", info: "text-sky-300" } as const;
  return (
    <div className="relative overflow-hidden rounded-lg bg-slate-950 font-mono text-[11px] leading-relaxed" style={{ height }}>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-400">
        <span className="h-2 w-2 rounded-full bg-red-400/80" />
        <span className="h-2 w-2 rounded-full bg-amber-300/80" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
        <span className="ml-2">seo-engine · stdout</span>
        {live && <span className="ml-auto flex items-center gap-1 text-emerald-400">streaming<span className="inline-block h-3 w-1.5 animate-pulse bg-emerald-400" /></span>}
      </div>
      <div className="h-full overflow-y-auto px-3 py-2 pb-8">
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2 whitespace-pre-wrap break-words"
            >
              <span className="shrink-0 text-slate-500">{l.time}</span>
              <span className={cn("shrink-0", toneClass[l.tone ?? "info"])}>[{l.tag}]</span>
              <span className="text-slate-200">{l.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {lines.length === 0 && <div className="text-slate-500">no engine output in this window</div>}
      </div>
    </div>
  );
};

/* ── mini sparkline with a travelling head dot ── */
export const FxSpark = ({
  values,
  tone = "emerald",
  height = 40,
}: { values: number[]; tone?: "emerald" | "sky" | "amber"; height?: number }) => {
  const stroke = { emerald: "hsl(150 62% 42%)", sky: "hsl(205 90% 52%)", amber: "hsl(38 92% 50%)" }[tone];
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return <div className="text-[11px] text-muted-foreground">not enough history</div>;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const d = pts
    .map((v, i) => `${(i / (pts.length - 1)) * 100},${100 - ((v - min) / span) * 100}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} className="w-full">
      <motion.polyline
        points={d}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <motion.circle
        r={2.6}
        fill={stroke}
        cx={100}
        cy={100 - ((pts[pts.length - 1] - min) / span) * 100}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
    </svg>
  );
};

/* ── burst highlight whenever a value increases (new win landed) ── */
export const BurstOnIncrease = ({ value, children }: { value: number | null; children: React.ReactNode }) => {
  const prev = useRef<number | null>(null);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (value !== null && prev.current !== null && value > prev.current) setBurst((b) => b + 1);
    prev.current = value;
  }, [value]);
  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {burst > 0 && (
          <motion.span
            key={burst}
            className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-emerald-400"
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.06 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── rotating "what the engine is doing" phrase ── */
export const PhaseRotator = ({ phrases, active, interval = 900 }: { phrases: string[]; active: boolean; interval?: number }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active || phrases.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % phrases.length), interval);
    return () => clearInterval(t);
  }, [active, phrases.length, interval]);
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={`${i}-${active}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.22 }}
      >
        {phrases[i % phrases.length]}
      </motion.span>
    </AnimatePresence>
  );
};
