import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Action = "fix_all" | "rewrite_legacy_domains" | "fix_missing_meta" | "flush_indexing" | "rebuild_sitemap";

interface AutoFixPanelProps {
  /** Restrict the panel to a single action; default shows everything. */
  actions?: Action[];
  /** Optional custom heading/subtitle for context-specific embeds. */
  title?: string;
  subtitle?: string;
  className?: string;
  onComplete?: (summary: any) => void;
}

const ACTION_META: Record<Action, { label: string; hint: string }> = {
  fix_all: {
    label: "Auto-fix everything",
    hint: "Rewrites legacy domains, AI-generates missing meta, retries failed indexing and rebuilds the sitemap — in one click.",
  },
  rewrite_legacy_domains: {
    label: "Rewrite legacy domains",
    hint: "Replaces bschoolbuzz/bestmbacoaching URLs with mbacompass.in across content + indexing queue.",
  },
  fix_missing_meta: {
    label: "AI-fix missing meta",
    hint: "Finds rows without meta_title/description and writes AI-generated SEO to the database.",
  },
  flush_indexing: {
    label: "Flush indexing queue",
    hint: "Resets failed indexing rows and force-submits pending URLs to Google + IndexNow.",
  },
  rebuild_sitemap: {
    label: "Rebuild sitemap",
    hint: "Regenerates and pings the live sitemap so search engines see your latest URLs.",
  },
};

export const AutoFixPanel = ({
  actions = ["fix_all"],
  title = "Auto-fix engine",
  subtitle = "One-click automated remediation. AI handles the heavy lifting; safe operations only.",
  className,
  onComplete,
}: AutoFixPanelProps) => {
  const [busy, setBusy] = useState<Action | null>(null);
  const [lastSummary, setLastSummary] = useState<any | null>(null);

  const run = async (action: Action) => {
    setBusy(action);
    setLastSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action, limit: 25 },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Auto-fix failed");
      setLastSummary(data.summary);
      toast.success(`${ACTION_META[action].label} completed`);
      onComplete?.(data.summary);
    } catch (e: any) {
      toast.error(e?.message || "Auto-fix failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className={`p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent ${className || ""}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Wand2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            {title}
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">Hybrid auto-fix</Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {actions.map((a) => {
          const meta = ACTION_META[a];
          const isBusy = busy === a;
          return (
            <Button
              key={a}
              variant={a === "fix_all" ? "default" : "outline"}
              className="justify-start h-auto py-3 text-left"
              disabled={busy !== null}
              onClick={() => run(a)}
            >
              <div className="flex items-start gap-2 w-full">
                {isBusy ? (
                  <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{meta.label}</div>
                  <div className="text-[11px] opacity-75 mt-0.5 whitespace-normal leading-snug">{meta.hint}</div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {lastSummary && (
        <div className="mt-4 rounded-lg border border-border bg-background/60 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-medium">Last run completed</span>
          </div>
          {(lastSummary.steps || []).map((s: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-muted-foreground">
              <AlertTriangle className="w-3 h-3 mt-0.5 text-warning" />
              <code className="font-mono break-all">
                {s.name}: {JSON.stringify({ ...s, name: undefined })}
              </code>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};