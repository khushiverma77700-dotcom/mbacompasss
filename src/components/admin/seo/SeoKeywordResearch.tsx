// Keyword research console — what the AI researched for each page, and why.
//
// The engine's `keyword_research` job asks the model to research each page's
// demand (best, top-ranking, related, long-tail and competitor terms), stores
// every keyword with the reason it was selected, attaches Semrush metrics when
// the connector is linked, and turns the winning set into a keyword-injection
// change for that page. This screen reads those rows and can trigger research
// for the whole rotation or one specific page.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search, Sparkles } from "lucide-react";

interface ResearchedKeyword {
  id: string;
  keyword: string;
  keyword_kind: string | null;
  intent: string | null;
  research_reason: string | null;
  research_source_path: string | null;
  researched_at: string | null;
  search_volume: number | null;
  difficulty: number | null;
  current_position: number | null;
  clicks: number | null;
  impressions: number | null;
  injected_at: string | null;
}

const KIND_LABEL: Record<string, string> = {
  best: "Best for this page",
  top_ranking: "Top-ranking term",
  related: "Related",
  long_tail: "Long-tail",
  competitor: "Competitor term",
};

const KIND_TONE: Record<string, string> = {
  best: "bg-emerald-100 text-emerald-800",
  top_ranking: "bg-sky-100 text-sky-800",
  related: "bg-muted text-muted-foreground",
  long_tail: "bg-violet-100 text-violet-800",
  competitor: "bg-amber-100 text-amber-800",
};

export default function SeoKeywordResearch() {
  const [rows, setRows] = useState<ResearchedKeyword[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<"load" | "run" | null>("load");
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [pagePath, setPagePath] = useState("");

  const load = useCallback(async () => {
    setBusy("load");
    try {
      const { data, error } = await supabase.functions.invoke("seo-intel-control", {
        body: { action: "keyword_research", limit: 500 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(String((data as any).error));
      setRows(((data as any).keywords ?? []) as ResearchedKeyword[]);
      setTotal(Number((data as any).total ?? 0));
    } catch (e) {
      toast.error((e as Error).message || "Could not load the researched keywords");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async () => {
    setBusy("run");
    try {
      const { data, error } = await supabase.functions.invoke("seo-intel-control", {
        body: { action: "keyword_research", run: true, batch: 10, path: pagePath.trim() || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(String((data as any).error));
      toast.success(pagePath.trim() ? `Research started for ${pagePath.trim()}` : "Research started for the next pages in the rotation");
      setTimeout(load, 8000);
    } catch (e) {
      toast.error((e as Error).message || "Could not start the research");
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && String(r.keyword_kind ?? "related") !== kind) return false;
      if (!needle) return true;
      return `${r.keyword} ${r.research_source_path ?? ""} ${r.research_reason ?? ""}`.toLowerCase().includes(needle);
    });
  }, [rows, kind, q]);

  const byPage = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const p = r.research_source_path ?? "—";
      map.set(p, (map.get(p) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [rows]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" /> Keyword research
          </CardTitle>
          <CardDescription>
            The engine researches each page's search demand with AI, records why every keyword was chosen, and turns the best set into
            a change on that page. Volume and difficulty appear only where the Semrush connector supplies them — nothing is estimated here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Research one page, e.g. /college/iim-ahmedabad"
              value={pagePath}
              onChange={(e) => setPagePath(e.target.value)}
              className="max-w-sm"
            />
            <Button disabled={!!busy} onClick={run}>
              {busy === "run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-1.5">{pagePath.trim() ? "Research this page" : "Research next pages"}</span>
            </Button>
            <Button variant="outline" disabled={!!busy} onClick={load}>
              {busy === "load" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1.5">Refresh</span>
            </Button>
            <Badge variant="secondary">{total.toLocaleString("en-IN")} researched keyword(s)</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Filter by keyword, page or reason" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-56"><SelectValue placeholder="All kinds" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                {Object.entries(KIND_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!!byPage.length && (
            <div className="flex flex-wrap gap-2">
              {byPage.map(([p, n]) => (
                <button key={p} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted" onClick={() => setQ(p)}>
                  <span className="font-mono">{p}</span> <span className="text-muted-foreground">· {n}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[1.375rem]">Researched keywords and why they were selected</CardTitle>
          <CardDescription>{filtered.length.toLocaleString("en-IN")} shown</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[36rem]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Why it was selected</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Difficulty</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.keyword}</TableCell>
                    <TableCell>
                      <Badge className={KIND_TONE[String(r.keyword_kind ?? "related")] ?? KIND_TONE.related}>
                        {KIND_LABEL[String(r.keyword_kind ?? "related")] ?? r.keyword_kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate font-mono text-sm">{r.research_source_path ?? "—"}</TableCell>
                    <TableCell className="max-w-[26rem] text-sm text-muted-foreground">{r.research_reason ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.search_volume == null ? "—" : r.search_volume.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">{r.difficulty == null ? "—" : Number(r.difficulty).toFixed(0)}</TableCell>
                    <TableCell className="text-right">{r.current_position == null ? "—" : Number(r.current_position).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      {busy ? "Loading…" : "No researched keywords yet — start the research above."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
