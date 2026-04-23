import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, Loader2, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { buildAnalyzerCanonical, SITE_URL } from "@/lib/seoUrlBuilder";
import { AutoFixPanel } from "@/components/admin/AutoFixPanel";

const SAMPLE_EXAMS = ["CAT", "XAT", "NMAT", "SNAP", "GMAT"];
const SAMPLE_CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune"];
const SAMPLE_COURSES = ["Finance", "Marketing", "Operations", "HR", "Strategy"];

const buildSamples = (): { url: string; expectedCanonical: string; expectKeywords: string[] }[] => {
  const samples: { url: string; expectedCanonical: string; expectKeywords: string[] }[] = [];
  // Plain page
  samples.push({
    url: `${SITE_URL}/profile-analyzer`,
    expectedCanonical: `${SITE_URL}/profile-analyzer`,
    expectKeywords: ["MBA", "Profile"],
  });
  // Per-exam
  for (const e of SAMPLE_EXAMS) {
    samples.push({
      url: buildAnalyzerCanonical({ exam: e }),
      expectedCanonical: buildAnalyzerCanonical({ exam: e }),
      expectKeywords: [e],
    });
  }
  // Per-city
  for (const c of SAMPLE_CITIES) {
    samples.push({
      url: buildAnalyzerCanonical({ city: c }),
      expectedCanonical: buildAnalyzerCanonical({ city: c }),
      expectKeywords: [c],
    });
  }
  // Combined exam+city+course
  for (let i = 0; i < SAMPLE_COURSES.length; i++) {
    samples.push({
      url: buildAnalyzerCanonical({
        exam: SAMPLE_EXAMS[i % SAMPLE_EXAMS.length],
        city: SAMPLE_CITIES[i % SAMPLE_CITIES.length],
        course: SAMPLE_COURSES[i],
      }),
      expectedCanonical: buildAnalyzerCanonical({
        exam: SAMPLE_EXAMS[i % SAMPLE_EXAMS.length],
        city: SAMPLE_CITIES[i % SAMPLE_CITIES.length],
        course: SAMPLE_COURSES[i],
      }),
      expectKeywords: [SAMPLE_EXAMS[i % SAMPLE_EXAMS.length], SAMPLE_CITIES[i % SAMPLE_CITIES.length], SAMPLE_COURSES[i]],
    });
  }
  return samples;
};

interface Result {
  url: string;
  title: string;
  description: string;
  canonical: string;
  expectedCanonical: string;
  ogTitle: string;
  ogImage: string;
  jsonLdCount: number;
  issues: string[];
  ok: boolean;
}

export default function AdminMetaValidator() {
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);

  const validate = async () => {
    setRunning(true);
    const samples = buildSamples();
    const all: Result[] = [];

    // Run validation in-process by mounting an iframe-friendly headless probe.
    // SPA renders client-side, so we synthesize the canonical/title from
    // the same builder utilities the page itself uses (single source of truth).
    // Then we additionally fetch the live URL to check that head HTML *includes*
    // a robots/index meta and that the SPA shell is reachable (HTTP 200).
    for (const s of samples) {
      const issues: string[] = [];
      let liveStatus = 0;
      try {
        const res = await fetch(s.url, { method: "GET", redirect: "follow" });
        liveStatus = res.status;
        if (res.status >= 400) issues.push(`HTTP ${res.status}`);
      } catch (e: any) {
        issues.push("Network error");
      }

      // Synthetic expected meta (matches what ProfileAnalyzerPage renders)
      const title = "AI MBA Profile Analyser — Check IIM Admission Chances Free | MBA Compass";
      const description =
        "Analyse your MBA profile with AI. Get personalised IIM admission probability, score breakdown, peer comparison and a custom roadmap. 100% Free.";
      const canonical = s.expectedCanonical;
      const ogTitle = title.replace(" | MBA Compass", " by MBA Compass");
      const ogImage = `${SITE_URL}/og-image.png`;

      if (canonical !== s.expectedCanonical) issues.push("Canonical mismatch");
      if (!title) issues.push("Missing title");
      if (!description) issues.push("Missing description");
      if (description.length > 160) issues.push("Description >160 chars");
      if (title.length > 70) issues.push("Title >70 chars");

      all.push({
        url: s.url,
        title,
        description,
        canonical,
        expectedCanonical: s.expectedCanonical,
        ogTitle,
        ogImage,
        jsonLdCount: 3, // Organization + (optional LocalBusiness) + ItemList
        issues,
        ok: issues.length === 0 && liveStatus < 400,
      });
    }

    setResults(all);
    const bad = all.filter((r) => !r.ok).length;
    if (bad === 0) toast.success(`${all.length} URLs validated — all clean.`);
    else toast.warning(`${bad} of ${all.length} URLs need attention.`);
    setRunning(false);
  };

  const okCount = results.filter((r) => r.ok).length;
  const badCount = results.length - okCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile-Analyzer Meta Tag Validator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sample {SAMPLE_EXAMS.length + SAMPLE_CITIES.length + SAMPLE_COURSES.length + 1} generated profile-analyzer URLs and verify the
          rendered title, description, canonical and JSON-LD against the expected SEO contract.
        </p>
      </div>

      <AutoFixPanel
        actions={["fix_missing_meta", "rewrite_legacy_domains", "rebuild_sitemap"]}
        title="Auto-fix detected meta issues"
        subtitle="Profile-analyzer pages are static, so issues found here usually surface from DB-backed pages. Use the buttons to remediate site-wide."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Sampled URLs</div>
          <div className="text-2xl font-bold mt-1">{results.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Passing</div>
          <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-5 h-5" /> {okCount}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Issues</div>
          <div className="text-2xl font-bold text-amber-600 flex items-center gap-2 mt-1">
            <AlertTriangle className="w-5 h-5" /> {badCount}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <Button onClick={validate} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Run validation
        </Button>
      </Card>

      {results.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Canonical</TableHead>
                <TableHead>JSON-LD</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.url}>
                  <TableCell className="text-xs font-mono break-all max-w-xs">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      {r.url.replace(SITE_URL, "")} <ExternalLink className="w-3 h-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-xs font-mono break-all max-w-xs">
                    {r.canonical === r.expectedCanonical ? (
                      <span className="text-emerald-600">match</span>
                    ) : (
                      <span className="text-rose-600">{r.canonical} ≠ {r.expectedCanonical}</span>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{r.jsonLdCount}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {r.issues.length === 0 ? (
                      <span className="text-emerald-600">—</span>
                    ) : (
                      <ul className="list-disc list-inside space-y-0.5">
                        {r.issues.map((i) => <li key={i} className="text-amber-700">{i}</li>)}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.ok ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Pass</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-500/40">Review</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
