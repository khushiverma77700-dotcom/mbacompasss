import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Play, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Hosts that are considered "ours" — links to these are INTERNAL and
 * must NEVER be rewritten. Add new domains here when launching them.
 */
const INTERNAL_HOSTS = [
  "bschoolbuzz.com",
  "bestmbacoaching.com",
  "mbacompass.in",
  "coach-compass-finder.lovable.app",
  "lovable.app", // any lovable preview/staging
  "localhost",
];

/**
 * Recognised national portals — links pointing here are already official and
 * should be left alone.
 */
const OFFICIAL_PORTAL_HOSTS = [
  "nirfindia.org",
  "aicte-india.org",
  "naac.gov.in",
  "ugc.gov.in",
  "iimcat.ac.in",
  "xatonline.in",
  "mba.com",
  "ets.org",
  "cmat.nta.nic.in",
  "nmat.org",
  "snaptest.org",
  "iift.nta.nic.in",
];

interface CollegeRow {
  id: string;
  name: string;
  slug: string;
  website: string | null;
}

interface SectionRow {
  id: string;
  college_id: string;
  section_type: string;
  content: string | null;
}

interface UpdateLog {
  collegeName: string;
  sectionType: string;
  rewrites: number;
  status: "ok" | "error" | "skipped";
  message?: string;
}

