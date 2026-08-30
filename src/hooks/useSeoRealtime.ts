// Realtime streaming for the AI SEO Intelligence Center.
//
// The dashboard used to poll `live_status` / `research_feed` on a timer. This
// hook subscribes to the underlying engine tables so any insert/update pushes
// an instant refresh, and exposes the raw stream so the UI can animate the
// exact moment something happens.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SeoRealtimeTable =
  | "seo_intel_jobs"
  | "seo_intel_activity"
  | "seo_intel_recommendations"
  | "seo_intel_experiments"
  | "seo_intel_keywords"
  | "seo_intel_pages";

export interface SeoRealtimeEvent {
  id: string;
  table: SeoRealtimeTable;
  type: "INSERT" | "UPDATE" | "DELETE";
  row: Record<string, unknown>;
  at: string;
}

export interface SeoRealtimeState {
  connected: boolean;
  events: SeoRealtimeEvent[];
  eventCount: number;
  lastEventAt: string | null;
  clear: () => void;
}

const DEFAULT_TABLES: SeoRealtimeTable[] = [
  "seo_intel_jobs", "seo_intel_activity", "seo_intel_recommendations", "seo_intel_experiments",
];

/**
 * @param onChange debounced callback fired after any relevant change (use it to
 *                 refetch the panel's data).
 * @param tables   which engine tables to watch.
 */
export function useSeoRealtime(
  onChange?: (event: SeoRealtimeEvent) => void,
  tables: SeoRealtimeTable[] = DEFAULT_TABLES,
  options?: { debounceMs?: number; keep?: number; enabled?: boolean },
): SeoRealtimeState {
  const debounceMs = options?.debounceMs ?? 1200;
  const keep = options?.keep ?? 60;
  const enabled = options?.enabled ?? true;

  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SeoRealtimeEvent[]>([]);
  const [eventCount, setCount] = useState(0);
  const [lastEventAt, setLast] = useState<string | null>(null);

  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const timer = useRef<number | null>(null);
  const tableKey = useMemo(() => tables.join(","), [tables]);

  useEffect(() => {
    if (!enabled) { setConnected(false); return; }
    const watched = tableKey.split(",").filter(Boolean) as SeoRealtimeTable[];
    const channel = supabase.channel(`seo-intel-live-${Math.random().toString(36).slice(2, 8)}`);

    for (const table of watched) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: any) => {
          const row = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
          const evt: SeoRealtimeEvent = {
            id: `${table}-${String((row as any).id ?? "")}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            table,
            type: payload.eventType ?? payload.type ?? "UPDATE",
            row,
            at: new Date().toISOString(),
          };
          setEvents((prev) => [evt, ...prev].slice(0, keep));
          setCount((c) => c + 1);
          setLast(evt.at);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => cbRef.current?.(evt), debounceMs);
        },
      );
    }

    channel.subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [tableKey, debounceMs, keep, enabled]);

  const clear = useCallback(() => setEvents([]), []);

  return { connected, events, eventCount, lastEventAt, clear };
}

export default useSeoRealtime;
