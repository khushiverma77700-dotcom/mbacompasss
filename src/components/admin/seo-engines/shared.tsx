import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const COLORS = [
  "hsl(210 80% 55%)",
  "hsl(150 60% 40%)",
  "hsl(35 85% 55%)",
  "hsl(280 60% 55%)",
  "hsl(0 75% 55%)",
];

export const priorityVariant = (p: string) =>
  p === "high" ? "default" : p === "low" ? "outline" : "secondary";

export const scoreBadge = (score: number) => {
  const s = Math.round(Number(score ?? 0));
  const variant = s >= 80 ? "default" : s >= 60 ? "secondary" : s >= 40 ? "outline" : "destructive";
  return <Badge variant={variant as never}>{s}</Badge>;
};

export const statusVariant = (status: string) =>
  status === "applied" || status === "approved" ? "default"
  : status === "failed" ? "destructive"
  : status === "rejected" || status === "reverted" ? "outline"
  : "secondary";

/** Invoke an SEO engine edge function and surface real errors. */
export async function invokeEngine<T = any>(
  fn: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let details = error.message;
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx && typeof ctx.text === "function") details = await ctx.text();
    } catch {
      /* keep the original message */
    }
    throw new Error(details);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.error("Nothing to export yet.");
    return;
  }
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
