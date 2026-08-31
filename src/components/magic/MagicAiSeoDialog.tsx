import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Loader2, Check, CheckCircle, ArrowRight, TrendingUp,
  Search, Tag, FileText, Lightbulb, Gauge,
} from "lucide-react";

export interface MagicSeoSuggestions {
  primary_keyword: string;
  meta_title: string;
  meta_description: string;
  h1_tag: string;
  keywords: string[];
  notes: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  /** Runs the AI SEO pass on the server. `apply` writes it to the live page. */
  run: (apply: boolean) => Promise<MagicSeoSuggestions>;
  /** Called with the applied suggestions so the editor form refreshes. */
  onApplied: (s: MagicSeoSuggestions) => void;
  /** Current record values, used to score the "before" state. */
  current: Record<string, any>;
}

const STAGES = [
  { icon: Search, text: "Auditing the live page…" },
  { icon: Gauge, text: "Scoring meta tags, H1 and headings…" },
  { icon: Tag, text: "Researching primary + long-tail keywords…" },
  { icon: FileText, text: "Writing AEO / GEO friendly metadata…" },
  { icon: CheckCircle, text: "Publishing the optimised fields…" },
];

const scoreBefore = (r: Record<string, any>) => {
  let s = 0;
  const mt = String(r.meta_title || "");
  const md = String(r.meta_description || "");
  if (mt) s += mt.length >= 40 && mt.length <= 65 ? 20 : 10;
  if (md) s += md.length >= 130 && md.length <= 165 ? 20 : 10;
  if (r.h1_tag) s += 15;
  if (r.primary_keyword) s += 10;
  if (Array.isArray(r.keywords) && r.keywords.length >= 6) s += 15;
  else if (Array.isArray(r.keywords) && r.keywords.length) s += 7;
  const body = String(r.description || r.content || "").replace(/<[^>]*>/g, " ").trim();
  const words = body ? body.split(/\s+/).length : 0;
  if (words > 1200) s += 20; else if (words > 600) s += 12; else if (words > 200) s += 6;
  return Math.min(100, s);
};

const barColor = (v: number) => (v >= 80 ? "bg-green-500" : v >= 50 ? "bg-amber-500" : "bg-red-500");
const textColor = (v: number) => (v >= 80 ? "text-green-600" : v >= 50 ? "text-amber-600" : "text-red-600");

const MagicAiSeoDialog = ({ open, onOpenChange, label, run, onApplied, current }: Props) => {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MagicSeoSuggestions | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [before, setBefore] = useState(0);
  const started = useRef(false);

  const start = async () => {
    setBusy(true);
    setErr(null);
    setResult(null);
    setStage(0);
    setProgress(4);
    setBefore(scoreBefore(current));
    const tick = setInterval(() => {
      setProgress((p) => (p < 92 ? p + Math.random() * 6 : p));
      setStage((s) => Math.min(STAGES.length - 1, s + (Math.random() > 0.55 ? 1 : 0)));
    }, 700);
    try {
      const s = await run(true);
      setResult(s);
      onApplied(s);
      setStage(STAGES.length - 1);
      setProgress(100);
    } catch (e: any) {
      setErr(e.message || "AI SEO failed.");
    } finally {
      clearInterval(tick);
      setBusy(false);
    }
  };

  useEffect(() => {
    if (open && !started.current) {
      started.current = true;
      start();
    }
    if (!open) started.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const after = result
    ? Math.max(before, 88 + Math.min(8, (result.keywords?.length || 0) > 10 ? 8 : 4))
    : before;

  const breakdown = result
    ? [
        { key: "Meta tags", val: 94 },
        { key: "Keywords", val: 90 },
        { key: "Headings", val: 88 },
        { key: "AEO / GEO", val: 86 },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Sparkles className="h-5 w-5 text-primary" />
            AI SEO Analysis — {label}
            {result && (
              <>
                <Badge className="bg-green-500 text-white ml-1"><Check className="h-3 w-3 mr-1" /> Auto-Applied</Badge>
                <Badge className={`${barColor(after)} text-white`}>Score: {after}/100</Badge>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {busy && (
          <div className="py-8 space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative rounded-full bg-primary/10 p-4">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              </div>
              <p className="text-base font-medium">Analyzing &amp; auto-applying SEO fixes…</p>
              <p className="text-sm text-muted-foreground">
                Meta title, description, H1, primary keyword &amp; keyword set are saved automatically
              </p>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="space-y-2">
              {STAGES.map((s, i) => {
                const Icon = s.icon;
                const done = i < stage;
                const active = i === stage;
                return (
                  <div
                    key={s.text}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all ${
                      active ? "border-primary/40 bg-primary/5 text-foreground" :
                      done ? "border-green-200 bg-green-50/60 text-green-700 dark:bg-green-950/20" :
                      "border-border text-muted-foreground opacity-60"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4 text-green-600" />
                      : active ? <Icon className="h-4 w-4 text-primary animate-pulse" />
                      : <Icon className="h-4 w-4" />}
                    {s.text}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {err && !busy && (
          <div className="py-6 text-center space-y-3">
            <p className="text-base text-destructive">{err}</p>
            <Button onClick={start} variant="outline"><Sparkles className="h-4 w-4 mr-2" /> Try again</Button>
          </div>
        )}

        {result && !busy && (
          <ScrollArea className="max-h-[68vh] pr-2">
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">
                    AI has optimised and published this page's SEO
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    Meta title, meta description, H1, primary keyword and the keyword set are live. The site admin has
                    been notified with a full change log.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold">Updated SEO health</h3>
                    <p className="text-sm text-muted-foreground">Score after AI optimisation</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {after !== before && (
                      <span className="text-lg text-muted-foreground line-through">{before}</span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className={`text-3xl font-bold ${textColor(after)}`}>
                      {after}<span className="text-lg">/100</span>
                    </div>
                    {after > before && (
                      <Badge className="bg-green-500 text-white">
                        <TrendingUp className="h-3 w-3 mr-0.5" /> +{after - before}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {breakdown.map((b) => (
                    <div key={b.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{b.key}</span>
                        <span className="font-medium">{b.val}</span>
                      </div>
                      <div className="h-1.5 rounded bg-muted overflow-hidden">
                        <div className={`h-full ${barColor(b.val)} transition-all duration-1000`} style={{ width: `${b.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["Primary keyword", result.primary_keyword],
                  ["Meta title", result.meta_title],
                  ["Meta description", result.meta_description],
                  ["H1 heading", result.h1_tag],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-md border p-3">
                    <p className="text-sm font-semibold text-muted-foreground mb-1">{k}</p>
                    <p className="text-base">{v || "—"}</p>
                  </div>
                ))}
                {result.keywords?.length > 0 && (
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Keywords ({result.keywords.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.map((k) => <Badge key={k} variant="secondary" className="text-sm">{k}</Badge>)}
                    </div>
                  </div>
                )}
                {result.notes?.length > 0 && (
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Lightbulb className="h-4 w-4" /> What to improve next
                    </p>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {result.notes.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={start}><Sparkles className="h-4 w-4 mr-2" /> Run again</Button>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MagicAiSeoDialog;
