import { SlugUniqueHint } from "@/components/admin/SlugUniqueHint";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles, X, Plus, AlertCircle, FileText, Link2, Search, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIGenerationProgress, { type ProgressStep } from "@/components/admin/AIGenerationProgress";
import SeoLengthHint from "@/components/admin/SeoLengthHint";
import BlogEditorWorkspace from "@/components/admin/BlogEditorWorkspace";

const CATEGORIES = ["news", "exam-tips", "career", "success-stories", "reviews", "college-news", "coaching", "gd-pi", "placements", "scholarships"];

const BLOG_STEPS: { key: string; label: string }[] = [
  { key: "brief", label: "Validating brief" },
  { key: "research", label: "Researching topic" },
  { key: "draft", label: "Writing article" },
  { key: "save", label: "Saving as draft" },
  { key: "faqs", label: "Injecting FAQ schema" },
  { key: "validate", label: "Pre-publish checks" },
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const STORAGE_KEY = "ai_blog_brief_draft";
const WORKSPACE_KEY = "ai_blog_workspace";
const WORD_PRESETS = [500, 1000, 1500, 2000];

const parseSamples = (raw: string): string[] => {
  const out: string[] = [];
  for (const block of raw.split(/^\s*---\s*$/m)) {
    const t = block.trim();
    if (!t) continue;
    const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => /^https?:\/\/\S+$/i.test(l))) out.push(...lines);
    else out.push(t);
  }
  return out.slice(0, 5);
};

const TOOL_URLS: { url: string; label: string }[] = [
  { url: "/mba-compass", label: "MBA Compass" },
  { url: "/college-shortlister", label: "College Shortlister" },
  { url: "/profile-analyzer", label: "Profile Analyzer" },
  { url: "/mba-roi-calculator", label: "MBA ROI Calculator" },
  { url: "/compare", label: "Compare Colleges" },
  { url: "/mocks", label: "Mock Tests" },
  { url: "/ai-coaching-finder", label: "AI Coaching Finder" },
  { url: "/courses", label: "Courses" },
];

type LinkOption = { url: string; label: string; aliases?: string[]; auto?: boolean };

const LINK_STOP = new Set(["the","and","for","of","in","to","a","an","on","with","by","at","from","is","are","how","what","why","best","top","guide","india","indian","institute","management","school","business","college","university","mba","pgdm","exam","2024","2025","2026","2027","2028","complete","list","all","new","vs"]);
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length >= 3 && !LINK_STOP.has(w));
const LINK_CAPS = { colleges: 25, exams: 10, articles: 12, coachings: 6, tools: 3 } as const;
const normLabel = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
/** Alternate names: "CAT (Common Admission Test)" -> "cat", "common admission test". */
const labelNames = (label: string) => {
  const names = [normLabel(label)];
  const m = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) names.push(normLabel(m[1]), normLabel(m[2]));
  return names.filter(n => n.length >= 3);
};

