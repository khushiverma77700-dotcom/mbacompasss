import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DockJobStatus =
  | "pending"      // queued, not yet dispatched
  | "starting"     // dispatch invoke in flight (legacy/local only)
  | "running"      // generation_id received, polling
  | "completed"
  | "failed"
  | "cancelled";

export interface DockJob {
  /** Local UI id (same as bulk_mock_request_items.id once persisted) */
  id: string;
  label: string;
  status: DockJobStatus;
  generation_id?: string | null;
  total_requested?: number;
  total_generated?: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  /** Parent bulk_mock_requests.id this row belongs to */
  request_id?: string;
}

interface DockCtx {
  jobs: DockJob[];
  enqueue: (items: { label: string; payload: any }[]) => Promise<void>;
  cancel: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
  runNow: (id: string) => Promise<void>;
  retry: (id: string) => Promise<void>;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  activeCount: number;
  pendingCount: number;
  doneCount: number;
  failCount: number;
}


const Ctx = createContext<DockCtx | null>(null);
const LS_KEY = "mock_gen_dock_request_ids_v1";

function readTrackedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function writeTrackedIds(ids: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...new Set(ids)].slice(-30))); } catch { /* ignore */ }
}

function mapRow(row: any): DockJob {
  // bulk_mock_request_items → DockJob
  const status: DockJobStatus =
    row.status === "completed" ? "completed" :
    row.status === "failed" ? "failed" :
    row.status === "needs_review" ? "completed" :
    row.status === "processing" ? (row.generation_id ? "running" : "starting") :
    "pending";
  const label = [
    row.exam_code,
    String(row.category || "").replace("_", " "),
    row.section_code || null,
    row.topic ? `"${row.topic}"` : null,
    row.level,
    `${row.questions_per_set}Q × ${row.sets} set${row.sets > 1 ? "s" : ""}`,
  ].filter(Boolean).join(" · ");
  return {
    id: row.id,
    label,
    status,
    generation_id: row.generation_id,
    total_requested: row.total_requested ?? undefined,
    total_generated: row.total_generated ?? 0,
    error: row.error_message || undefined,
    createdAt: new Date(row.created_at || Date.now()).getTime(),
    startedAt: row.started_at ? new Date(row.started_at).getTime() : undefined,
    finishedAt: row.finished_at ? new Date(row.finished_at).getTime() : undefined,
    request_id: row.request_id,
  };
}

