// Singleton background runner for the Admin SEO Dashboard's
// "Bulk Optimization" flow. The queue keeps running even if the
// monitoring dialog is closed or the user navigates within /admin/*.
//
// • Survives component unmount (lives at module scope).
// • Auto-saves every per-page result (snapshot + DB update) inside the loop.
// • Persists queue + logs to localStorage so a page reload can resume.
// • Subscribers re-render through a tiny pub/sub.

import { supabase } from "@/integrations/supabase/client";
import {
  buildStoredSeoSnapshot,
  contentTypeConfig,
  mergeKeywordBuckets,
  notifySeoSnapshotUpdated,
  saveSeoSnapshot,
  type SEOContentType,
} from "@/lib/seoAutomation";

export type ItemStatus = "pending" | "running" | "ok" | "fail" | "skipped";

export interface BulkItem {
  key: string;
  name: string;
  contentType: SEOContentType;
  id: string;
  /** Original record (used as AI input). */
  item: Record<string, any>;
  status: ItemStatus;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  oldScore?: number;
  newScore?: number;
  error?: string;
  step?: string;
  saveStatus?: "pending" | "saving" | "snapshot_saved" | "db_applied" | "verified" | "failed";
  savedAt?: number;
  snapshotId?: string;
  dbUpdated?: boolean;
  verified?: boolean;
  changedFields?: string[];
}

export interface LogEntry {
  ts: number;
  level: "info" | "ok" | "warn" | "error";
  msg: string;
}

export interface RunnerState {
  open: boolean;          // monitor dialog visibility (UI hint only)
  running: boolean;       // worker actively processing
  paused: boolean;
  finished: boolean;
  startedAt: number | null;
  items: BulkItem[];
  logs: LogEntry[];
  model: string;
  /** Last successful auto-save timestamp (per-item save). */
  lastSavedAt: number | null;
}

const STORAGE_KEY = "seo_bulk_runner_v1";
const MAX_LOGS = 500;

const initialState: RunnerState = {
  open: false,
  running: false,
  paused: false,
  finished: false,
  startedAt: null,
  items: [],
  logs: [],
  model: "openai/gpt-5-mini",
  lastSavedAt: null,
};

let state: RunnerState = loadPersisted() ?? initialState;
const listeners = new Set<() => void>();
let workerPromise: Promise<void> | null = null;
let onCompletedCallbacks: Array<() => void> = [];

function loadPersisted(): RunnerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunnerState;
    // If a previous tab crashed mid-run, we mark items as "running" → "pending"
    // so the worker will pick them up cleanly on next start.
    parsed.items = (parsed.items || []).map((it) =>
      it.status === "running" ? { ...it, status: "pending" as ItemStatus, step: undefined } : it
    );
    parsed.running = false; // never auto-resume; user must click Resume
    return parsed;
  } catch {
    return null;
  }
}

