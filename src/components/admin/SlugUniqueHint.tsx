import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Mirrors the database ensure_unique_slug normaliser. */
export function normalizeSlug(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

type Props = {
  /** Table whose slugs must be unique. */
  table: string;
  slug: string | null | undefined;
  /** Id of the record being edited, so its own slug is not counted. */
  excludeId?: string | null;
  /** Optional: apply the corrected slug into the form. */
  onApply?: (slug: string) => void;
};

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "unique"; slug: string; normalized: boolean }
  | { kind: "taken"; original: string; suggestion: string };

/**
 * Live uniqueness check shown under every slug input. The database
 * auto-corrects duplicates on save (slug-2, slug-3...); this tells the
 * admin beforehand what the saved slug will be.
 */
export function SlugUniqueHint({ table, slug, excludeId, onApply }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    const base = normalizeSlug(slug || "");
    if (!base) { setState({ kind: "idle" }); return; }
    setState({ kind: "checking" });
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select("id, slug")
        .like("slug", `${base}%`)
        .limit(500);
      if (cancelled) return;
      if (error) { setState({ kind: "idle" }); return; }
      const taken = new Set<string>(
        (data || [])
          .filter((r: any) => !excludeId || String(r.id) !== String(excludeId))
          .map((r: any) => r.slug),
      );
      if (!taken.has(base)) {
        setState({ kind: "unique", slug: base, normalized: base !== (slug || "").trim() });
        return;
      }
      let n = 2;
      while (taken.has(`${base}-${n}`)) n++;
      setState({ kind: "taken", original: base, suggestion: `${base}-${n}` });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [table, slug, excludeId]);

  if (state.kind === "idle") return null;
  if (state.kind === "checking") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking slug...
      </p>
    );
  }
  if (state.kind === "unique") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-primary">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>
          This is a unique slug.
          {state.normalized && <> It will be saved as <code className="font-mono">{state.slug}</code>.</>}
        </span>
      </p>
    );
  }
  return (
    <div className="mt-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-sm">
      <p className="flex items-start gap-1.5 text-destructive">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <code className="font-mono">{state.original}</code> is already used. Our system has auto-corrected it:
          this will be saved with the changed slug <code className="font-mono font-semibold">{state.suggestion}</code>.
        </span>
      </p>
      {onApply && (
        <button
          type="button"
          onClick={() => onApply(state.suggestion)}
          className="mt-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Use {state.suggestion} now
        </button>
      )}
    </div>
  );
}
