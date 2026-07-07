import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ExternalLink, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Type, FileText, Link2, Image as ImageIcon, Hash, Globe, Share2, Search,
} from "lucide-react";

// Registry of tracked static pages. Add more entries here to expand the dropdown.
const PAGES: Record<string, { title: string; path: string; targetKeyword: string }> = {
  "cat-mock-1": {
    title: "CAT Mock Test — Landing Page",
    path: "/cat-mock-1",
    targetKeyword: "CAT mock test",
  },
};

type Check = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  value?: string;
  hint?: string;
  ideal?: string;
};

type Analysis = {
  url: string;
  fetchedAt: string;
  html: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  keywords: string;
  lang: string;
  viewport: string;
  og: Record<string, string>;
  twitter: Record<string, string>;
  jsonLd: any[];
  h1: string[];
  h2: string[];
  h3: string[];
  images: { src: string; alt: string }[];
  internalLinks: number;
  externalLinks: number;
  wordCount: number;
  targetOccurrences: number;
  density: number;
  checks: Check[];
};

function textOnly(doc: Document) {
  const clone = doc.body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

function metaContent(doc: Document, selector: string) {
  const el = doc.querySelector(selector) as HTMLMetaElement | null;
  return el?.content?.trim() || "";
}

function analyze(html: string, url: string, targetKeyword: string): Analysis {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const title = (doc.querySelector("title")?.textContent || "").trim();
  const description = metaContent(doc, 'meta[name="description"]');
  const keywords = metaContent(doc, 'meta[name="keywords"]');
  const robots = metaContent(doc, 'meta[name="robots"]');
  const viewport = metaContent(doc, 'meta[name="viewport"]');
  const canonical = (doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href || "";
  const lang = doc.documentElement.getAttribute("lang") || "";

  const og: Record<string, string> = {};
  doc.querySelectorAll('meta[property^="og:"]').forEach((m) => {
    const p = m.getAttribute("property") || "";
    og[p] = (m as HTMLMetaElement).content;
  });
  const twitter: Record<string, string> = {};
  doc.querySelectorAll('meta[name^="twitter:"]').forEach((m) => {
    const n = m.getAttribute("name") || "";
    twitter[n] = (m as HTMLMetaElement).content;
  });

  const jsonLd: any[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try { jsonLd.push(JSON.parse(s.textContent || "")); } catch {}
  });

  const h1 = Array.from(doc.querySelectorAll("h1")).map((n) => n.textContent?.trim() || "");
  const h2 = Array.from(doc.querySelectorAll("h2")).map((n) => n.textContent?.trim() || "");
  const h3 = Array.from(doc.querySelectorAll("h3")).map((n) => n.textContent?.trim() || "");

  const images = Array.from(doc.querySelectorAll("img")).map((i) => ({
    src: i.getAttribute("src") || "",
    alt: i.getAttribute("alt") || "",
  }));

  const anchors = Array.from(doc.querySelectorAll("a[href]"));
  let internalLinks = 0, externalLinks = 0;
  anchors.forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("http") && !href.includes(location.host)) externalLinks++;
    else if (href.startsWith("/") || href.startsWith("#") || href.includes(location.host)) internalLinks++;
  });

  const body = textOnly(doc);
  const words = body.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const kw = targetKeyword.toLowerCase();
  const kwWords = kw.split(/\s+/).length;
  const lower = body.toLowerCase();
  let occ = 0, idx = 0;
  while ((idx = lower.indexOf(kw, idx)) !== -1) { occ++; idx += kw.length; }
  const density = wordCount ? (occ * kwWords) / wordCount * 100 : 0;

  const checks: Check[] = [];
  const push = (c: Check) => checks.push(c);

  push({
    key: "title", label: "Title tag",
    status: !title ? "fail" : title.length < 30 ? "warn" : title.length > 60 ? "warn" : "pass",
    value: title, ideal: "30–60 characters",
    hint: !title ? "Missing <title>" : title.length > 60 ? "Too long — Google truncates around 60 chars" : title.length < 30 ? "Consider expanding to ~50 chars" : "Length looks good",
  });
  push({
    key: "titleKeyword", label: "Keyword in title",
    status: title.toLowerCase().includes(kw) ? "pass" : "fail",
    value: kw, hint: "Include the target keyword in the <title>",
  });
  push({
    key: "description", label: "Meta description",
    status: !description ? "fail" : description.length < 120 ? "warn" : description.length > 160 ? "warn" : "pass",
    value: description, ideal: "120–160 characters",
    hint: !description ? "Missing meta description" : description.length > 160 ? "Truncated in SERP" : description.length < 120 ? "Could be more descriptive" : "Length looks good",
  });
  push({
    key: "descKeyword", label: "Keyword in description",
    status: description.toLowerCase().includes(kw) ? "pass" : "warn",
    value: kw,
  });
  push({
    key: "h1", label: "H1 tag",
    status: h1.length === 0 ? "fail" : h1.length > 1 ? "warn" : "pass",
    value: h1.join(" | ") || "—", ideal: "Exactly one H1",
  });
  push({
    key: "h1Keyword", label: "Keyword in H1",
    status: h1.some((h) => h.toLowerCase().includes(kw)) ? "pass" : "warn",
    value: kw,
  });
  push({
    key: "h2", label: "H2 subheadings",
    status: h2.length >= 3 ? "pass" : h2.length >= 1 ? "warn" : "fail",
    value: `${h2.length} H2 tags`, ideal: "≥ 3 H2s for topical coverage",
  });
  push({
    key: "canonical", label: "Canonical URL",
    status: canonical ? "pass" : "warn",
    value: canonical || "—",
  });
  push({
    key: "robots", label: "Robots meta",
    status: !robots ? "pass" : /noindex/i.test(robots) ? "fail" : "pass",
    value: robots || "index, follow (default)",
    hint: /noindex/i.test(robots) ? "Page is set to noindex — search engines will skip it" : undefined,
  });
  push({
    key: "og", label: "Open Graph tags",
    status: og["og:title"] && og["og:description"] ? "pass" : "warn",
    value: `${Object.keys(og).length} og:* tags`,
  });
  push({
    key: "ogImage", label: "og:image",
    status: og["og:image"] ? "pass" : "warn",
    value: og["og:image"] || "— (host may inject a default)",
  });
  push({
    key: "twitter", label: "Twitter card",
    status: twitter["twitter:card"] ? "pass" : "warn",
    value: twitter["twitter:card"] || "—",
  });
  push({
    key: "jsonld", label: "JSON-LD structured data",
    status: jsonLd.length ? "pass" : "warn",
    value: jsonLd.length ? jsonLd.map((j) => j["@type"] || "Object").join(", ") : "None found",
  });
  const missingAlt = images.filter((i) => !i.alt).length;
  push({
    key: "alt", label: "Image alt attributes",
    status: images.length === 0 ? "pass" : missingAlt === 0 ? "pass" : missingAlt / images.length > 0.3 ? "fail" : "warn",
    value: `${images.length - missingAlt}/${images.length} images have alt text`,
  });
  push({
    key: "words", label: "Word count",
    status: wordCount >= 600 ? "pass" : wordCount >= 300 ? "warn" : "fail",
    value: `${wordCount} words`, ideal: "≥ 600 for landing pages",
  });
  push({
    key: "density", label: "Keyword density",
    status: density >= 1 && density <= 3 ? "pass" : density > 3 ? "warn" : "fail",
    value: `${density.toFixed(2)}%  (${occ} occurrences)`, ideal: "1% – 3%",
    hint: density > 3 ? "Risk of keyword stuffing" : density < 1 ? "Increase natural mentions of the keyword" : "Healthy density",
  });
  push({
    key: "links", label: "Internal / external links",
    status: internalLinks >= 3 ? "pass" : "warn",
    value: `${internalLinks} internal · ${externalLinks} external`,
  });
  push({
    key: "viewport", label: "Mobile viewport",
    status: viewport ? "pass" : "fail",
    value: viewport || "—",
  });
  push({
    key: "lang", label: "HTML lang",
    status: lang ? "pass" : "warn",
    value: lang || "—",
  });

  return {
    url, fetchedAt: new Date().toLocaleString(), html,
    title, description, canonical, robots, keywords, lang, viewport,
    og, twitter, jsonLd, h1, h2, h3, images,
    internalLinks, externalLinks, wordCount,
    targetOccurrences: occ, density, checks,
  };
}