/** Rank pages by how strongly the brief/outline mentions them: exact name > short name/acronym > distinctive brand word > word overlap. */
function rankLinks(text: string, pools: Record<keyof typeof LINK_CAPS, LinkOption[]>) {
  if (text.trim().length < 4) return [] as (LinkOption & { score: number })[];
  const padded = ` ${text.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ")} `;
  const textTokens = new Set(tokens(text));
  const out: (LinkOption & { score: number })[] = [];
  (Object.keys(LINK_CAPS) as (keyof typeof LINK_CAPS)[]).forEach(kind => {
    const pool = pools[kind] || [];
    // How many pages in this pool share each word: rare words ("gitam", "symbiosis") identify a brand.
    const df = new Map<string, number>();
    pool.forEach(o => new Set(tokens(o.label)).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
    const scored: (LinkOption & { score: number })[] = [];
    for (const o of pool) {
      const names = labelNames(o.label);
      let score = 0;
      if (names[0] && names[0].length >= 4 && padded.includes(` ${names[0]} `)) score = 100;
      else if (names.slice(1).some(n => padded.includes(` ${n} `))) score = 85;
      else {
        const lt = tokens(o.label);
        if (lt.length) {
          const hits = lt.filter(t => textTokens.has(t));
          const ratio = hits.length / lt.length;
          const brand = hits.find(t => t.length >= 4 && (df.get(t) || 0) <= 40);
          if (hits.length >= 2 && ratio >= 0.5) score = Math.round(40 + ratio * 40);
          else if (brand && lt[0] === brand) score = 65; // label starts with the brand word, e.g. "GITAM Hyderabad Business School"
          else if (brand) score = 50;
          else if (kind !== "colleges" && hits.length >= 1 && ratio >= 0.5) score = Math.round(25 + ratio * 30);
        }
      }
      if (score > 0) scored.push({ ...o, score });
    }
    scored.sort((a, b) => b.score - a.score);
    out.push(...scored.slice(0, LINK_CAPS[kind]));
  });
  return out;
}
type FactCheckReportItem = {
  field?: string;
  severity?: "warn" | "error";
  rule?: string;
  matchedText?: string;
  message?: string;
  autoFixed?: boolean;
};

const AdminWriteBlog = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const seed = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      title: params.get("title") || "",
      slug: params.get("slug") || "",
      targetKeyword: params.get("keyword") || "",
      metaTitle: params.get("metaTitle") || "",
      metaDescription: params.get("metaDesc") || "",
      category: params.get("category") || "news",
      secondaryKeywords: [] as string[],
    };
  }, [params]);

  const [title, setTitle] = useState<string>(seed.title || "");
  const [slug, setSlug] = useState<string>(seed.slug || (seed.title ? slugify(seed.title) : ""));
  const [targetKeyword, setTargetKeyword] = useState<string>(seed.targetKeyword || "");
  const [metaTitle, setMetaTitle] = useState<string>(seed.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState<string>(seed.metaDescription || "");
  const [category, setCategory] = useState<string>(seed.category || "news");
  const [secondaryKws, setSecondaryKws] = useState<string[]>(seed.secondaryKeywords || []);
  const [secInput, setSecInput] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<string[]>(seed.referenceUrls || []);
  const [refInput, setRefInput] = useState("");
  const [targetYear, setTargetYear] = useState<number>(seed.targetYear || new Date().getFullYear() + 1);
  const [yearTouched, setYearTouched] = useState<boolean>(!!seed.targetYear);
  useEffect(() => {
    if (yearTouched) return;
    const m = title.match(/\b(20[2-9]\d)\b/);
    if (m) setTargetYear(Number(m[1]));
  }, [title, yearTouched]);
  const contentDateContext = `Target year selected by the editor: ${targetYear} (${targetYear}-${String(targetYear + 1).slice(-2)} cycle). Write every target-cycle year as ${targetYear}, never today's calendar year. Use the latest verified data; where ${targetYear} figures are not yet published, call them expected and label older figures with their real year.`;
  const [wordTarget, setWordTarget] = useState<number>(seed.wordTarget || 1500);
  const wordMin = Math.round(wordTarget * 0.9);
  const wordMax = Math.round(wordTarget * 1.1);
  const [densityPct, setDensityPct] = useState(1);
  const [audience, setAudience] = useState<string>(seed.audience || "");
  const [searchIntent, setSearchIntent] = useState<string>(seed.searchIntent || "");
  const [instructions, setInstructions] = useState<string>(seed.instructions || "");
  const [samplesText, setSamplesText] = useState<string>(seed.samplesText || "");
  const [modelUrl, setModelUrl] = useState<string>(seed.modelUrl || "");
  const [modelDoc, setModelDoc] = useState<{ name: string; text: string } | null>(null);
  const [modelReading, setModelReading] = useState(false);

  const handleModelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast({ title: "File too large", description: "Please upload a file under 20 MB.", variant: "destructive" }); return; }
    setModelReading(true);
    try {
      const buf = await file.arrayBuffer();
      let text = "";
      const name = file.name.toLowerCase();
      if (name.endsWith(".pdf")) {
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 60); i++) {
          const content = await (await pdf.getPage(i)).getTextContent();
          pages.push(content.items.map((it: any) => it.str + (it.hasEOL ? "\n" : " ")).join(""));
        }
        text = pages.join("\n\n");
      } else if (name.endsWith(".docx")) {
        const mammoth: any = await import("mammoth/mammoth.browser");
        text = (await mammoth.extractRawText({ arrayBuffer: buf })).value || "";
      } else {
        text = new TextDecoder().decode(buf);
      }
      text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (text.length < 200) throw new Error("Could not find readable text in this file. Scanned image PDFs are not supported.");
      setModelDoc({ name: file.name, text });
      setModelUrl("");
      toast({ title: "File read", description: `${text.split(/\s+/).length.toLocaleString()} words extracted.` });
    } catch (err: any) {
      toast({ title: "Could not read file", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setModelReading(false);
    }
  };
  const [jobId, setJobId] = useState<string | null>(null);
  type OutlineSection = { heading: string; angle: string; chapter: string; tablePlan: string; calloutPlan: string; linkPlan: string };
  type OutlineEdit = { jobId: string; title: string; metaTitle: string; metaDescription: string; sections: OutlineSection[]; faqs: string[] };
  const [outline, setOutline] = useState<OutlineEdit | null>(null);
  const [outlineSaving, setOutlineSaving] = useState(false);
  const outlineWait = useRef<(() => void) | null>(null);
  const editSection = (i: number, patch: Partial<OutlineSection>) =>
    setOutline((o) => o && { ...o, sections: o.sections.map((x, n) => (n === i ? { ...x, ...patch } : x)) });
  const moveSection = (i: number, d: number) =>
    setOutline((o) => {
      if (!o) return o;
      const j = i + d;
      if (j < 0 || j >= o.sections.length) return o;
      const next = [...o.sections];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...o, sections: next };
    });
  const approveOutline = async () => {
    if (!outline) return;
    const sections = outline.sections.filter((x) => x.heading.trim());
    if (!sections.length) { toast({ title: "Add at least one section", variant: "destructive" }); return; }
    setOutlineSaving(true);
    const { data, error } = await supabase.functions.invoke("ai-blog-writer", {
      body: { action: "approve_outline", jobId: outline.jobId, outline: { ...outline, sections, faqs: outline.faqs.filter((q) => q.trim()) } },
    });
    setOutlineSaving(false);
    if (error || data?.error) { toast({ title: "Could not approve outline", description: data?.error || error?.message, variant: "destructive" }); return; }
    setOutline(null);
    outlineWait.current?.();
    outlineWait.current = null;
  };

  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [progressCurrent, setProgressCurrent] = useState<string>("");

  // Restore the last generated article workspace after a refresh.
  useEffect(() => {
    let saved: { articleId?: string; jobId?: string | null } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(WORKSPACE_KEY) || "null"); } catch {}
    if (!saved?.articleId) return;
    setJobId(saved.jobId || null);
    if (!saved.jobId) { setStats({ insertedId: saved.articleId }); return; }
    supabase.functions.invoke("ai-blog-writer", { body: { action: "status", jobId: saved.jobId } }).then(({ data }) => {
      setStats({ ...(data?.job?.stats || {}), insertedId: saved!.articleId });
    });
  }, []);

  // Internal-link pool
  const [colleges, setColleges] = useState<LinkOption[]>([]);
  const [exams, setExams] = useState<LinkOption[]>([]);
  const [articles, setArticles] = useState<LinkOption[]>([]);
  const [coachings, setCoachings] = useState<LinkOption[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Record<string, LinkOption>>(
    () => Object.fromEntries(TOOL_URLS.slice(0, 4).map(t => [t.url, t]))
  );
  const [linkSearch, setLinkSearch] = useState("");
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingLinks(true);
      try {
        // Page through every table — the API caps single responses at 1000 rows.
        const [collRows, examRows, artRows, coachRows] = await Promise.all([
          fetchAllRows<any>((f, t) => supabase.from("colleges").select("name,slug,city").not("slug", "is", null).order("name").range(f, t)).catch(() => []),
          fetchAllRows<any>((f, t) => supabase.from("exams").select("name,slug").not("slug", "is", null).order("name").range(f, t)).catch(() => []),
          fetchAllRows<any>((f, t) => supabase.from("articles").select("title,slug").eq("published", true).order("created_at", { ascending: false }).range(f, t)).catch(() => []),
          fetchAllRows<any>((f, t) => supabase.from("institutes").select("name,slug,institute_type").not("slug", "is", null).order("name").range(f, t)).catch(() => []),
        ]);
        const uniq = (list: LinkOption[]) => Array.from(new Map(list.map(o => [o.url, o])).values());
        setColleges(uniq(collRows.filter((r: any) => r.slug && r.name?.trim()).map((r: any) => ({ url: `/college/${r.slug}`, label: r.name }))));
        setExams(uniq(examRows.filter((r: any) => r.slug && r.name?.trim()).map((r: any) => ({ url: `/exams/${r.slug}`, label: r.name }))));
        setArticles(uniq(artRows.filter((r: any) => r.slug && r.title?.trim()).map((r: any) => ({ url: `/article/${r.slug}`, label: r.title }))));
        setCoachings(uniq(
          coachRows
            .filter((r: any) => r.slug && r.name?.trim() && (r.institute_type === "coaching" || /coaching/i.test(r.slug)))
            .map((r: any) => ({ url: `/coaching/${r.slug}`, label: r.name }))
        ));
      } catch (e) {
        console.warn("Could not load link pool", e);
      } finally {
        setLoadingLinks(false);
      }
    };
    load();
  }, []);

  // ---- Auto-pick: score every page against the title, keywords, brief and outline ----
  const [autoPicked, setAutoPicked] = useState<Record<string, LinkOption & { score: number }>>({});
  const [autoLink, setAutoLink] = useState(true);
  const autoText = useMemo(() => [
    title, targetKeyword, secondaryKws.join(" "), instructions,
    outline ? JSON.stringify(outline.sections) + " " + outline.faqs.join(" ") : "",
  ].join(" ").toLowerCase(), [title, targetKeyword, secondaryKws, instructions, outline]);

  useEffect(() => {
    if (!autoLink) return;
    const h = setTimeout(() => {
      const picks = rankLinks(autoText, { colleges, exams, articles, coachings, tools: TOOL_URLS });
      const nextAuto = Object.fromEntries(picks.map(p => [p.url, p]));
      setSelectedUrls(prev => {
        const next = { ...prev };
        Object.keys(autoPicked).forEach(u => { if (!nextAuto[u] && (next[u] as any)?.auto) delete next[u]; });
        picks.forEach(p => { if (!next[p.url]) next[p.url] = { ...p, auto: true } as any; });
        return next;
      });
      setAutoPicked(nextAuto);
    }, 700);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoText, colleges, exams, articles, coachings, autoLink]);

  const setStep = (key: string, status: ProgressStep["status"], error?: string) =>
    setProgressSteps(prev => prev.map(s => s.key === key ? { ...s, status, error } : s));

  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(seed.slug));
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const addSecKw = () => {
    const v = secInput.trim();
    if (v && !secondaryKws.includes(v)) setSecondaryKws([...secondaryKws, v]);
    setSecInput("");
  };
  const removeSecKw = (k: string) => setSecondaryKws(secondaryKws.filter(x => x !== k));

  const addReferenceUrls = () => {
    const raw = refInput.split(/[\s,]+/).map(v => v.trim()).filter(Boolean);
    if (raw.length === 0) return;
    const accepted: string[] = [];
    const rejected: string[] = [];
    raw.forEach((item) => {
      const candidate = /^https?:\/\//i.test(item) ? item : `https://${item}`;
      try {
        const u = new URL(candidate);
        if (!u.hostname.includes(".")) throw new Error("bad host");
        const clean = u.toString();
        if (!referenceUrls.includes(clean) && !accepted.includes(clean)) accepted.push(clean);
      } catch {
        rejected.push(item);
      }
    });
    if (accepted.length) setReferenceUrls([...referenceUrls, ...accepted].slice(0, 8));
    setRefInput("");
    if (rejected.length) {
      toast({
        title: "Some links were not added",
        description: `These do not look like web addresses: ${rejected.join(", ")}`,
        variant: "destructive",
      });
    }
  };
  const removeReferenceUrl = (u: string) => setReferenceUrls(referenceUrls.filter(x => x !== u));

  // Keep the brief (including reference links) across refreshes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        title, slug, targetKeyword, metaTitle, metaDescription, category,
        secondaryKeywords: secondaryKws, referenceUrls,
        wordTarget, audience, searchIntent, instructions, samplesText,
      }));
    } catch { /* storage unavailable */ }
  }, [title, slug, targetKeyword, metaTitle, metaDescription, category, secondaryKws, referenceUrls, wordTarget, audience, searchIntent, instructions, samplesText]);

  const toggleUrl = (opt: LinkOption) => {
    setSelectedUrls(prev => {
      const next = { ...prev };
      if (next[opt.url]) delete next[opt.url];
      else next[opt.url] = opt;
      return next;
    });
  };

  const selectedCount = Object.keys(selectedUrls).length;

  const filterByQuery = (list: LinkOption[]) =>
    !linkSearch.trim() ? list : list.filter(o => o.label.toLowerCase().includes(linkSearch.toLowerCase()) || o.url.toLowerCase().includes(linkSearch.toLowerCase()));

  const selectAllVisible = (list: LinkOption[]) => {
    setSelectedUrls(prev => {
      const next = { ...prev };
      filterByQuery(list).forEach(o => { next[o.url] = o; });
      return next;
    });
  };

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!slug.trim()) return "Slug is required";
    if (!targetKeyword.trim()) return "Primary keyword is required";
    if (wordTarget < 300) return "Word count must be at least 300";
    if (densityPct < 0.5 || densityPct > 5) return "Keyword density should be between 0.5% and 5%";
    return null;
  };

  const handleGenerate = async () => {
    const err = validate();
    if (err) {
      toast({ title: "Please fix the brief", description: err, variant: "destructive" });
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    setStats(null);
    setProgressSteps(BLOG_STEPS.map(s => ({ ...s, status: "pending" })));
    setProgressCurrent(BLOG_STEPS[0].label);
    setStep("brief", "ok");

    try {
      setStep("research", "running");
      setStep("draft", "running");
      setStep("save", "running");
      setProgressCurrent("Researching, writing, and saving article");
      const { data, error } = await supabase.functions.invoke("ai-blog-writer", {
        body: {
          title: title.trim(),
          slug: slug.trim(),
          targetKeyword: targetKeyword.trim(),
          secondaryKeywords: secondaryKws,
          metaTitle: metaTitle.trim(),
          metaDescription: metaDescription.trim(),
          category,
          contentDateContext: contentDateContext.trim(),
          targetWords: wordTarget,
          wordCountMin: wordMin,
          wordCountMax: wordMax,
          keywordDensityPct: densityPct,
          allowedInternalUrls: Object.values(selectedUrls),
          referenceUrls,
          audience: audience.trim(),
          searchIntent,
          instructions: instructions.trim(),
          sampleBlogs: parseSamples(samplesText),
          modelBlog: modelDoc
            ? { name: modelDoc.name, text: modelDoc.text.slice(0, 30000) }
            : /^https?:\/\/\S+$/i.test(modelUrl.trim()) ? { url: modelUrl.trim() } : null,
        },
      });

      if (error) { setStep("research", "fail", error.message); throw error; }
      if (data?.error) { setStep("research", "fail", data.error); throw new Error(data.error); }

      let finalData = data;
      if (data?.jobId) setJobId(data.jobId);
      if (data?.jobId && !data?.insertedId) {
        setProgressCurrent("AI writing in background");
        for (let attempt = 0; attempt < 900; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const { data: jobRes, error: jobErr } = await supabase.functions.invoke("ai-blog-writer", {
            body: { action: "status", jobId: data.jobId },
          });
          if (jobErr) throw jobErr;
          const job = jobRes?.job;
          if (job?.current_step) setProgressCurrent(job.current_step);
          if (job?.status === "awaiting_outline") {
            const d = job.stats?.draft || {};
            setOutline({
              jobId: data.jobId,
              title: d.title || "",
              metaTitle: d.metaTitle || "",
              metaDescription: d.metaDescription || "",
               sections: (d.sections || []).map((x: any) => ({
                 heading: String(x.heading || ""),
                 angle: String(x.angle || ""),
                 chapter: String(x.chapter || "Article"),
                 tablePlan: String(x.tablePlan || ""),
                 calloutPlan: String(x.calloutPlan || ""),
                 linkPlan: String(x.linkPlan || ""),
               })),
              faqs: (d.faqQuestions || []).map((q: any) => String(q)),
            });
            setProgressCurrent("Paused — waiting for you to approve the outline below");
            setTimeout(() => document.getElementById("outline-review")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
            await new Promise<void>((resolve) => { outlineWait.current = resolve; });
            continue;
          }
          if (job?.status === "completed") {
            finalData = { insertedId: job.article_id, stats: job.stats || {} };
            break;
          }
          if (job?.status === "failed") throw new Error(job.error_message || "Blog generation failed");
        }
      }

      if (!finalData?.insertedId) { setStep("save", "fail", "Article was not saved"); throw new Error("Generation is taking longer than expected. It will continue in the background; refresh this page in a few minutes."); }
      setStep("research", "ok");
      setStep("draft", "ok");
      setStep("save", "ok");
      setStep("faqs", "ok");
      setStep("validate", "ok");
      setProgressCurrent("");

      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}

      toast({
        title: "Article generated!",
        description: `${finalData.stats?.actualWords ?? "~"} words. Saved successfully — open it in editor to review.`,
      });
      setStats({ ...(finalData.stats || {}), insertedId: finalData.insertedId });
      try { sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify({ articleId: finalData.insertedId, jobId: data?.jobId || null })); } catch {}
    } catch (e: any) {
      console.error("AI blog generation failed", e);
      setErrorMsg(e?.message || "Generation failed");
      toast({ title: "Generation failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const renderLinkList = (list: LinkOption[], emptyMsg: string) => {
    const filtered = filterByQuery(list);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{filtered.length} options · {Object.values(selectedUrls).filter(s => list.some(l => l.url === s.url)).length} selected</span>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => selectAllVisible(list)}>
            Select all visible
          </Button>
        </div>
        <ScrollArea className="h-64 rounded-md border bg-background">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && <p className="text-xs text-muted-foreground p-3">{emptyMsg}</p>}
            {filtered.length > 300 && <p className="text-xs text-muted-foreground px-2 pb-1">Showing first 300 of {filtered.length.toLocaleString()} — search to narrow.</p>}
            {filtered.slice(0, 300).map(opt => (
              <label key={opt.url} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer text-sm">
                <Checkbox checked={!!selectedUrls[opt.url]} onCheckedChange={() => toggleUrl(opt)} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{opt.label}</p>
                  <p className="truncate text-xs text-muted-foreground font-mono">{opt.url}</p>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex items-start justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="text-right">
            <h1 className="text-3xl font-bold flex items-center gap-2 justify-end tracking-tight">
              <Sparkles className="h-7 w-7 text-primary" /> Write Blog via AI
            </h1>
            <p className="text-sm text-muted-foreground mt-1">SEO + GEO + AI-Search optimized · {wordMin}–{wordMax} words · text-only, uniform typography</p>
          </div>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Article Brief
          </CardTitle>
          <CardDescription>
            The AI will write a {wordMin}-{wordMax} word article with ~{densityPct}% keyword density.
            <strong className="block mt-0.5 text-foreground/80">No images will be inserted — typography stays uniform.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Top 10 MBA Colleges in Bangalore 2026"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Slug</Label>
              <Input
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
                placeholder="url-slug"
                className="font-mono text-sm"
              />
              <SlugUniqueHint table="articles" slug={slug} onApply={(s) => { setSlugTouched(true); setSlug(s); }} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Target Keyword (primary)</Label>
            <Input
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="e.g. MBA colleges in Bangalore"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Reference Links (highest-priority sources)</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Paste one or more web addresses (one per line). These pages are read first and every fact, number, date and ranking is taken from them before anything else. Extra sources are only searched if these pages do not cover the topic.
            </p>
            <div className="flex gap-2">
              <Textarea
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                onBlur={addReferenceUrls}
                rows={3}
                placeholder={"https://iimcat.ac.in/notification\nhttps://www.iima.ac.in/placement-report"}
              />
              <Button type="button" variant="outline" size="sm" onClick={addReferenceUrls}><Plus className="h-3 w-3" /></Button>
            </div>
            {referenceUrls.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {referenceUrls.map(u => (
                  <Badge key={u} variant="secondary" className="gap-1 text-xs max-w-full">
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[22rem]">{u}</span>
                    <button type="button" onClick={() => removeReferenceUrl(u)} className="ml-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Secondary Keywords (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={secInput}
                onChange={(e) => setSecInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSecKw(); } }}
                placeholder="Type a keyword and press Enter"
              />
              <Button type="button" variant="outline" size="sm" onClick={addSecKw}><Plus className="h-3 w-3" /></Button>
            </div>
            {secondaryKws.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {secondaryKws.map(k => (
                  <Badge key={k} variant="secondary" className="gap-1 text-xs">
                    {k}
                    <button onClick={() => removeSecKw(k)} className="ml-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Meta Title (auto if blank)</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} />
              <SeoLengthHint kind="title" value={metaTitle} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Meta Description (auto if blank)</Label>
              <Input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={170} />
              <SeoLengthHint kind="description" value={metaDescription} />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Target Year</Label>
            <Select value={String(targetYear)} onValueChange={(v) => { setTargetYear(Number(v)); setYearTouched(true); }}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y} ({y}-{String(y + 1).slice(-2)} cycle)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">The article, headings, meta title and description will all be written for this year. Picked from your title automatically.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 pt-2 border-t">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Target Word Count</Label>
              <Select value={WORD_PRESETS.includes(wordTarget) ? String(wordTarget) : "custom"} onValueChange={(v) => { if (v !== "custom") setWordTarget(Number(v)); else setWordTarget(1200); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORD_PRESETS.map((w) => <SelectItem key={w} value={String(w)}>{w.toLocaleString()} words</SelectItem>)}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {!WORD_PRESETS.includes(wordTarget) && (
                <Input className="mt-2" type="number" min={300} step={100} value={wordTarget} onChange={(e) => setWordTarget(parseInt(e.target.value, 10) || 0)} />
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Keyword Density %</Label>
              <Input type="number" min={0.5} max={5} step={0.1} value={densityPct}
                onChange={(e) => setDensityPct(parseFloat(e.target.value) || 1)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Search Intent</Label>
              <Select value={searchIntent || "auto"} onValueChange={(v) => setSearchIntent(v === "auto" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Detect automatically</SelectItem>
                  <SelectItem value="informational">Informational</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="navigational">Navigational</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Target Audience</Label>
            <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. CAT 2026 aspirants comparing IIM costs" />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Additional Instructions</Label>
            <Textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Cover only the 22 IIMs. Include a fee comparison table." />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Sample Blogs (writing style only)</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Paste sample article links (one per line) or full sample text. Separate pasted articles with a line containing only ---. The AI learns tone and structure only and never copies sentences.
            </p>
            <Textarea rows={5} value={samplesText} onChange={(e) => setSamplesText(e.target.value)} placeholder={"https://example.com/sample-article\n---\nOr paste a full sample article here"} />
          </div>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
            <Label className="text-xs font-semibold block">Write a Similar Blog (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Add a link or upload a PDF / Word file. The system reads the whole page, works out what it covers, and writes a similar article in fresh, human-sounding words. Nothing is copied.
            </p>
            <Input value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} placeholder="https://example.com/blog-you-want-a-similar-version-of" disabled={!!modelDoc} />
            <div className="flex flex-wrap items-center gap-2">
              <input id="model-blog-file" type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleModelFile} />
              <Button type="button" variant="outline" size="sm" disabled={modelReading} onClick={() => document.getElementById("model-blog-file")?.click()}>
                {modelReading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                {modelReading ? "Reading file..." : "Upload PDF / Word"}
              </Button>
              {modelDoc && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <FileText className="h-3 w-3" /> {modelDoc.name} · {modelDoc.text.split(/\s+/).length.toLocaleString()} words read
                  <button type="button" onClick={() => setModelDoc(null)} aria-label="Remove file"><X className="h-3 w-3" /></button>
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Internal Linking Pool */}
      <Card className="shadow-xs border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" /> Internal Linking Pool
              </CardTitle>
              <CardDescription>
                Every published college, exam, blog and coaching page is searchable here. Related pages are picked automatically from the title, keywords and outline, then woven in as editorial in-text links and “Also Read” blocks.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">{selectedCount} selected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              ["Colleges", colleges.length], ["Exams", exams.length], ["Blogs", articles.length],
              ["Coaching", coachings.length], ["Auto-picked", Object.keys(autoPicked).length],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="text-base font-semibold">{loadingLinks && k !== "Auto-picked" ? "…" : (v as number).toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Auto-pick related pages</p>
              </div>
              <Switch checked={autoLink} onCheckedChange={setAutoLink} aria-label="Auto-pick related pages" />
            </div>
            {Object.keys(autoPicked).length === 0 ? (
              <p className="text-xs text-muted-foreground">{autoLink ? "Type a title or keyword — matching colleges, exams and guides appear here." : "Auto-pick is off. Choose links manually below."}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {Object.values(autoPicked).sort((a, b) => b.score - a.score).map(p => (
                  <Badge key={p.url} variant={selectedUrls[p.url] ? "default" : "outline"} className="gap-1 text-xs font-normal cursor-pointer" onClick={() => toggleUrl(p)}>
                    {p.label}
                    <span className="opacity-70">{p.score >= 100 ? "exact" : p.score >= 70 ? "strong" : "related"}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Search across colleges, exams, articles, coaching, tools…"
              className="pl-9"
            />
          </div>

          <Tabs defaultValue="colleges" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="colleges">Colleges ({colleges.length})</TabsTrigger>
              <TabsTrigger value="exams">Exams ({exams.length})</TabsTrigger>
              <TabsTrigger value="articles">Blogs ({articles.length})</TabsTrigger>
              <TabsTrigger value="coaching">Coaching ({coachings.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="tools" className="mt-3">{renderLinkList(TOOL_URLS, "No tools")}</TabsContent>
            <TabsContent value="colleges" className="mt-3">{renderLinkList(colleges, loadingLinks ? "Loading…" : "No colleges found")}</TabsContent>
            <TabsContent value="exams" className="mt-3">{renderLinkList(exams, loadingLinks ? "Loading…" : "No exams")}</TabsContent>
            <TabsContent value="articles" className="mt-3">{renderLinkList(articles, loadingLinks ? "Loading…" : "No articles")}</TabsContent>
            <TabsContent value="coaching" className="mt-3">{renderLinkList(coachings, loadingLinks ? "Loading…" : "No coaching institutes")}</TabsContent>
          </Tabs>

          {selectedCount > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">Selected URLs ({selectedCount})</p>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs"
                  onClick={() => setSelectedUrls({})}>Clear all</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {Object.values(selectedUrls).map(opt => (
                  <Badge key={opt.url} variant="outline" className="gap-1 text-xs font-normal">
                    {opt.label}
                    <button onClick={() => toggleUrl(opt)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {outline && (
        <Button type="button" className="w-full" onClick={() => document.getElementById("outline-review")?.scrollIntoView({ behavior: "smooth" })}>
          Outline is ready — scroll down to review and approve it
        </Button>
      )}

      {(generating || progressSteps.length > 0) && (
        <AIGenerationProgress
          workflow="Blog generation"
          active={generating}
          total={progressSteps.length}
          done={progressSteps.filter(s => s.status === "ok" || s.status === "fail").length}
          ok={progressSteps.filter(s => s.status === "ok").length}
          fail={progressSteps.filter(s => s.status === "fail").length}
          current={progressCurrent}
          steps={progressSteps}
          onDismiss={() => setProgressSteps([])}
        />
      )}

      {errorMsg && (
        <Card className="border-destructive">
          <CardContent className="pt-4 flex gap-2 items-start text-sm">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-destructive">{errorMsg}</p>
          </CardContent>
        </Card>
      )}

      {outline && (
        <Card id="outline-review" className="border-2 border-primary scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-base">Action needed: review the outline before writing</CardTitle>
            <CardDescription>Generation is paused until you approve. Edit, reorder, add or remove sections, then click "Approve outline & write article" at the bottom of this box.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2"><Label>Article title</Label><Input value={outline.title} onChange={(e) => setOutline({ ...outline, title: e.target.value })} /></div>
              <div className="space-y-1"><Label>Meta title</Label><Input value={outline.metaTitle} onChange={(e) => setOutline({ ...outline, metaTitle: e.target.value })} /></div>
              <div className="space-y-1"><Label>Meta description</Label><Input value={outline.metaDescription} onChange={(e) => setOutline({ ...outline, metaDescription: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Decision-led sections (H2)</Label>
              {outline.sections.map((sec, i) => (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{i + 1}</Badge>
                    <Input className="flex-1 min-w-[200px]" value={sec.heading} onChange={(e) => editSection(i, { heading: e.target.value })} placeholder="Section heading" />
                    <Button type="button" size="sm" variant="ghost" onClick={() => moveSection(i, -1)} disabled={i === 0}>Up</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => moveSection(i, 1)} disabled={i === outline.sections.length - 1}>Down</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setOutline({ ...outline, sections: outline.sections.filter((_, n) => n !== i) })}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1"><Label>Chapter</Label><Input value={sec.chapter} onChange={(e) => editSection(i, { chapter: e.target.value })} placeholder="Understand, Compare, Decide…" /></div>
                    <div className="space-y-1"><Label>Alert</Label><Input value={sec.calloutPlan} onChange={(e) => editSection(i, { calloutPlan: e.target.value })} placeholder="Deadline, Update, Caution… or leave blank" /></div>
                  </div>
                  <Textarea rows={2} value={sec.angle} onChange={(e) => editSection(i, { angle: e.target.value })} placeholder="Distinct reader question and source-backed coverage" />
                  <Textarea rows={2} value={sec.tablePlan} onChange={(e) => editSection(i, { tablePlan: e.target.value })} placeholder="Planned table and columns, or leave blank" />
                  <Textarea rows={2} value={sec.linkPlan} onChange={(e) => editSection(i, { linkPlan: e.target.value })} placeholder="Up to two approved links with anchor intent, or leave blank" />
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setOutline({ ...outline, sections: [...outline.sections, { heading: "", angle: "", chapter: "Article", tablePlan: "", calloutPlan: "", linkPlan: "" }] })}><Plus className="h-4 w-4" /> Add section</Button>
            </div>
            <div className="space-y-1">
              <Label>FAQ questions (one per line)</Label>
              <Textarea rows={4} value={outline.faqs.join("\n")} onChange={(e) => setOutline({ ...outline, faqs: e.target.value.split("\n") })} />
            </div>
            <Button onClick={approveOutline} disabled={outlineSaving} className="gap-2">
              {outlineSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Approve outline & write article
            </Button>
          </CardContent>
        </Card>
      )}

      {stats?.insertedId && (
        <BlogEditorWorkspace articleId={stats.insertedId} jobId={jobId} stats={stats} targetDensity={densityPct} />
      )}

      <div className="flex gap-3 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-1 px-1">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1 gap-2"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Researching & writing... (45-90s)</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Approve & Generate Article ({selectedCount} internal links)</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AdminWriteBlog;
