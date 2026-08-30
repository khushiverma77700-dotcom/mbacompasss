// Animation intensity + performance mode for the AI SEO Intelligence Center.
//
// Every animated widget reads these settings so the dashboard stays smooth on
// slow devices, and so "reduce motion" is honoured everywhere at once.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Gauge, Sparkles } from "lucide-react";

export type MotionLevel = "off" | "reduced" | "full" | "cinematic";

export interface SeoMotionSettings {
  level: MotionLevel;
  performanceMode: boolean;
  /** 0 → no motion, 1 → normal, 1.4 → cinematic. Derived from `level`. */
  intensity: number;
  /** Poll interval (ms) for widgets that also stream over realtime. */
  pollMs: number;
  /** Whether heavy visuals (radar, heat grid, terminal, particles) render. */
  heavy: boolean;
  setLevel: (l: MotionLevel) => void;
  setPerformanceMode: (v: boolean) => void;
  /** Convenience: scale a duration by the current intensity. */
  dur: (seconds: number) => number;
  /** Convenience: `Infinity` repeat only when motion is on. */
  repeat: number;
}

const STORAGE_KEY = "seo_motion_settings_v1";

const LEVEL_INTENSITY: Record<MotionLevel, number> = { off: 0, reduced: 0.55, full: 1, cinematic: 1.4 };

const Ctx = createContext<SeoMotionSettings | null>(null);

const prefersReduced = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const SeoMotionProvider = ({ children }: { children: React.ReactNode }) => {
  const [level, setLevelState] = useState<MotionLevel>("full");
  const [performanceMode, setPerfState] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { level?: MotionLevel; performanceMode?: boolean };
        if (parsed.level) setLevelState(parsed.level);
        if (typeof parsed.performanceMode === "boolean") setPerfState(parsed.performanceMode);
        return;
      }
    } catch { /* ignore */ }
    if (prefersReduced()) setLevelState("reduced");
  }, []);

  const persist = useCallback((next: { level: MotionLevel; performanceMode: boolean }) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const setLevel = useCallback((l: MotionLevel) => {
    setLevelState(l);
    setPerfState((p) => { persist({ level: l, performanceMode: p }); return p; });
  }, [persist]);

  const setPerformanceMode = useCallback((v: boolean) => {
    setPerfState(v);
    setLevelState((l) => { persist({ level: l, performanceMode: v }); return l; });
  }, [persist]);

  const value = useMemo<SeoMotionSettings>(() => {
    const intensity = LEVEL_INTENSITY[level];
    return {
      level,
      performanceMode,
      intensity,
      pollMs: performanceMode ? 60_000 : level === "off" ? 45_000 : 20_000,
      heavy: !performanceMode && level !== "off",
      setLevel,
      setPerformanceMode,
      dur: (s: number) => (intensity === 0 ? 0 : s / Math.max(0.4, intensity)),
      repeat: intensity === 0 ? 0 : Infinity,
    };
  }, [level, performanceMode, setLevel, setPerformanceMode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

const FALLBACK: SeoMotionSettings = {
  level: "full", performanceMode: false, intensity: 1, pollMs: 20_000, heavy: true,
  setLevel: () => {}, setPerformanceMode: () => {}, dur: (s) => s, repeat: Infinity,
};

export const useSeoMotion = (): SeoMotionSettings => useContext(Ctx) ?? FALLBACK;

const LEVELS: MotionLevel[] = ["off", "reduced", "full", "cinematic"];
const LEVEL_TEXT: Record<MotionLevel, string> = {
  off: "Off — static numbers only",
  reduced: "Reduced — gentle fades",
  full: "Full — live pulses and counters",
  cinematic: "Cinematic — everything moving",
};

/** Header control: animation intensity slider + performance-mode switch. */
export const SeoMotionControl = () => {
  const m = useSeoMotion();
  const idx = LEVELS.indexOf(m.level);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Motion
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] uppercase">{m.level}</Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Animation intensity
          </Label>
          <Slider
            value={[idx < 0 ? 2 : idx]}
            min={0}
            max={3}
            step={1}
            onValueChange={(v) => m.setLevel(LEVELS[v[0]] ?? "full")}
          />
          <p className="text-xs text-muted-foreground">{LEVEL_TEXT[m.level]}</p>
        </div>
        <div className="flex items-start justify-between gap-3 rounded-md border p-3">
          <div>
            <Label className="flex items-center gap-1.5 text-sm">
              <Gauge className="h-3.5 w-3.5" /> Performance mode
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Drops heavy visuals (radar, heat grid, terminal) and slows refreshes to 60s so the
              dashboard stays smooth on laptops and phones.
            </p>
          </div>
          <Switch checked={m.performanceMode} onCheckedChange={m.setPerformanceMode} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Numbers are always live — this only changes how much they move on screen.
        </p>
      </PopoverContent>
    </Popover>
  );
};

export default SeoMotionProvider;