function StatusIcon({ status }: { status: Check["status"] }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <XCircle className="h-4 w-4 text-red-600" />;
}

export default function AdminPageSEOReview() {
  const { slug = "cat-mock-1" } = useParams();
  const page = PAGES[slug];
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const url = useMemo(() => (page ? `${window.location.origin}${page.path}` : ""), [page]);

  const run = async () => {
    if (!page) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(page.path, { credentials: "same-origin" });
      const html = await res.text();
      setAnalysis(analyze(html, url, page.targetKeyword));
    } catch (e: any) {
      setError(e.message || "Failed to fetch page HTML");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [slug]);

  if (!page) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground mt-2">No tracked page for slug "{slug}".</p>
      </div>
    );
  }

  const score = analysis
    ? Math.round((analysis.checks.filter((c) => c.status === "pass").length / analysis.checks.length) * 100)
    : 0;
  const passing = analysis?.checks.filter((c) => c.status === "pass").length || 0;
  const warnings = analysis?.checks.filter((c) => c.status === "warn").length || 0;
  const failing = analysis?.checks.filter((c) => c.status === "fail").length || 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Deep SEO Review</div>
          <h1 className="text-2xl md:text-3xl font-semibold">{page.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <a href={page.path} target="_blank" rel="noreferrer" className="hover:underline">
              {page.path}
            </a>
            <Badge variant="secondary">Target: {page.targetKeyword}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={page.path} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> Open page
            </a>
          </Button>
          <Button size="sm" onClick={run} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Re-run audit
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50 text-red-700">{error}</Card>
      )}

      {loading && !analysis && (
        <Card className="p-6 text-sm text-muted-foreground">Fetching page and running SEO audit…</Card>
      )}

      {analysis && (
        <>
          {/* Score */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 md:col-span-2">
              <div className="text-sm text-muted-foreground">Overall SEO score</div>
              <div className="flex items-end gap-3 mt-1">
                <div className="text-4xl font-bold">{score}</div>
                <div className="text-sm text-muted-foreground pb-1">/ 100</div>
              </div>
              <Progress value={score} className="mt-3" />
              <div className="text-xs text-muted-foreground mt-2">Last audited {analysis.fetchedAt}</div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-muted-foreground">Checks</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {passing} passing</div>
                <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> {warnings} warnings</div>
                <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600" /> {failing} failing</div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-muted-foreground">Content</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> {analysis.wordCount} words</div>
                <div className="flex items-center gap-2"><Hash className="h-4 w-4" /> {analysis.density.toFixed(2)}% density</div>
                <div className="flex items-center gap-2"><Link2 className="h-4 w-4" /> {analysis.internalLinks + analysis.externalLinks} links</div>
              </div>
            </Card>
          </div>

          {/* All checks */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4" />
              <h2 className="text-lg font-semibold">Detailed checks</h2>
            </div>
            <div className="divide-y">
              {analysis.checks.map((c) => (
                <div key={c.key} className="py-3 flex items-start gap-3">
                  <div className="pt-0.5"><StatusIcon status={c.status} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{c.label}</div>
                      {c.ideal && <Badge variant="outline" className="text-xs">ideal: {c.ideal}</Badge>}
                    </div>
                    {c.value && <div className="text-sm text-muted-foreground mt-0.5 break-words">{c.value}</div>}
                    {c.hint && <div className="text-xs text-muted-foreground mt-0.5">{c.hint}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Meta preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3"><Type className="h-4 w-4" /><h3 className="font-semibold">Google SERP preview</h3></div>
              <div className="rounded-lg border p-3 bg-white">
                <div className="text-[13px] text-emerald-700 truncate">{analysis.canonical || url}</div>
                <div className="text-[18px] text-blue-800 truncate">{analysis.title || "(no title)"}</div>
                <div className="text-[13px] text-gray-600 line-clamp-2">{analysis.description || "(no description)"}</div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3"><Share2 className="h-4 w-4" /><h3 className="font-semibold">Social share preview</h3></div>
              <div className="rounded-lg border overflow-hidden bg-white">
                {analysis.og["og:image"] && (
                  <img src={analysis.og["og:image"]} alt="" className="w-full aspect-[1.91/1] object-cover" />
                )}
                <div className="p-3">
                  <div className="text-[11px] uppercase text-muted-foreground truncate">{analysis.og["og:url"] || url}</div>
                  <div className="text-sm font-semibold truncate">{analysis.og["og:title"] || analysis.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{analysis.og["og:description"] || analysis.description}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Headings */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Heading structure</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">H1 ({analysis.h1.length})</div>
                <ul className="space-y-1">{analysis.h1.map((h, i) => <li key={i} className="truncate">• {h}</li>)}</ul>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">H2 ({analysis.h2.length})</div>
                <ul className="space-y-1 max-h-48 overflow-auto">{analysis.h2.map((h, i) => <li key={i} className="truncate">• {h}</li>)}</ul>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">H3 ({analysis.h3.length})</div>
                <ul className="space-y-1 max-h-48 overflow-auto">{analysis.h3.map((h, i) => <li key={i} className="truncate">• {h}</li>)}</ul>
              </div>
            </div>
          </Card>

          {/* Raw meta */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Raw meta tags</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Title:</span> {analysis.title || "—"}</div>
              <div><span className="text-muted-foreground">Description:</span> {analysis.description || "—"}</div>
              <div className="break-all"><span className="text-muted-foreground">Canonical:</span> {analysis.canonical || "—"}</div>
              <div><span className="text-muted-foreground">Robots:</span> {analysis.robots || "index, follow"}</div>
              <div><span className="text-muted-foreground">Keywords:</span> {analysis.keywords || "—"}</div>
              <div><span className="text-muted-foreground">Lang:</span> {analysis.lang || "—"}</div>
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">Open Graph</div>
              <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-1">
                {Object.entries(analysis.og).map(([k, v]) => <div key={k} className="truncate"><span className="text-muted-foreground">{k}:</span> {v}</div>)}
                {Object.keys(analysis.og).length === 0 && <div className="text-muted-foreground">No og:* tags found</div>}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">Twitter</div>
              <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-1">
                {Object.entries(analysis.twitter).map(([k, v]) => <div key={k} className="truncate"><span className="text-muted-foreground">{k}:</span> {v}</div>)}
                {Object.keys(analysis.twitter).length === 0 && <div className="text-muted-foreground">No twitter:* tags found</div>}
              </div>
            </div>
          </Card>

          {/* Images */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3"><ImageIcon className="h-4 w-4" /><h3 className="font-semibold">Images ({analysis.images.length})</h3></div>
            <div className="max-h-72 overflow-auto text-sm divide-y">
              {analysis.images.map((im, i) => (
                <div key={i} className="py-2 flex items-start gap-2">
                  {im.alt ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                  <div className="min-w-0">
                    <div className="truncate">{im.src}</div>
                    <div className="text-xs text-muted-foreground truncate">alt: {im.alt || "(missing)"}</div>
                  </div>
                </div>
              ))}
              {analysis.images.length === 0 && <div className="text-muted-foreground py-2">No images on page.</div>}
            </div>
          </Card>

          <div className="text-xs text-muted-foreground">
            Fetching client-side HTML. For crawler-accurate results (JS-rendered content), verify from the live URL.{" "}
            <Link to="/admin/seo-dashboard" className="underline">Open AI SEO Dashboard</Link>
          </div>
        </>
      )}
    </div>
  );
}
