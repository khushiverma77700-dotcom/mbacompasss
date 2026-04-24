import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExternalLink, RefreshCw, Search, AlertTriangle, CheckCircle2, Pencil } from "lucide-react";

type PageType = "article" | "college" | "institute" | "college_section";

interface PageRow {
  id: string;
  type: PageType;
  title: string;
  slug: string;
  url: string;
  editUrl: string;
  updatedAt: string | null;
  contentLength: number;
  citations: { source: string; year?: string }[];
}

const CITATION_RX = /\[src:\s*([^\]\d]+?)\s*(\d{4}(?:[-–]\d{2,4})?)?\s*\]/gi;
const LEGACY_RX = /\(\s*source:\s*([^)\d]+?)\s*(\d{4}(?:[-–]\d{2,4})?)?\s*\)/gi;

const extractCitations = (html: string | null | undefined) => {
  if (!html) return [] as { source: string; year?: string }[];
  const found: { source: string; year?: string }[] = [];
  const seen = new Set<string>();
  const push = (s: string, y?: string) => {
    const source = s.trim().replace(/[,;:]+$/, "");
    const year = y?.trim();
    const key = `${source.toLowerCase()}|${year || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ source, year });
  };
  let m: RegExpExecArray | null;
  while ((m = CITATION_RX.exec(html)) !== null) push(m[1], m[2]);
  while ((m = LEGACY_RX.exec(html)) !== null) push(m[1], m[2]);
  return found;
};

const currentYear = new Date().getFullYear();

const yearFreshness = (year?: string): "fresh" | "stale" | "missing" => {
  if (!year) return "missing";
  const num = parseInt(year.slice(0, 4), 10);
  if (isNaN(num)) return "missing";
  if (num >= currentYear - 1) return "fresh";
  return "stale";
};

const SOURCE_KEYS = ["NIRF", "Placement Report", "Admission Brochure", "Brochure", "CAT", "XAT", "GMAT"];

const AdminCitationsAudit = () => {
  const [rows, setRows] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [freshFilter, setFreshFilter] = useState<string>("all");

  const fetchAll = async () => {
    setLoading(true);
    const [articles, colleges, institutes, sections] = await Promise.all([
      supabase.from("articles").select("id, title, slug, content, updated_at").eq("published", true).limit(1000),
      supabase.from("colleges").select("id, name, slug, description, updated_at").limit(1000),
      supabase.from("institutes").select("id, name, slug, description, updated_at").limit(1000),
      supabase.from("college_sections").select("id, college_id, section_type, title, content, updated_at").limit(2000),
    ]);

    const all: PageRow[] = [];

    for (const a of articles.data || []) {
      const citations = extractCitations(a.content);
      if (citations.length === 0) continue;
      all.push({
        id: a.id,
        type: "article",
        title: a.title,
        slug: a.slug,
        url: `/article/${a.slug}`,
        editUrl: `/admin/articles?edit=${a.id}`,
        updatedAt: a.updated_at,
        contentLength: a.content?.length || 0,
        citations,
      });
    }
    for (const c of colleges.data || []) {
      const citations = extractCitations(c.description);
      if (citations.length === 0) continue;
      all.push({
        id: c.id,
        type: "college",
        title: c.name,
        slug: c.slug,
        url: `/college/${c.slug}`,
        editUrl: `/admin/colleges?edit=${c.id}`,
        updatedAt: c.updated_at,
        contentLength: c.description?.length || 0,
        citations,
      });
    }
    for (const i of institutes.data || []) {
      const citations = extractCitations(i.description);
      if (citations.length === 0) continue;
      all.push({
        id: i.id,
        type: "institute",
        title: i.name,
        slug: i.slug,
        url: `/institute/${i.slug}`,
        editUrl: `/admin/institutes?edit=${i.id}`,
        updatedAt: i.updated_at,
        contentLength: i.description?.length || 0,
        citations,
      });
    }

    // Map college id -> slug for section URLs
    const collegeSlugMap = new Map<string, string>();
    for (const c of colleges.data || []) collegeSlugMap.set(c.id, c.slug);

    for (const s of sections.data || []) {
      const citations = extractCitations(s.content);
      if (citations.length === 0) continue;
      const cSlug = collegeSlugMap.get(s.college_id);
      all.push({
        id: s.id,
        type: "college_section",
        title: `${s.title || s.section_type} (section)`,
        slug: cSlug || s.college_id,
        url: cSlug ? `/college/${cSlug}` : "#",
        editUrl: `/admin/college-sections?college=${s.college_id}&section=${s.id}`,
        updatedAt: s.updated_at,
        contentLength: s.content?.length || 0,
        citations,
      });
    }

    all.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    setRows(all);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let fresh = 0;
    let stale = 0;
    let missing = 0;
    const sourceCounts = new Map<string, number>();
    for (const r of rows) {
      for (const c of r.citations) {
        total++;
        const f = yearFreshness(c.year);
        if (f === "fresh") fresh++;
        else if (f === "stale") stale++;
        else missing++;
        const key = c.source;
        sourceCounts.set(key, (sourceCounts.get(key) || 0) + 1);
      }
    }
    return { total, fresh, stale, missing, sourceCounts };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.slug.toLowerCase().includes(q)) return false;
      if (sourceFilter !== "all" && !r.citations.some((c) => c.source.toLowerCase().includes(sourceFilter.toLowerCase()))) return false;
      if (freshFilter !== "all") {
        const has = r.citations.some((c) => yearFreshness(c.year) === freshFilter);
        if (!has) return false;
      }
      return true;
    });
  }, [rows, search, typeFilter, sourceFilter, freshFilter]);

  const typeLabel = (t: PageType) =>
    t === "article" ? "Blog" : t === "college" ? "College" : t === "institute" ? "Institute" : "College Section";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Citation Sources Audit</h1>
          <p className="text-sm text-muted-foreground">
            Inline source markers ([src:NIRF 2025], placement reports, admission brochures) extracted from every AI-generated page.
          </p>
        </div>
        <Button onClick={fetchAll} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Pages with citations</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{rows.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total citations</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Fresh (≥ {currentYear - 1})</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5" />{stats.fresh}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Stale / missing year</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600 flex items-center gap-1.5"><AlertTriangle className="w-5 h-5" />{stats.stale + stats.missing}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[...stats.sourceCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([src, count]) => (
                <Badge key={src} variant="secondary" className="text-xs">
                  {src} · <span className="ml-1 font-bold">{count}</span>
                </Badge>
              ))}
            {stats.sourceCounts.size === 0 && <span className="text-sm text-muted-foreground">No citations found yet.</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <CardTitle className="text-base flex-1">Pages</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title or slug…"
                  className="pl-8 h-9 w-56"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="article">Blogs</SelectItem>
                  <SelectItem value="college">Colleges</SelectItem>
                  <SelectItem value="institute">Institutes</SelectItem>
                  <SelectItem value="college_section">College sections</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {SOURCE_KEYS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={freshFilter} onValueChange={setFreshFilter}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All freshness</SelectItem>
                  <SelectItem value="fresh">Fresh</SelectItem>
                  <SelectItem value="stale">Stale</SelectItem>
                  <SelectItem value="missing">No year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Citations</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Scanning content…</TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pages match the current filters.</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={`${r.type}-${r.id}`}>
                  <TableCell className="max-w-xs">
                    <div className="font-medium text-foreground line-clamp-1">{r.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">/{r.slug}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{typeLabel(r.type)}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {r.citations.map((c, i) => {
                        const f = yearFreshness(c.year);
                        const cls =
                          f === "fresh"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                            : f === "stale"
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                            : "border-border bg-muted text-muted-foreground";
                        return (
                          <span key={i} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
                            {c.source}
                            {c.year ? <span className="opacity-80">{c.year}</span> : <span className="italic">no year</span>}
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="default" className="h-7 px-2 text-xs">
                        <Link to={r.editUrl}>
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Link>
                      </Button>
                      <Link to={r.url} target="_blank" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCitationsAudit;