export function MockGenDockProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<DockJob[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const trackedReqIdsRef = useRef<string[]>(readTrackedIds());
  const prevStatusRef = useRef<Record<string, DockJobStatus>>({});

  // Hydrate from DB on mount + poll every 3s. Survives page reloads,
  // navigation, and laptop reboots — the source of truth is the bulk
  // mock request tables, dispatched by an edge-side cron.
  const fetchAll = useCallback(async () => {
    const ids = trackedReqIdsRef.current;
    if (!ids.length) { setJobs([]); return; }
    const { data } = await supabase
      .from("bulk_mock_request_items")
      .select("id, request_id, exam_code, category, level, section_code, topic, questions_per_set, sets, status, total_requested, total_generated, error_message, generation_id, started_at, finished_at, created_at")
      .in("request_id", ids)
      .order("created_at", { ascending: true });
    const next = (data ?? []).map(mapRow);
    // Fire completion / failure toasts when status flips
    for (const j of next) {
      const prev = prevStatusRef.current[j.id];
      if (prev && prev !== j.status) {
        if (j.status === "completed") {
          toast.success(`${j.label} — done`, {
            description: `${j.total_generated || 0} questions generated.`,
            duration: 6000,
          });
        } else if (j.status === "failed") {
          toast.error(`${j.label} — failed`, { description: j.error || "" });
        }
      }
      prevStatusRef.current[j.id] = j.status;
    }
    // Drop request_ids that have no items anymore (rare)
    const haveIds = new Set(next.map((j) => j.request_id).filter(Boolean));
    if (ids.some((id) => !haveIds.has(id)) && next.length > 0) {
      trackedReqIdsRef.current = Array.from(haveIds) as string[];
      writeTrackedIds(trackedReqIdsRef.current);
    }
    setJobs(next);
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 3000);
    // Trigger server reconcile periodically (also keeps cron-less envs moving)
    const t2 = setInterval(() => {
      supabase.functions.invoke("bulk-mock-worker", { body: { reconcile: true } }).catch(() => {});
    }, 8000);
    return () => { clearInterval(t); clearInterval(t2); };
  }, [fetchAll]);

  const enqueue = useCallback(async (items: { label: string; payload: any }[]) => {
    if (!items.length) return;
    try {
      const { data, error } = await supabase.functions.invoke("bulk-mock-worker", {
        body: {
          label: items[0].label.slice(0, 80) + (items.length > 1 ? ` (+${items.length - 1})` : ""),
          items: items.map((it) => ({
            exam_code: it.payload.exam_code,
            category: it.payload.category,
            level: it.payload.level,
            section_code: it.payload.section_code || null,
            topic: it.payload.topic || null,
            questions_per_set: it.payload.questions_per_set ?? it.payload.total_questions ?? 20,
            sets: it.payload.sets ?? 1,
            test_name_prefix: it.payload.test_name_prefix || null,
          })),
        },
      });
      if (error) throw error;
      const reqId = (data as any)?.request_id;
      if (!reqId) throw new Error("Server did not return a request id");
      trackedReqIdsRef.current = [...trackedReqIdsRef.current, reqId];
      writeTrackedIds(trackedReqIdsRef.current);
      setIsOpen(true);
      toast(`Queued ${items.length} mock${items.length > 1 ? "s" : ""}`, {
        description: "Generation runs on the server and continues even if you close the laptop.",
      });
      await fetchAll();
    } catch (e: any) {
      toast.error("Failed to queue mocks", { description: e?.message || "Try again" });
    }
  }, [fetchAll]);

  const cancel = useCallback(async (id: string) => {
    const j = jobs.find((x) => x.id === id);
    if (!j) return;
    if (j.generation_id) {
      await supabase.from("ai_mock_generations").update({ status: "cancelled" }).eq("id", j.generation_id);
    }
    await supabase.from("bulk_mock_request_items").update({
      status: "failed",
      paused: true,
      error_message: "Cancelled by admin",
      finished_at: new Date().toISOString(),
    }).eq("id", id);
    await fetchAll();
  }, [jobs, fetchAll]);

  const dismiss = useCallback((id: string) => {
    setJobs((js) => js.filter((j) => j.id !== id));
  }, []);

  const runNow = useCallback(async (id: string) => {
    try {
      await supabase.functions.invoke("bulk-mock-worker", { body: { resume_id: id } });
      toast("Dispatching now…", { description: "Forcing this mock to start." });
      await fetchAll();
    } catch (e: any) {
      toast.error("Could not start", { description: e?.message || "Try again" });
    }
  }, [fetchAll]);

  const retry = useCallback(async (id: string) => {
    // Reset failed item back to pending and let the worker pump it.
    await supabase.from("bulk_mock_request_items").update({
      status: "pending",
      paused: false,
      error_message: null,
      generation_id: null,
      started_at: null,
      finished_at: null,
      worker_lock_until: null,
    }).eq("id", id);
    await supabase.functions.invoke("bulk-mock-worker", { body: { resume_id: id } }).catch(() => {});
    await fetchAll();
  }, [fetchAll]);

  const clearFinished = useCallback(() => {
    const finalIds = new Set(jobs.filter((j) => ["completed", "failed", "cancelled"].includes(j.status)).map((j) => j.id));
    setJobs((js) => js.filter((j) => !finalIds.has(j.id)));
    const remainingReqIds = new Set(jobs.filter((j) => !finalIds.has(j.id) && j.request_id).map((j) => j.request_id!));
    trackedReqIdsRef.current = trackedReqIdsRef.current.filter((id) => remainingReqIds.has(id));
    writeTrackedIds(trackedReqIdsRef.current);
  }, [jobs]);

  const value = useMemo<DockCtx>(() => {
    const activeCount = jobs.filter((j) => j.status === "starting" || j.status === "running").length;
    const pendingCount = jobs.filter((j) => j.status === "pending").length;
    const doneCount = jobs.filter((j) => j.status === "completed").length;
    const failCount = jobs.filter((j) => j.status === "failed" || j.status === "cancelled").length;
    return {
      jobs, enqueue, cancel, dismiss, clearFinished, runNow, retry,
      isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), toggle: () => setIsOpen((o) => !o),
      activeCount, pendingCount, doneCount, failCount,
    };
  }, [jobs, isOpen, enqueue, cancel, dismiss, clearFinished, runNow, retry]);


  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMockGenDock() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMockGenDock must be used within MockGenDockProvider");
  return ctx;
}
