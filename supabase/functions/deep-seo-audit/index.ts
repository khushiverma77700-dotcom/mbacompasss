// Deep SEO audit: fetch → research (Firecrawl) → competitors → keyword gap → checklist → AI proposal.
// Progress is written to page_seo_audits.steps for live polling from the admin UI.
import { createClient } from "npm:@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://coach-compass-finder.lovable.app";
const FIRECRAWL = "https://api.firecrawl.dev/v2";

type Step = { key: string; label: string; status: "pending" | "running" | "done" | "failed"; log?: string; data?: any };

const STEP_DEFS: Omit<Step, "status">[] = [
  { key: "fetch",       label: "Read page content" },
  { key: "research",    label: "Research keyword on the web" },
  { key: "competitors", label: "Analyze top competitors" },
  { key: "gap",         label: "Find keyword & topic gaps" },
  { key: "checklist",   label: "Run SEO checklist" },
  { key: "proposal",    label: "Generate optimization proposal" },
];

function mkSteps(): Step[] { return STEP_DEFS.map(s => ({ ...s, status: "pending" })); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const slug: string = (body.slug || "cat-mock-1").toString();
    const targetKeyword: string = (body.targetKeyword || "CAT mock test").toString();

    const { data: inserted, error: insErr } = await admin
      .from("page_seo_audits")
      .insert({
        slug, target_keyword: targetKeyword, status: "running",
        steps: mkSteps(), created_by: user.id,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 500);
    const auditId = inserted.id as string;

    // @ts-ignore Deno edge runtime global
    EdgeRuntime.waitUntil(runAudit(admin, auditId, slug, targetKeyword, LOVABLE_API_KEY, FIRECRAWL_API_KEY));

    return json({ auditId }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "audit failed" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function runAudit(
  admin: any, auditId: string, slug: string, keyword: string,
  LOVABLE_API_KEY?: string, FIRECRAWL_API_KEY?: string,
) {
  const steps = mkSteps();
  const setStep = async (key: string, patch: Partial<Step>) => {
    const i = steps.findIndex(s => s.key === key);
    if (i >= 0) steps[i] = { ...steps[i], ...patch };
    await admin.from("page_seo_audits").update({ steps }).eq("id", auditId);
  };
  const finish = async (extra: any = {}) => {
    await admin.from("page_seo_audits").update({ steps, status: "ready_for_review", ...extra }).eq("id", auditId);
  };
  const fail = async (err: string) => {
    await admin.from("page_seo_audits").update({ steps, status: "failed", error: err }).eq("id", auditId);
  };

  try {
    // 1. Fetch page
    await setStep("fetch", { status: "running" });
    const pageUrl = `${SITE_URL}/${slug}`;
    const html = await (await fetch(pageUrl)).text();
    const doc = new DOMParser().parseFromString(html, "text/html")!;
    const pageData = extractPage(doc, keyword, pageUrl);
    await setStep("fetch", { status: "done", data: {
      title: pageData.title, description: pageData.description,
      h1: pageData.h1, wordCount: pageData.wordCount,
    }});

    // 2. Research keyword
    await setStep("research", { status: "running" });
    let research: any = { results: [], skipped: !FIRECRAWL_API_KEY };
    if (FIRECRAWL_API_KEY) {
      try {
        const r = await fetch(`${FIRECRAWL}/search`, {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: keyword, limit: 10, lang: "en", country: "in" }),
        });
        const j = await r.json();
        const list = j?.data?.web || j?.web || j?.data || [];
        research.results = (Array.isArray(list) ? list : []).slice(0, 10).map((x: any) => ({
          url: x.url, title: x.title, description: x.description,
        }));
      } catch (e: any) { research.error = e.message; }
    }
    await setStep("research", { status: "done", data: research });

    // 3. Competitors
    await setStep("competitors", { status: "running" });
    const competitors: any[] = [];
    const top = (research.results || [])
      .filter((r: any) => r.url && !r.url.includes("mbacompass"))
      .slice(0, 3);
    if (FIRECRAWL_API_KEY) {
      for (const c of top) {
        try {
          const r = await fetch(`${FIRECRAWL}/scrape`, {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: c.url, formats: ["markdown"], onlyMainContent: true }),
          });
          const j = await r.json();
          const md = j?.data?.markdown || j?.markdown || "";
          competitors.push({
            url: c.url, title: c.title,
            words: countWords(md),
            snippet: md.slice(0, 1200),
          });
        } catch (e: any) { competitors.push({ url: c.url, error: e.message }); }
      }
    }
    await setStep("competitors", { status: "done", data: competitors.map(c => ({
      url: c.url, title: c.title, words: c.words, error: c.error,
    }))});

    // 4. Keyword gap via AI
    await setStep("gap", { status: "running" });
    let gap: any = { missing: [], notes: "" };
    if (LOVABLE_API_KEY && competitors.length) {
      const prompt = `Target keyword: "${keyword}".
Our page (excerpt): """${pageData.body.slice(0, 4000)}"""

Competitor excerpts:
${competitors.map((c, i) => `--- Competitor ${i + 1} (${c.url}) ---\n${(c.snippet || "").slice(0, 1500)}`).join("\n\n")}

Return JSON: { "missing_keywords": string[], "missing_topics": string[], "notes": string }.
Focus on terms and topics competitors cover that our page lacks and that a CAT mock test buyer searches for. Max 10 items each.`;
      try {
        gap = await callAIJSON(LOVABLE_API_KEY, prompt);
      } catch (e: any) { gap = { error: e.message, missing: [] }; }
    }
    await setStep("gap", { status: "done", data: gap });

    // 5. Checklist
    await setStep("checklist", { status: "running" });
    const checklist = runChecklist(pageData);
    await setStep("checklist", { status: "done", data: {
      score: checklist.score, passing: checklist.passing, warnings: checklist.warnings, failing: checklist.failing,
    }});

    // 6. AI proposal
    await setStep("proposal", { status: "running" });
    let proposal: any = null;
    if (LOVABLE_API_KEY) {
      const gaps = (gap.missing_keywords || []).concat(gap.missing_topics || []).slice(0, 12);
      const failed = checklist.checks.filter((c: any) => c.status !== "pass");
      const prompt = `You are an expert SEO copywriter for MBA Compass, target keyword: "${keyword}".
Rewrite / add SEO content for the /cat-mock-1 landing page. Keep tone professional, no emojis, no dark blue.

Current title: ${pageData.title}
Current description: ${pageData.description}
Current H1: ${pageData.h1}
Word count: ${pageData.wordCount}
Keyword density: ${pageData.density.toFixed(2)}%
Failing/warning checks: ${failed.map((c: any) => `${c.label} (${c.status})`).join("; ")}
Gaps to cover: ${gaps.join(", ")}

Rules:
- title: 50-60 chars, include "${keyword}".
- description: 140-160 chars, include "${keyword}" naturally, benefit-led.
- h1: include "${keyword}" once, human-natural.
- intro_html: 1 short paragraph (60-90 words) of clean HTML using <p> and <strong>, includes "${keyword}" twice max, weaves in 2-3 gap terms.
- keywords: 8-12 comma-worthy phrases.
- faq: 5 Q&A objects targeting search intent; questions phrased like real Google queries.
- json_ld: valid schema.org FAQPage JSON.

Return strict JSON matching: { "title": string, "description": string, "h1": string, "intro_html": string, "keywords": string[], "faq": [{ "q": string, "a": string }], "json_ld": object }`;
      try { proposal = await callAIJSON(LOVABLE_API_KEY, prompt); }
      catch (e: any) { proposal = { error: e.message }; }
    }
    await setStep("proposal", { status: "done" });

    await finish({
      checklist, competitors: competitors.map(c => ({ url: c.url, title: c.title, words: c.words })),
      keyword_gap: gap, proposal,
    });
  } catch (e: any) {
    const running = steps.find(s => s.status === "running");
    if (running) running.status = "failed", running.log = e?.message;
    await fail(e?.message || "audit crashed");
  }
}

