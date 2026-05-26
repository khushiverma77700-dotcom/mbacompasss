import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DockJobStatus =
  | "pending"      // queued, not yet dispatched
  | "starting"     // dispatch invoke in flight
  | "running"      // generation_id received, polling
  | "completed"
  | "failed"
  | "cancelled";

export interface DockJob {
  id: string;                    // local uid
  label: string;                 // human label
  payload: any;                  // body for generate-mock-questions
  status: DockJobStatus;
  generation_id?: string;
  total_requested?: number;
  total_generated?: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

interface DockCtx {
  jobs: DockJob[];
  enqueue: (items: { label: string; payload: any }[]) => void;
  cancel: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
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
const MAX_PARALLEL = 3;

export function MockGenDockProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<DockJob[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const jobsRef = useRef<DockJob[]>([]);
  jobsRef.current = jobs;

  const update = useCallback((id: string, patch: Partial<DockJob>) => {
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  // ---- Dispatcher: keep up to MAX_PARALLEL "starting" or "running" jobs ----
  const pump = useCallback(async () => {
    const current = jobsRef.current;
    const active = current.filter((j) => j.status === "starting" || j.status === "running").length;
    if (active >= MAX_PARALLEL) return;

    const next = current.find((j) => j.status === "pending");
    if (!next) return;

    // Optimistically mark starting BEFORE awaiting to prevent double-dispatch on rapid pump
    update(next.id, { status: "starting", startedAt: Date.now() });

    try {
      const { data, error } = await supabase.functions.invoke("generate-mock-questions", { body: next.payload });
      if (error) throw error;
      const genId = data?.generation_id;
      if (!genId) {
        // Legacy synchronous response — treat as completed immediately
        update(next.id, {
          status: "completed",
          finishedAt: Date.now(),
          total_generated: data?.stats?.generated ?? 0,
        });
        toast.success(`${next.label} — completed`, { description: `${data?.stats?.generated || 0} questions generated.` });
      } else {
        update(next.id, { status: "running", generation_id: genId });
      }
    } catch (e: any) {
      update(next.id, { status: "failed", error: e?.message || "Failed to start", finishedAt: Date.now() });
      toast.error(`${next.label} — failed to start`, { description: e?.message || "" });
    } finally {
      // Try to pump another slot
      setTimeout(() => pump(), 50);
    }
  }, [update]);

  // Re-pump whenever counts change
  useEffect(() => {
    const active = jobs.filter((j) => j.status === "starting" || j.status === "running").length;
    const pending = jobs.filter((j) => j.status === "pending").length;
    if (pending > 0 && active < MAX_PARALLEL) pump();
  }, [jobs, pump]);

  // ---- Poll status of all running generations ----
  useEffect(() => {
    const id = setInterval(async () => {
      const running = jobsRef.current.filter((j) => j.status === "running" && j.generation_id);
      if (!running.length) return;
      const ids = running.map((j) => j.generation_id!) as string[];
      const { data } = await supabase
        .from("ai_mock_generations")
        .select("id, status, total_requested, total_generated, error_message")
        .in("id", ids);
      if (!data) return;
      for (const row of data as any[]) {
        const job = jobsRef.current.find((j) => j.generation_id === row.id);
        if (!job) continue;
        const patch: Partial<DockJob> = {
          total_requested: row.total_requested ?? job.total_requested,
          total_generated: row.total_generated ?? job.total_generated,
        };
        if (row.status === "completed") {
          patch.status = "completed";
          patch.finishedAt = Date.now();
          toast.success(`${job.label} — done`, {
            description: `${row.total_generated || 0} questions generated.`,
            duration: 6000,
          });
        } else if (row.status === "failed" || row.status === "cancelled") {
          patch.status = row.status === "failed" ? "failed" : "cancelled";
          patch.finishedAt = Date.now();
          patch.error = row.error_message || undefined;
          toast.error(`${job.label} — ${row.status}`, { description: row.error_message || "" });
        }
        if (patch.status) update(job.id, patch);
      }
    }, 2500);
    return () => clearInterval(id);
  }, [update]);

  const enqueue = useCallback((items: { label: string; payload: any }[]) => {
    const additions: DockJob[] = items.map((it) => ({
      id: crypto.randomUUID(),
      label: it.label,
      payload: it.payload,
      status: "pending",
      createdAt: Date.now(),
    }));
    setJobs((js) => [...js, ...additions]);
    setIsOpen(true);
    toast(`Queued ${items.length} mock${items.length > 1 ? "s" : ""} for AI generation`, {
      description: "Up to 3 will generate in parallel. Track progress in the dock on the right.",
    });
  }, []);

  const cancel = useCallback(async (id: string) => {
    const j = jobsRef.current.find((x) => x.id === id);
    if (!j) return;
    if (j.status === "pending") {
      update(id, { status: "cancelled", finishedAt: Date.now() });
      return;
    }
    if (j.generation_id && (j.status === "running" || j.status === "starting")) {
      await supabase.from("ai_mock_generations").update({ status: "cancelled" }).eq("id", j.generation_id);
      update(id, { status: "cancelled", finishedAt: Date.now() });
    }
  }, [update]);

  const dismiss = useCallback((id: string) => {
    setJobs((js) => js.filter((j) => j.id !== id));
  }, []);
  const clearFinished = useCallback(() => {
    setJobs((js) => js.filter((j) => !["completed", "failed", "cancelled"].includes(j.status)));
  }, []);

  const value = useMemo<DockCtx>(() => {
    const activeCount = jobs.filter((j) => j.status === "starting" || j.status === "running").length;
    const pendingCount = jobs.filter((j) => j.status === "pending").length;
    const doneCount = jobs.filter((j) => j.status === "completed").length;
    const failCount = jobs.filter((j) => j.status === "failed" || j.status === "cancelled").length;
    return {
      jobs, enqueue, cancel, dismiss, clearFinished,
      isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), toggle: () => setIsOpen((o) => !o),
      activeCount, pendingCount, doneCount, failCount,
    };
  }, [jobs, isOpen, enqueue, cancel, dismiss, clearFinished]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMockGenDock() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMockGenDock must be used within MockGenDockProvider");
  return ctx;
}