function persist() {
  try {
    // Keep payload light: drop large `item` blobs from persisted copy.
    const slim = {
      ...state,
      items: state.items.map((i) => ({ ...i, item: undefined as any })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    /* quota or serialization — ignore */
  }
}

function emit() {
  for (const l of listeners) l();
  persist();
}

function setState(patch: Partial<RunnerState> | ((s: RunnerState) => Partial<RunnerState>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}

function patchItem(key: string, patch: Partial<BulkItem>) {
  state = {
    ...state,
    items: state.items.map((it) => (it.key === key ? { ...it, ...patch } : it)),
  };
  emit();
}

function pushLog(level: LogEntry["level"], msg: string) {
  const next = [...state.logs, { ts: Date.now(), level, msg }];
  state = { ...state, logs: next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next };
  emit();
}

// ── public API ──

export const bulkSeoRunner = {
  getState: (): RunnerState => state,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  setOpen(open: boolean) {
    setState({ open });
  },
  pause() {
    if (!state.running || state.finished) return;
    setState({ paused: true });
    pushLog("warn", "Paused by user — queue will resume on click");
  },
  resume() {
    if (!state.paused) return;
    setState({ paused: false });
    pushLog("info", "Resumed by user");
  },
  cancel() {
    if (state.finished) {
      // Closing finished run = clear UI.
      setState({ open: false });
      return;
    }
    pushLog("warn", "Cancelled by user — stopping after current page");
    setState({ paused: false, finished: true, running: false });
  },
  clear() {
    state = { ...initialState };
    emit();
  },
  onCompleted(cb: () => void): () => void {
    onCompletedCallbacks.push(cb);
    return () => {
      onCompletedCallbacks = onCompletedCallbacks.filter((c) => c !== cb);
    };
  },
  /**
   * Enqueue a fresh run. If a run is already active, no-op.
   */
  start(targets: Array<{ key: string; name: string; contentType: SEOContentType; id: string; item: Record<string, any>; oldScore?: number }>) {
    if (state.running) return false;
    const items: BulkItem[] = targets.map((t) => ({
      key: t.key,
      name: t.name,
      contentType: t.contentType,
      id: t.id,
      item: t.item,
      oldScore: t.oldScore,
      status: "pending",
    }));
    state = {
      ...state,
      items,
      logs: [],
      running: true,
      paused: false,
      finished: false,
      startedAt: Date.now(),
      open: true,
      lastSavedAt: null,
    };
    emit();
    pushLog("info", `Bulk optimization started — ${items.length} pages queued (model: ${state.model})`);
    workerPromise = runWorker().catch((e) => {
      pushLog("error", `Worker crashed: ${e?.message || e}`);
      setState({ running: false, finished: true });
    });
    return true;
  },
};

function fmtMs(ms?: number) {
  if (ms == null) return "?";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

async function runWorker() {
  const total = state.items.length;
  let success = 0;
  let fail = 0;

  for (let i = 0; i < state.items.length; i++) {
    // Re-read current state each iteration (it may have been mutated).
    const current = state.items[i];
    if (!current || current.status === "ok" || current.status === "fail") {
      if (current?.status === "ok") success++;
      if (current?.status === "fail") fail++;
      continue;
    }
    if (state.finished) break; // cancelled

    // Pause loop
    while (state.paused && !state.finished) {
      await new Promise((r) => setTimeout(r, 300));
    }
    if (state.finished) break;

    const startedAt = Date.now();
    pushLog("info", `[${i + 1}/${total}] → ${current.name} (${current.contentType}) — invoking ai-seo-enhance`);
    patchItem(current.key, { status: "running", startedAt, step: "Calling AI…" });

    try {
      const { data, error } = await supabase.functions.invoke("ai-seo-enhance", {
        body: { contentType: current.contentType, data: current.item },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const sug = (data as any)?.suggestions;
      if (!sug) throw new Error("Missing suggestions");

      const meta = (data as any)?.meta || {};
      if (meta.totalTokens) {
        pushLog(
          "info",
          `   ↳ AI responded in ${fmtMs(meta.aiLatencyMs)} · ${Number(meta.totalTokens).toLocaleString()} tokens · $${(meta.estimatedCost || 0).toFixed(4)}`
        );
      }
      patchItem(current.key, { step: "Saving snapshot & DB…" });

      // ── Auto-save (snapshot + DB) ──
      await saveSeoSnapshot(buildStoredSeoSnapshot(current.contentType, current.item, sug));
      if (contentTypeConfig[current.contentType].supportsSeoColumns) {
        const update: Record<string, any> = {
          meta_title: sug.meta_title,
          meta_description: sug.meta_description,
          keywords: mergeKeywordBuckets(sug.keywords),
        };
        if (contentTypeConfig[current.contentType].supportsH1Column && sug.h1_tag) {
          update.h1_tag = sug.h1_tag;
        }
        const { error: ue } = await supabase
          .from(contentTypeConfig[current.contentType].table as any)
          .update(update)
          .eq("id", current.id);
        if (ue) throw ue;
      }

      const finishedAt = Date.now();
      const projected = sug?.seoScore?.projectedScore ?? sug?.seoScore?.overall;
      const newScore = typeof projected === "number" ? Math.round(projected) : undefined;
      patchItem(current.key, {
        status: "ok",
        finishedAt,
        durationMs: finishedAt - startedAt,
        promptTokens: meta.promptTokens,
        completionTokens: meta.completionTokens,
        totalTokens: meta.totalTokens,
        cost: meta.estimatedCost,
        newScore,
        step: undefined,
      });
      setState({ lastSavedAt: finishedAt });
      pushLog("ok", `✓ Auto-saved ${current.name} — score ${current.oldScore ?? "?"} → ${newScore ?? "?"} (${fmtMs(finishedAt - startedAt)})`);
      success++;
      await new Promise((r) => setTimeout(r, 200));
    } catch (e: any) {
      const finishedAt = Date.now();
      const msg = e?.message || "Unknown error";
      patchItem(current.key, {
        status: "fail",
        finishedAt,
        durationMs: finishedAt - startedAt,
        error: msg,
        step: undefined,
      });
      pushLog("error", `✕ ${current.name} — ${msg}`);
      fail++;
    }
  }

  setState({ running: false, finished: true });
  pushLog(fail === 0 ? "ok" : "warn", `Bulk run finished — ${success} optimized, ${fail} failed`);
  for (const cb of onCompletedCallbacks) {
    try { cb(); } catch { /* ignore */ }
  }
}

// ── React hook ──

import { useSyncExternalStore } from "react";
export function useBulkSeoRunner(): RunnerState {
  return useSyncExternalStore(
    (cb) => bulkSeoRunner.subscribe(cb),
    () => bulkSeoRunner.getState(),
    () => bulkSeoRunner.getState()
  );
}