function extractPage(doc: any, keyword: string, url: string) {
  const q = (sel: string) => doc.querySelector(sel);
  const title = q("title")?.textContent?.trim() || "";
  const description = (q('meta[name="description"]') as any)?.getAttribute?.("content") || "";
  const canonical = (q('link[rel="canonical"]') as any)?.getAttribute?.("href") || "";
  const robots = (q('meta[name="robots"]') as any)?.getAttribute?.("content") || "";
  const viewport = (q('meta[name="viewport"]') as any)?.getAttribute?.("content") || "";
  const h1s: string[] = []; const h2s: string[] = [];
  doc.querySelectorAll("h1").forEach((n: any) => h1s.push((n.textContent || "").trim()));
  doc.querySelectorAll("h2").forEach((n: any) => h2s.push((n.textContent || "").trim()));
  const og: Record<string, string> = {};
  doc.querySelectorAll('meta[property^="og:"]').forEach((m: any) => {
    og[m.getAttribute("property") || ""] = m.getAttribute("content") || "";
  });
  const twitter: Record<string, string> = {};
  doc.querySelectorAll('meta[name^="twitter:"]').forEach((m: any) => {
    twitter[m.getAttribute("name") || ""] = m.getAttribute("content") || "";
  });
  const jsonLd: any[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s: any) => {
    try { jsonLd.push(JSON.parse(s.textContent || "")); } catch {}
  });
  const images = Array.from(doc.querySelectorAll("img")).map((i: any) => ({
    src: i.getAttribute("src") || "", alt: i.getAttribute("alt") || "",
  }));
  const anchors = Array.from(doc.querySelectorAll("a[href]")) as any[];
  let internal = 0, external = 0;
  anchors.forEach(a => {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("http") && !href.includes("coach-compass-finder.lovable.app") && !href.includes("mbacompass")) external++;
    else internal++;
  });
  const bodyEl = doc.body;
  bodyEl?.querySelectorAll("script,style,noscript").forEach((n: any) => n.remove());
  const body = (bodyEl?.textContent || "").replace(/\s+/g, " ").trim();
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const kw = keyword.toLowerCase();
  const kwWords = kw.split(/\s+/).length;
  const lower = body.toLowerCase();
  let occ = 0, idx = 0;
  while ((idx = lower.indexOf(kw, idx)) !== -1) { occ++; idx += kw.length; }
  const density = wordCount ? (occ * kwWords / wordCount) * 100 : 0;
  return {
    url, title, description, canonical, robots, viewport,
    h1: h1s.join(" | "), h1s, h2s, og, twitter, jsonLd,
    images, internalLinks: internal, externalLinks: external,
    body, wordCount, kwOccurrences: occ, density,
  };
}

