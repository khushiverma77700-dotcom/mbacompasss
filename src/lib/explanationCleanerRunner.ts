// Singleton background runner for the Explanation Cleaner.
// Survives route changes — only dies on full page reload / tab close.
import { supabase } from "@/integrations/supabase/client";

export type CleanerScope = "all" | "test" | "section" | "topic" | "question";

export type CleanerConfig = {
  scope: CleanerScope;
  test_id?: string;
  section_id?: string;
  topic?: string;
  question_id?: string;
  force: boolean;
  done_only?: boolean;
  batchSize: number;
};

export type CleanerError = { id: string; message: string; at: number };

export type CleanerState = {
  running: boolean;
  paused: boolean;
  config: CleanerConfig | null;
  total: number;
  remaining: number;
  processed: number;     // this run
  failed: number;        // this run
  promptTokens: number;  // this run
  completionTokens: number; // this run
  costUsd: number;       // this run (estimated)
  startTs: number | null;
  lastTickTs: number | null;
  log: string[];
  errors: CleanerError[];
};

// Gemini 2.5 Flash list pricing (USD per 1M tokens) — close enough for an estimate.
const PRICE_IN_PER_M = 0.30;
const PRICE_OUT_PER_M = 2.50;

const STORAGE_KEY = "explanation-cleaner-state-v1";

const loadPersisted = (): Partial<CleanerState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    // never restore "running" or "paused" — the loop only lives in memory.
    return { ...p, running: false, paused: false };
  } catch {
    return {};
  }
};

const initial: CleanerState = {
  running: false,
  paused: false,
  config: null,
  total: 0,
  remaining: 0,
  processed: 0,
  failed: 0,
  promptTokens: 0,
  completionTokens: 0,
  costUsd: 0,
  startTs: null,
  lastTickTs: null,
  log: [],
  errors: [],
  ...loadPersisted(),
};

let state: CleanerState = initial;
const listeners = new Set<(s: CleanerState) => void>();
let stopRequested = false;

const persist = () => {
  try {
    const { running: _r, ...rest } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {}
};

const emit = () => {
  for (const cb of listeners) cb(state);
  persist();
};

const update = (patch: Partial<CleanerState>) => {
  state = { ...state, ...patch };
  emit();
};

export const explanationCleaner = {
  getState: (): CleanerState => state,

  subscribe(cb: (s: CleanerState) => void) {
    listeners.add(cb);
    cb(state);
    return () => listeners.delete(cb);
  },

  buildFilters(config: CleanerConfig) {
    const f: any = { force: config.force, done_only: config.done_only === true };
    if (config.scope === "test") f.test_id = config.test_id || undefined;
    if (config.scope === "section") f.section_id = config.section_id || undefined;
    if (config.scope === "topic") {
      f.topic = config.topic || undefined;
      if (config.test_id) f.test_id = config.test_id;
    }
    if (config.scope === "question") f.question_id = config.question_id || undefined;
    return f;
  },

  async refreshStats(config: CleanerConfig) {
    const filters = this.buildFilters(config);
    const { data, error } = await supabase.functions.invoke("reformat-explanations", {
      body: { mode: "stats", ...filters },
    });
    if (error) {
      update({ log: [`Stats error: ${error.message}`, ...state.log].slice(0, 100) });
      return null;
    }
    update({
      total: data?.total ?? 0,
      remaining: data?.remaining ?? 0,
    });
    return data;
  },

  async start(config: CleanerConfig) {
    if (state.running) return;
    stopRequested = false;
    update({
      running: true,
      config,
      processed: 0,
      failed: 0,
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      startTs: Date.now(),
      lastTickTs: Date.now(),
      log: [`Started · scope=${config.scope} · batch=${config.batchSize}${config.done_only ? " · redo-done" : config.force ? " · force" : ""}`],
      errors: [],
    });
    await this.refreshStats(config);

    const filters = this.buildFilters(config);

    while (!stopRequested) {
      try {
        const { data, error } = await supabase.functions.invoke("reformat-explanations", {
          body: { mode: "process", batch_size: config.batchSize, ...filters },
        });
        if (error) {
          update({
            log: [`Error: ${error.message}`, ...state.log].slice(0, 100),
          });
          break;
        }
        const p = data?.processed ?? 0;
        const f = data?.failed ?? 0;
        const pt = data?.prompt_tokens ?? 0;
        const ct = data?.completion_tokens ?? 0;
        const batchCost =
          (pt / 1_000_000) * PRICE_IN_PER_M + (ct / 1_000_000) * PRICE_OUT_PER_M;
        const newErrors: CleanerError[] = (data?.errors ?? []).map((e: any) => ({
          id: e.id,
          message: e.message,
          at: Date.now(),
        }));
        update({
          processed: state.processed + p,
          failed: state.failed + f,
          promptTokens: state.promptTokens + pt,
          completionTokens: state.completionTokens + ct,
          costUsd: state.costUsd + batchCost,
          remaining: data?.remaining ?? 0,
          lastTickTs: Date.now(),
          log: [
            `Batch +${p} ok, ${f} failed, ${data?.remaining ?? 0} left · +${pt}/${ct} tok · +$${batchCost.toFixed(4)}`,
            ...state.log,
          ].slice(0, 100),
          errors: [...newErrors, ...state.errors].slice(0, 50),
        });
        if (data?.done || (p === 0 && f === 0)) break;
        await new Promise((r) => setTimeout(r, 250));
      } catch (e: any) {
        update({ log: [`Crash: ${e?.message ?? e}`, ...state.log].slice(0, 100) });
        break;
      }
    }
    update({ running: false });
  },

  stop() {
    stopRequested = true;
  },

  reset() {
    update({
      processed: 0,
      failed: 0,
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      log: [],
      errors: [],
      startTs: null,
      lastTickTs: null,
    });
  },
};

export const PRICING = { PRICE_IN_PER_M, PRICE_OUT_PER_M };
