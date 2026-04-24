// Assembled-page SEO audit + Firecrawl competitor scan.
// Body: { contentType: "college"|"institute"|"article", recordId: string, runCompetitorScan?: boolean }
// Returns a complete SEOSuggestionsPayload sized for the FULL assembled page (base + sections/courses/faculty).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { callAIGateway } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://mbacompass.in";

interface AuditBody {
  contentType: "college" | "institute" | "article";
  recordId: string;
  runCompetitorScan?: boolean;
}

interface AssembledPage {
  base: Record<string, any>;
  sections: any[];
  courses: any[];
  faculty: any[];
  results: any[];
  pageUrl: string;
  pageTitle: string;
  fullText: string;
  wordCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  headersFound: string[];
}

async function assemblePage(
  supabase: any,
  contentType: AuditBody["contentType"],
  recordId: string,
): Promise<AssembledPage> {
  let base: any = null;
  let sections: any[] = [];
  let courses: any[] = [];
  let faculty: any[] = [];
  let results: any[] = [];
  let pathPrefix = "";

  if (contentType === "college") {
    pathPrefix = "/college/";
    const { data } = await supabase.from("colleges").select("*").eq("id", recordId).maybeSingle();
    base = data;
    const { data: secs } = await supabase
      .from("college_sections")
      .select("*")
      .eq("college_id", recordId)
      .order("sort_order", { ascending: true });
    sections = secs || [];
  } else if (contentType === "institute") {
    pathPrefix = "/institute/";
    const { data } = await supabase.from("institutes").select("*").eq("id", recordId).maybeSingle();
    base = data;
    const [{ data: cs }, { data: fs }, { data: rs }] = await Promise.all([
      supabase.from("courses").select("*").eq("institute_id", recordId),
      supabase.from("faculty").select("*").eq("institute_id", recordId),
      supabase.from("institute_results").select("*").eq("institute_id", recordId),
    ]);
    courses = cs || [];
    faculty = fs || [];
    results = rs || [];
  } else {
    pathPrefix = "/article/";
    const { data } = await supabase.from("articles").select("*").eq("id", recordId).maybeSingle();
    base = data;
  }

  if (!base) throw new Error(`${contentType} not found`);

  // ── Assemble full text ──
  const parts: string[] = [];
  parts.push(base.title || base.name || "");
  parts.push(base.h1_tag || "");
  parts.push(base.description || base.intro || base.intro_content || "");
  parts.push(base.content || base.detailed_content || "");
  parts.push(base.admission_process || "");
  parts.push(base.faq_content || "");

  for (const s of sections) {
    parts.push(`\n\n[Section: ${s.section_type}] ${s.title || ""}`);
    parts.push(s.content || "");
    if (s.data && typeof s.data === "object") parts.push(JSON.stringify(s.data));
  }
  for (const c of courses) {
    parts.push(`\n\n[Course] ${c.name || ""} — ${c.duration || ""} — Fees ₹${c.fees || "N/A"}`);
    parts.push(c.description || "");
    if (Array.isArray(c.curriculum)) parts.push(c.curriculum.join(", "));
    if (Array.isArray(c.highlights)) parts.push(c.highlights.join(", "));
  }
  for (const f of faculty) {
    parts.push(`\n[Faculty] ${f.name || ""} — ${f.designation || ""} — ${f.qualification || ""}`);
    parts.push(f.bio || "");
  }
  for (const r of results) {
    parts.push(`\n[Result ${r.year}] ${r.students_selected || 0} selections at ${r.college_name || ""}`);
  }

  const rawText = parts.filter(Boolean).join("\n\n");
  const fullText = rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  const imgMatches = rawText.match(/<img[^>]*>/gi) || [];
  const imagesMissingAlt = imgMatches.filter((img) => !/alt="[^"]+"/i.test(img)).length;
  const headerMatches = rawText.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || [];
  const headersFound = headerMatches.map((h) => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);

  return {
    base,
    sections,
    courses,
    faculty,
    results,
    pageUrl: `${SITE_URL}${pathPrefix}${base.slug || ""}`,
    pageTitle: base.title || base.name || base.full_name || "Untitled",
    fullText,
    wordCount,
    imageCount: imgMatches.length,
    imagesMissingAlt,
    headersFound,
  };
}