const extractHost = (url: string): string | null => {
  try {
    const u = new URL(url, "https://placeholder.invalid");
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

const isInternal = (url: string): boolean => {
  // Relative links / fragments / mailto / tel = internal
  if (!url || url.startsWith("/") || url.startsWith("#") || url.startsWith("mailto:") || url.startsWith("tel:")) {
    return true;
  }
  const host = extractHost(url);
  if (!host) return true;
  return INTERNAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
};

const isOfficialPortal = (url: string): boolean => {
  const host = extractHost(url);
  if (!host) return false;
  return OFFICIAL_PORTAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
};

const collegeDomain = (website: string | null): string | undefined => {
  if (!website) return undefined;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Build the official replacement URL for an external link.
 * Always biases to the college's own domain; falls back to a Google query
 * restricted to "<college name> official site".
 */
const buildOfficialUrl = (originalLabel: string, college: CollegeRow): string => {
  const domain = collegeDomain(college.website);
  const cleanLabel = originalLabel.replace(/[↗\s]+$/g, "").trim() || college.name;

  if (domain) {
    return `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${cleanLabel}`.trim())}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${college.name} official site ${cleanLabel}`.trim())}`;
};

/**
 * Rewrite external hyperlinks inside an HTML string.
 * - Skips internal links (our own domains, relative URLs).
 * - Skips already-official portal links (NIRF, AICTE, etc.).
 * - Rewrites everything else (Google searches, partner sites, generic externals)
 *   to point at the college's own domain via site:domain query.
 */
const rewriteHtml = (html: string, college: CollegeRow): { html: string; count: number } => {
  if (!html) return { html: html || "", count: 0 };
  let count = 0;

  const out = html.replace(
    /<a\b([^>]*?)href=(["'])([^"']+)\2([^>]*)>([\s\S]*?)<\/a>/gi,
    (match, preAttrs: string, _q: string, href: string, postAttrs: string, inner: string) => {
      // Internal → leave untouched
      if (isInternal(href)) return match;
      // Already-official global portal → leave untouched
      if (isOfficialPortal(href)) return match;

      // Otherwise rewrite — use the visible label as the search hint
      const label = inner.replace(/<[^>]+>/g, "").trim();
      const newHref = buildOfficialUrl(label, college);
      if (newHref === href) return match;
      count++;
      return `<a${preAttrs}href="${newHref}"${postAttrs}>${inner}</a>`;
    },
  );

  return { html: out, count };
};

const AdminHyperlinkUpdate = () => {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [logs, setLogs] = useState<UpdateLog[]>([]);
  const [summary, setSummary] = useState<{
    collegesScanned: number;
    sectionsUpdated: number;
    linksRewritten: number;
    errors: number;
  } | null>(null);

  const runUpdate = async () => {
    setRunning(true);
    setLogs([]);
    setSummary(null);
    setProgress({ done: 0, total: 0, current: "Loading colleges…" });

    try {
      // 1. Pull all colleges (id + name + website)
      const { data: colleges, error: cErr } = await supabase
        .from("colleges")
        .select("id, name, slug, website")
        .order("name");

      if (cErr) throw cErr;
      const allColleges = (colleges as CollegeRow[]) || [];
      if (allColleges.length === 0) {
        toast({ title: "No colleges found", variant: "destructive" });
        setRunning(false);
        return;
      }

      setProgress({ done: 0, total: allColleges.length, current: "Starting…" });
      const collegeMap = new Map(allColleges.map((c) => [c.id, c]));

      // 2. Pull all sections in batches (only ones with content)
      const PAGE = 1000;
      let from = 0;
      const sections: SectionRow[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("college_sections")
          .select("id, college_id, section_type, content")
          .not("content", "is", null)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data as SectionRow[]) || [];
        sections.push(...batch);
        if (batch.length < PAGE) break;
        from += PAGE;
      }

      setProgress({ done: 0, total: sections.length, current: "Scanning sections…" });

      // 3. Process — rewrite + update
      let sectionsUpdated = 0;
      let linksRewritten = 0;
      let errors = 0;
      const newLogs: UpdateLog[] = [];

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const college = collegeMap.get(sec.college_id);
        setProgress({
          done: i + 1,
          total: sections.length,
          current: college ? `${college.name} → ${sec.section_type}` : sec.section_type,
        });

        if (!college) continue;
        if (!sec.content || !sec.content.includes("<a ")) continue;

        const { html, count } = rewriteHtml(sec.content, college);
        if (count === 0) continue;

        const { error } = await supabase
          .from("college_sections")
          .update({ content: html, updated_at: new Date().toISOString() })
          .eq("id", sec.id);

        if (error) {
          errors++;
          newLogs.push({
            collegeName: college.name,
            sectionType: sec.section_type,
            rewrites: count,
            status: "error",
            message: error.message,
          });
        } else {
          sectionsUpdated++;
          linksRewritten += count;
          newLogs.push({
            collegeName: college.name,
            sectionType: sec.section_type,
            rewrites: count,
            status: "ok",
          });
        }
      }

      setLogs(newLogs);
      setSummary({
        collegesScanned: allColleges.length,
        sectionsUpdated,
        linksRewritten,
        errors,
      });

      toast({
        title: "Hyperlink update complete",
        description: `${linksRewritten} external links rewritten across ${sectionsUpdated} sections.`,
      });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Link2 className="w-6 h-6 text-primary" /> Hyperlink Update
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Scans every college section and replaces external/Google-search hyperlinks with
          official-website deep-links. Internal links (our own pages — CAT, college, exam, etc.)
          and already-official national portals (NIRF, AICTE, NAAC, etc.) are never touched.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-md bg-muted/40 border border-border/60">
            <div className="font-semibold text-foreground mb-1">✅ Will keep untouched</div>
            <ul className="text-muted-foreground list-disc list-inside space-y-0.5">
              <li>Links to <code>/college/...</code>, <code>/exam/...</code>, etc.</li>
              <li>Links to bschoolbuzz.com, bestmbacoaching.com, mbacompass.in</li>
              <li>NIRF, AICTE, NAAC, CAT, XAT, GMAT official portals</li>
            </ul>
          </div>
          <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/30">
            <div className="font-semibold text-foreground mb-1">🔁 Will replace</div>
            <ul className="text-muted-foreground list-disc list-inside space-y-0.5">
              <li>Google search links (<code>google.com/search?q=…</code>)</li>
              <li>Partner / aggregator / third-party listing sites</li>
              <li>Any other external link → routed to the college's own domain</li>
            </ul>
          </div>
        </div>

        <button
          onClick={runUpdate}
          disabled={running}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Updating…" : "Run Hyperlink Update"}
        </button>

        {running && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.current}</span>
              <span>
                {progress.done} / {progress.total}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Colleges Scanned" value={summary.collegesScanned} />
          <Stat label="Sections Updated" value={summary.sectionsUpdated} />
          <Stat label="Links Rewritten" value={summary.linksRewritten} accent="success" />
          <Stat label="Errors" value={summary.errors} accent={summary.errors ? "danger" : "muted"} />
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Update Log ({logs.length})</h2>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">College</th>
                  <th className="text-left px-4 py-2">Section</th>
                  <th className="text-right px-4 py-2">Links</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-4 py-2 text-foreground">{l.collegeName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{l.sectionType}</td>
                    <td className="px-4 py-2 text-right font-mono">{l.rewrites}</td>
                    <td className="px-4 py-2">
                      {l.status === "ok" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Updated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive text-xs" title={l.message}>
                          <AlertCircle className="w-3.5 h-3.5" /> Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ExternalLink className="w-3 h-3" />
        Tip: For best results, ensure each college's <strong className="text-foreground">website</strong> field
        is filled in <code>Admin → Colleges</code>. When a website is set, links deep-link via
        <code> site:domain.com</code> queries to land on the official page.
      </div>
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: number; accent?: "success" | "danger" | "muted" }) => {
  const colors =
    accent === "success"
      ? "text-emerald-600"
      : accent === "danger"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${colors}`}>{value}</div>
    </div>
  );
};

export default AdminHyperlinkUpdate;