function runChecklist(p: any) {
  const kw = (Deno as any)._ || "CAT mock test";
  const checks: any[] = [];
  const push = (key: string, label: string, status: "pass" | "warn" | "fail", value?: string, hint?: string) =>
    checks.push({ key, label, status, value, hint });
  const t = p.title, d = p.description;
  push("title", "Title tag length",
    !t ? "fail" : t.length < 30 || t.length > 60 ? "warn" : "pass",
    `${t.length} chars — ${t}`);
  push("title_kw", "Keyword in title",
    t.toLowerCase().includes("cat mock test") ? "pass" : "fail");
  push("desc", "Meta description length",
    !d ? "fail" : d.length < 120 || d.length > 160 ? "warn" : "pass",
    `${d.length} chars`);
  push("desc_kw", "Keyword in description",
    d.toLowerCase().includes("cat mock test") ? "pass" : "warn");
  push("h1", "Single H1",
    p.h1s.length === 0 ? "fail" : p.h1s.length > 1 ? "warn" : "pass",
    `${p.h1s.length} H1`);
  push("h1_kw", "Keyword in H1",
    p.h1s.some((h: string) => h.toLowerCase().includes("cat mock test")) ? "pass" : "warn");
  push("h2", "H2 coverage",
    p.h2s.length >= 3 ? "pass" : p.h2s.length ? "warn" : "fail", `${p.h2s.length} H2`);
  push("canonical", "Canonical URL", p.canonical ? "pass" : "warn", p.canonical);
  push("robots", "Robots meta", /noindex/i.test(p.robots) ? "fail" : "pass", p.robots || "index, follow");
  push("og", "Open Graph tags", p.og["og:title"] && p.og["og:description"] ? "pass" : "warn",
    `${Object.keys(p.og).length} og:*`);
  push("og_image", "og:image", p.og["og:image"] ? "pass" : "warn");
  push("twitter", "Twitter card", p.twitter["twitter:card"] ? "pass" : "warn");
  push("jsonld", "JSON-LD structured data",
    p.jsonLd.length ? "pass" : "warn",
    p.jsonLd.map((j: any) => j["@type"] || "").filter(Boolean).join(", "));
  const missingAlt = p.images.filter((i: any) => !i.alt).length;
  push("alt", "Image alt attributes",
    p.images.length === 0 ? "pass" : missingAlt === 0 ? "pass" :
      missingAlt / p.images.length > 0.3 ? "fail" : "warn",
    `${p.images.length - missingAlt}/${p.images.length} have alt`);
  push("wc", "Word count", p.wordCount >= 600 ? "pass" : p.wordCount >= 300 ? "warn" : "fail",
    `${p.wordCount} words`);
  push("density", "Keyword density",
    p.density >= 1 && p.density <= 3 ? "pass" : p.density > 3 ? "warn" : "fail",
    `${p.density.toFixed(2)}%`);
  push("links", "Internal links", p.internalLinks >= 3 ? "pass" : "warn",
    `${p.internalLinks} internal / ${p.externalLinks} external`);
  push("viewport", "Mobile viewport", p.viewport ? "pass" : "fail");
  const passing = checks.filter(c => c.status === "pass").length;
  const warnings = checks.filter(c => c.status === "warn").length;
  const failing = checks.filter(c => c.status === "fail").length;
  const score = Math.round((passing / checks.length) * 100);
  return { checks, passing, warnings, failing, score };
}

async function callAIJSON(_key: string, prompt: string): Promise<any> {
  const geminiKey = (await (await import("../_shared/getCredential.ts")).getCredential("GEMINI_API_KEY")) || _key;
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${geminiKey}` },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "Return ONLY valid JSON. No markdown fences." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const text = j.choices?.[0]?.message?.content || "{}";
  return JSON.parse(text);
}

function countWords(s: string) { return (s || "").split(/\s+/).filter(Boolean).length; }