// ── Firecrawl competitor scan ──
async function runFirecrawlCompetitorScan(
  primaryKeyword: string,
  pageTitle: string,
): Promise<{ competitors: Array<{ url: string; title: string; snippet: string }>; gapInsights: string[] }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    return { competitors: [], gapInsights: ["Firecrawl not configured — competitor scan skipped"] };
  }

  const query = primaryKeyword || pageTitle;
  if (!query) return { competitors: [], gapInsights: [] };

  try {
    const resp = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `${query} India MBA`,
        limit: 5,
        country: "in",
        lang: "en",
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.warn("[full-page-seo-audit] Firecrawl error", resp.status, t.slice(0, 200));
      return { competitors: [], gapInsights: [`Firecrawl returned ${resp.status}`] };
    }
    const data = await resp.json();
    const rawResults: any[] = data?.data?.web || data?.data || data?.web || [];
    const competitors = rawResults.slice(0, 5).map((r: any) => ({
      url: r.url || r.link || "",
      title: r.title || "",
      snippet: (r.description || r.snippet || "").slice(0, 300),
    })).filter((c) => c.url);

    return { competitors, gapInsights: [] };
  } catch (e) {
    console.warn("[full-page-seo-audit] Firecrawl threw", e instanceof Error ? e.message : e);
    return { competitors: [], gapInsights: ["Competitor scan failed — see logs"] };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as AuditBody;
    if (!body?.contentType || !body?.recordId) {
      return new Response(JSON.stringify({ error: "contentType and recordId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const assembled = await assemblePage(supabase, body.contentType, body.recordId);

    // Run competitor scan + AI in parallel
    const competitorPromise = body.runCompetitorScan
      ? runFirecrawlCompetitorScan(assembled.base.primary_keyword || "", assembled.pageTitle)
      : Promise.resolve({ competitors: [], gapInsights: [] });

    const competitorData = await competitorPromise;
    const competitorContext = competitorData.competitors.length > 0
      ? `\n\n=== TOP COMPETING PAGES (Firecrawl scan) ===\n${competitorData.competitors
          .map((c, i) => `${i + 1}. ${c.title}\n   ${c.url}\n   "${c.snippet}"`)
          .join("\n\n")}`
      : "";

    const systemPrompt = `You are a senior SEO strategist auditing an ASSEMBLED Indian MBA education page. The page already has base data + multiple structured sections (courses, faculty, placements, cutoffs, FAQs, etc.) — analyze ALL of it as one cohesive page.

Score the CURRENT state honestly (0-100). Then produce a complete SEO upgrade: meta_title (≤60 chars), meta_description (150-160 chars), h1_tag, six keyword buckets, on-page tips, technical SEO, social meta, internal links, content suggestions, and competitor insights derived from the live competitor pages provided.

Return ONLY the JSON via the tool call.`;

    const userPrompt = `=== ASSEMBLED PAGE AUDIT ===
Type: ${body.contentType}
Title: ${assembled.pageTitle}
URL: ${assembled.pageUrl}
City/State: ${assembled.base.city || "N/A"} / ${assembled.base.state || "N/A"}

CURRENT META:
- Meta title: ${assembled.base.meta_title ? `"${assembled.base.meta_title}" (${assembled.base.meta_title.length} chars)` : "❌ MISSING"}
- Meta description: ${assembled.base.meta_description ? `"${assembled.base.meta_description}" (${assembled.base.meta_description.length} chars)` : "❌ MISSING"}
- H1: ${assembled.base.h1_tag || "❌ MISSING"}
- Primary keyword: ${assembled.base.primary_keyword || "❌ NOT SET"}
- Keywords: ${(assembled.base.keywords || []).join(", ") || "❌ NONE"}

STRUCTURED CONTENT INVENTORY:
- Sections: ${assembled.sections.length} (${assembled.sections.map((s) => s.section_type).join(", ") || "none"})
- Courses: ${assembled.courses.length}
- Faculty: ${assembled.faculty.length}
- Result entries: ${assembled.results.length}
- Total assembled words: ${assembled.wordCount}
- Images: ${assembled.imageCount} (${assembled.imagesMissingAlt} missing alt)
- Headers found: ${assembled.headersFound.slice(0, 10).join(" | ") || "none"}

FULL ASSEMBLED CONTENT (truncated to 8000 chars):
${assembled.fullText.slice(0, 8000)}
${competitorContext}

Score honestly. Identify gaps vs. competitors. Generate the complete SEO package.`;

    const aiResp = await callAIGateway(
      {
        model: "google/gemini-2.5-flash",
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tool_choice: { type: "function", function: { name: "full_page_seo" } },
        tools: [
          {
            type: "function",
            function: {
              name: "full_page_seo",
              description: "Comprehensive SEO audit of the assembled page",
              parameters: {
                type: "object",
                properties: {
                  meta_title: { type: "string" },
                  meta_description: { type: "string" },
                  h1_tag: { type: "string" },
                  primary_keyword: { type: "string" },
                  keywords: {
                    type: "object",
                    properties: {
                      primary: { type: "array", items: { type: "string" } },
                      shortTail: { type: "array", items: { type: "string" } },
                      longTail: { type: "array", items: { type: "string" } },
                      faq: { type: "array", items: { type: "string" } },
                      trending: { type: "array", items: { type: "string" } },
                      lsi: { type: "array", items: { type: "string" } },
                    },
                    required: ["primary", "shortTail", "longTail", "faq", "trending", "lsi"],
                  },
                  onPageTips: { type: "array", items: { type: "string" } },
                  technicalSEO: {
                    type: "object",
                    properties: {
                      canonicalUrl: { type: "string" },
                      urlSlugSuggestion: { type: "string" },
                      imageAltTags: { type: "array", items: { type: "string" } },
                      contentLengthAnalysis: {
                        type: "object",
                        properties: {
                          currentWordCount: { type: "number" },
                          recommendedMinimum: { type: "number" },
                          verdict: { type: "string" },
                        },
                      },
                      headerStructure: { type: "array", items: { type: "string" } },
                      pagespeedTips: { type: "array", items: { type: "string" } },
                      mobileTips: { type: "array", items: { type: "string" } },
                      backlinkIdeas: { type: "array", items: { type: "string" } },
                      keywordPlacementTips: { type: "array", items: { type: "string" } },
                    },
                  },
                  socialMeta: {
                    type: "object",
                    properties: {
                      ogTitle: { type: "string" },
                      ogDescription: { type: "string" },
                      twitterTitle: { type: "string" },
                      twitterDescription: { type: "string" },
                    },
                  },
                  internalLinks: {
                    type: "object",
                    properties: {
                      suggested: { type: "array", items: { type: "string" } },
                      anchorTexts: { type: "array", items: { type: "string" } },
                    },
                  },
                  contentSuggestions: { type: "array", items: { type: "string" } },
                  competitorInsights: { type: "array", items: { type: "string" } },
                  schemaMarkup: {
                    type: "array",
                    description: "Array of JSON-LD schema objects (Organization, BreadcrumbList, FAQPage, etc.)",
                    items: { type: "object" },
                  },
                  seoScore: {
                    type: "object",
                    properties: {
                      overall: { type: "number" },
                      projectedScore: { type: "number" },
                      breakdown: {
                        type: "object",
                        properties: {
                          metaTags: { type: "number" },
                          keywords: { type: "number" },
                          technicalSEO: { type: "number" },
                          schema: { type: "number" },
                          contentStructure: { type: "number" },
                          socialMeta: { type: "number" },
                        },
                      },
                      criticalIssues: { type: "array", items: { type: "string" } },
                      warnings: { type: "array", items: { type: "string" } },
                      passed: { type: "array", items: { type: "string" } },
                    },
                  },
                },
                required: [
                  "meta_title",
                  "meta_description",
                  "h1_tag",
                  "primary_keyword",
                  "keywords",
                  "onPageTips",
                  "technicalSEO",
                  "socialMeta",
                  "internalLinks",
                  "contentSuggestions",
                  "competitorInsights",
                  "schemaMarkup",
                  "seoScore",
                ],
              },
            },
          },
        ],
      },
      { feature: "full-page-seo-audit" },
    );

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("[full-page-seo-audit] AI error", aiResp.status, t.slice(0, 300));
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Retry shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway error ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: any = {};
    if (toolCall?.function?.arguments) {
      const args = toolCall.function.arguments;
      suggestions = typeof args === "string" ? JSON.parse(args) : args;
    } else {
      throw new Error("AI did not return a structured response");
    }

    return new Response(
      JSON.stringify({
        ok: true,
        suggestions,
        assembled: {
          pageUrl: assembled.pageUrl,
          pageTitle: assembled.pageTitle,
          wordCount: assembled.wordCount,
          imageCount: assembled.imageCount,
          imagesMissingAlt: assembled.imagesMissingAlt,
          sectionsCount: assembled.sections.length,
          coursesCount: assembled.courses.length,
          facultyCount: assembled.faculty.length,
          headersFound: assembled.headersFound,
        },
        competitors: competitorData.competitors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[full-page-seo-audit] Error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
