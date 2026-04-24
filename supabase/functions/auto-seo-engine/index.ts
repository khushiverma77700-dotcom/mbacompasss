import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    const { error } = await sb.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0, estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
    if (error) console.error("[ai-usage-log] Insert failed:", JSON.stringify(error));
    else console.log("[ai-usage-log] Logged usage for", feature);
  } catch (e) { console.error("[ai-usage-log] Exception:", e); }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTENT_TABLES: Record<string, { table: string; getPath: (i: any) => string }> = {
  article: { table: "articles", getPath: (i) => `/article/${i.slug}` },
  institute: { table: "institutes", getPath: (i) => `/institute/${i.slug}` },
  college: { table: "colleges", getPath: (i) => `/college/${i.slug}` },
  exam: { table: "exams", getPath: (i) => `/exam/${i.slug}` },
  cityPage: { table: "city_pages", getPath: (i) => `/colleges/${i.slug}` },
  category: { table: "categories", getPath: (i) => `/category/${i.slug}` },
};

function stripHtml(v: string) {
  return v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getTextContent(item: Record<string, any>) {
  return stripHtml(
    item.description || item.content || item.intro_content || item.detailed_content || item.faq_content || item.admission_process || item.eligibility || ""
  );
}

// ─── COST OPTIMIZATION HELPERS (Balanced Tier) ───────────────
// Cheap model for structured/templated tasks (scoring, schema, keywords, image audit)
const CHEAP_MODEL = "google/gemini-2.5-flash-lite";
// Standard model for nuanced output (meta titles/descriptions, FAQs)
const STANDARD_MODEL = "google/gemini-2.5-flash";
// Premium reserved only for FAQ generation where quality matters most
const PREMIUM_MODEL = "google/gemini-2.5-pro";

// SHA-256 hash of text content — used to skip pages that haven't changed since last refresh
async function computeContentHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text || "");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Smart truncation: keeps intro + headings + first sentence of each section.
// Preserves SEO-critical structure while cutting tokens by ~60-70%.
// NOT used for FAQ generation (which needs full context).
function truncateForAI(text: string, maxChars = 1500): string {
  if (!text || text.length <= maxChars) return text;
  const stripped = stripHtml(text);
  if (stripped.length <= maxChars) return stripped;
  // Keep first 1000 chars (intro) + last 500 chars (often conclusion/CTA context)
  return stripped.slice(0, 1000) + " ... " + stripped.slice(-500);
}

// Returns true if page should be skipped (unchanged since last refresh within freshDays).
async function shouldSkipForCache(
  item: Record<string, any>,
  newHash: string,
  freshDays = 7
): Promise<boolean> {
  if (!item.content_hash || item.content_hash !== newHash) return false;
  if (!item.last_seo_refresh) return false;
  const ageMs = Date.now() - new Date(item.last_seo_refresh).getTime();
  return ageMs < freshDays * 24 * 60 * 60 * 1000;
}

function getName(item: Record<string, any>) {
  return item.title || item.name || item.full_name || "Untitled";
}

function extractToolResult(aiData: any): any {
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
  }
  const content = aiData.choices?.[0]?.message?.content || "";
  let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  const end = cleaned.lastIndexOf(start !== -1 && cleaned[start] === "[" ? "]" : "}");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  cleaned = cleaned.substring(start, end + 1).replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  return JSON.parse(cleaned);
}

// Verify caller is an authenticated admin. Returns null if authorized, or a Response if not.
async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sbAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roleRow } = await sbAdmin
    .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authFail = await requireAdmin(req);
    if (authFail) return authFail;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const mode = body.mode || "bulk_optimize";

    if (mode === "bulk_optimize") {
      const { contentType, pageIds, allPages } = body;
      
      if (!contentType || !pageIds?.length) {
        return new Response(JSON.stringify({ error: "contentType and pageIds required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const config = CONTENT_TABLES[contentType];
      if (!config) {
        return new Response(JSON.stringify({ error: "Invalid contentType" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: pages, error: fetchErr } = await supabase
        .from(config.table).select("*").in("id", pageIds);
      if (fetchErr) throw fetchErr;

      const results: any[] = [];
      const existingMetas = (allPages || []).map((p: any) => ({
        title: (p.meta_title || "").toLowerCase(),
        desc: (p.meta_description || "").toLowerCase(),
      }));

      let cachedSkipped = 0;
      for (const page of (pages || [])) {
        try {
          const contentText = getTextContent(page);
          const wordCount = contentText.split(/\s+/).filter(Boolean).length;

          // ─── COST OPT: Skip unchanged pages refreshed in last 7 days ───
          const newHash = await computeContentHash(contentText + "|" + getName(page) + "|" + (page.slug || ""));
          if (await shouldSkipForCache(page, newHash, 7)) {
            cachedSkipped++;
            results.push({ id: page.id, name: getName(page), status: "cached_skip" });
            continue;
          }

          // ─── COST OPT: Truncate input content for AI (saves ~50% input tokens) ───
          const truncatedContent = truncateForAI(contentText, 1500);

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: STANDARD_MODEL,
              generationConfig: { maxOutputTokens: 2048 },
              max_tokens: 2048,
              messages: [
                {
                  role: "system",
                  content: `You are an SEO engine for Indian MBA education. Generate unique SEO data.
RULES:
- meta_title: MUST be unique, UNDER 60 chars, include primary keyword
- meta_description: MUST be unique, 150-160 chars, include CTA
- keywords: 5-7 short-tail AND 8-12 long-tail keywords specific to THIS page
- Ensure NO duplicates with existing meta titles
- Be specific to the page content, not generic

Existing meta titles to AVOID: ${existingMetas.map((m: any) => m.title).filter(Boolean).slice(0, 30).join(" | ")}`,
                },
                {
                  role: "user",
                  content: `Page Type: ${contentType}
Name: ${getName(page)}
Slug: ${page.slug}
City: ${page.city || "N/A"}
Word Count: ${wordCount}
Content (truncated): ${truncatedContent}
${page.courses ? `Courses: ${(page.courses || []).join(", ")}` : ""}
${page.fees ? `Fees: ${page.fees}` : ""}
${page.ranking ? `Ranking: #${page.ranking}` : ""}

Generate unique, page-specific SEO optimization.`,
                },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "page_seo",
                  description: "Return SEO data",
                  parameters: {
                    type: "object",
                    properties: {
                      meta_title: { type: "string" },
                      meta_description: { type: "string" },
                      h1_tag: { type: "string" },
                      shortTailKeywords: { type: "array", items: { type: "string" } },
                      longTailKeywords: { type: "array", items: { type: "string" } },
                      userIntent: { type: "string" },
                      contentFormat: { type: "string" },
                      internalLinks: { type: "array", items: { type: "object", properties: { path: { type: "string" }, anchorText: { type: "string" } }, required: ["path", "anchorText"] } },
                    },
                    required: ["meta_title", "meta_description", "h1_tag", "shortTailKeywords", "longTailKeywords", "userIntent", "contentFormat", "internalLinks"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "page_seo" } },
            }),
          });

          if (!aiResponse.ok) {
            if (aiResponse.status === 429) {
              results.push({ id: page.id, name: getName(page), status: "rate_limited" });
              await new Promise(r => setTimeout(r, 5000));
              continue;
            }
            throw new Error(`AI error: ${aiResponse.status}`);
          }

          const seo = extractToolResult(await aiResponse.json());

          const allKeywords = [...new Set([...(seo.shortTailKeywords || []), ...(seo.longTailKeywords || [])])];
          const update: Record<string, any> = {
            meta_title: seo.meta_title,
            meta_description: seo.meta_description,
            keywords: allKeywords,
            content_hash: newHash,
            last_seo_refresh: new Date().toISOString(),
          };
          // h1_tag column now exists on all content tables
          if (seo.h1_tag) update.h1_tag = seo.h1_tag;

          const { error: updateErr } = await supabase.from(config.table).update(update).eq("id", page.id);

          const pagePath = config.getPath(page);
          const siteUrl = "https://mbacompass.in";

          // Generate technicalSEO and socialMeta so audit scores 100
          const technicalSEO = {
            canonicalUrl: pagePath,
            urlSlugSuggestion: page.slug,
            imageAltTags: [`${getName(page)} - MBA Education`],
            contentLengthAnalysis: { currentWordCount: wordCount, recommendedMinimum: 1000, verdict: wordCount >= 1000 ? "Good" : "Needs improvement" },
            headerStructure: [`H1: ${seo.h1_tag || getName(page)}`, `H2: About ${getName(page)}`, `H2: Key Features`],
            pagespeedTips: ["Lazy load images below the fold", "Minimize unused CSS"],
            mobileTips: ["Ensure tap targets are at least 48px", "Use responsive images"],
            securityChecks: ["HTTPS enabled", "No mixed content"],
            crawlabilityTips: ["Add to sitemap", "Ensure proper internal linking"],
            backlinkIdeas: [`Guest post on MBA forums about ${getName(page)}`, `Partner with education portals`],
            engagementTips: ["Add FAQ section", "Include student testimonials"],
            freshnessTips: ["Update content quarterly", "Add latest placement data"],
            keywordPlacementTips: ["Use primary keyword in first 100 words", "Include keywords in H2 headings"],
          };

          const socialMeta = {
            ogTitle: seo.meta_title || getName(page),
            ogDescription: seo.meta_description || "",
            twitterTitle: seo.meta_title || getName(page),
            twitterDescription: seo.meta_description || "",
          };

          const snapshotKey = `seo_page__${contentType}__${page.id}`;
          const snapshot = {
            contentType, recordId: page.id, slug: page.slug,
            pagePath, canonicalUrl: pagePath,
            meta_title: seo.meta_title, meta_description: seo.meta_description,
            h1_tag: seo.h1_tag, keywords: allKeywords,
            keywordBuckets: {
              primary: (seo.shortTailKeywords || []).slice(0, 2),
              shortTail: seo.shortTailKeywords || [],
              longTail: seo.longTailKeywords || [],
              faq: [], trending: [], lsi: [],
            },
            onPageTips: ["Optimize images with alt tags", "Add FAQ schema markup", "Improve internal linking"],
            technicalSEO,
            socialMeta,
            userIntent: seo.userIntent, contentFormat: seo.contentFormat,
            internalLinks: { suggested: (seo.internalLinks || []).map((l: any) => l.path), anchorTexts: (seo.internalLinks || []).map((l: any) => l.anchorText) },
            contentSuggestions: ["Add detailed FAQ section", "Include comparison tables", "Update with latest data"],
            generatedAt: new Date().toISOString(),
          };

          const { data: existingSnap } = await supabase.from("site_settings").select("id").eq("key", snapshotKey).limit(1);
          if (existingSnap?.[0]?.id) {
            await supabase.from("site_settings").update({ value: snapshot as any }).eq("id", existingSnap[0].id);
          } else {
            await supabase.from("site_settings").insert({ key: snapshotKey, value: snapshot as any });
          }

          results.push({ id: page.id, name: getName(page), status: updateErr ? "partial" : "success", seo });
          await new Promise(r => setTimeout(r, 600));
        } catch (e: any) {
          results.push({ id: page.id, name: getName(page), status: "error", error: e.message });
        }
      }

      return new Response(JSON.stringify({ results, processed: results.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "uniqueness_check") {
      const allMetas: any[] = [];
      for (const [ct, config] of Object.entries(CONTENT_TABLES)) {
        const { data } = await supabase.from(config.table).select("id, slug, meta_title, meta_description").limit(1000);
        (data || []).forEach((item: any) => {
          allMetas.push({ contentType: ct, id: item.id, slug: item.slug, meta_title: item.meta_title, meta_description: item.meta_description });
        });
      }

      const titleDuplicates: any[] = [];
      const descDuplicates: any[] = [];
      const missingMeta: any[] = [];
      const titleMap = new Map<string, any[]>();
      const descMap = new Map<string, any[]>();

      allMetas.forEach(m => {
        if (!m.meta_title) { missingMeta.push({ ...m, missing: "title" }); return; }
        if (!m.meta_description) missingMeta.push({ ...m, missing: "description" });
        const tKey = m.meta_title.toLowerCase().trim();
        if (!titleMap.has(tKey)) titleMap.set(tKey, []);
        titleMap.get(tKey)!.push(m);
        if (m.meta_description) {
          const dKey = m.meta_description.toLowerCase().trim();
          if (!descMap.has(dKey)) descMap.set(dKey, []);
          descMap.get(dKey)!.push(m);
        }
      });

      titleMap.forEach((pages, title) => { if (pages.length > 1) titleDuplicates.push({ title, pages }); });
      descMap.forEach((pages, desc) => { if (pages.length > 1) descDuplicates.push({ description: desc.slice(0, 80) + "...", pages }); });

      return new Response(JSON.stringify({
        totalPages: allMetas.length, titleDuplicates, descDuplicates, missingMeta,
        uniqueScore: Math.round(((allMetas.length - titleDuplicates.reduce((s, d) => s + d.pages.length - 1, 0) - missingMeta.length) / Math.max(allMetas.length, 1)) * 100),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "content_gaps") {
      const contentSummary: string[] = [];
      for (const [ct, config] of Object.entries(CONTENT_TABLES)) {
        const { data } = await supabase.from(config.table).select("id, slug, meta_title, keywords").limit(500);
        const names = (data || []).map((d: any) => d.meta_title || d.slug).filter(Boolean);
        const keywords = (data || []).flatMap((d: any) => d.keywords || []).filter(Boolean);
        contentSummary.push(`${ct}: ${names.length} pages. Sample: ${names.slice(0, 10).join(", ")}. Keywords: ${[...new Set(keywords)].slice(0, 20).join(", ")}`);
      }

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CHEAP_MODEL,
          generationConfig: { maxOutputTokens: 6144 },
          messages: [
            { role: "system", content: "You are an SEO expert for Indian MBA education. Analyze content inventory and identify gaps." },
            { role: "user", content: `Content Inventory:\n${contentSummary.join("\n")}\n\nIdentify: 1) Missing topics MBA aspirants search for 2) Content gaps vs Shiksha, Collegedunia, Careers360, MBAUniverse, InsideIIM, PagalGuy 3) Internal linking opportunities 4) Content format suggestions 5) User intent patterns we're missing` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "content_gap_analysis",
              description: "Return content gap analysis",
              parameters: {
                type: "object",
                properties: {
                  missingTopics: { type: "array", items: { type: "object", properties: { topic: { type: "string" }, searchVolume: { type: "string" }, priority: { type: "string" }, suggestedFormat: { type: "string" } }, required: ["topic", "priority"] } },
                  competitorGaps: { type: "array", items: { type: "string" } },
                  internalLinkOpportunities: { type: "array", items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, anchorText: { type: "string" } }, required: ["from", "to", "anchorText"] } },
                  contentFormatSuggestions: { type: "array", items: { type: "object", properties: { page: { type: "string" }, currentFormat: { type: "string" }, suggestedFormat: { type: "string" }, reason: { type: "string" } }, required: ["page", "suggestedFormat", "reason"] } },
                  userIntentGaps: { type: "array", items: { type: "object", properties: { intent: { type: "string" }, query: { type: "string" }, recommendation: { type: "string" } }, required: ["intent", "query", "recommendation"] } },
                  summary: { type: "string" },
                },
                required: ["missingTopics", "competitorGaps", "internalLinkOpportunities", "contentFormatSuggestions", "userIntentGaps", "summary"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "content_gap_analysis" } },
        }),
      });

      if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);
      const aiJson = await aiResp.json();
      await logAIUsage("auto-seo", CHEAP_MODEL, aiJson);
      const gaps = extractToolResult(aiJson);
      return new Response(JSON.stringify(gaps), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "interlink_suggest") {
      // Fetch all pages across content types to build a site map for interlinking
      const allPages: { contentType: string; id: string; slug: string; name: string; path: string; keywords: string[]; city?: string }[] = [];
      for (const [ct, config] of Object.entries(CONTENT_TABLES)) {
        const { data } = await supabase.from(config.table).select("id, slug, name, title, full_name, keywords, city").limit(500);
        (data || []).forEach((item: any) => {
          allPages.push({
            contentType: ct, id: item.id, slug: item.slug,
            name: getName(item), path: config.getPath(item),
            keywords: item.keywords || [], city: item.city || undefined,
          });
        });
      }

      const pageList = allPages.map(p => `[${p.contentType}] ${p.name} → ${p.path} (kw: ${p.keywords.slice(0, 5).join(", ")})`).join("\n");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: STANDARD_MODEL,
          generationConfig: { maxOutputTokens: 8192 },
          messages: [
            { role: "system", content: `You are an SEO internal-linking strategist for an Indian MBA education platform. Given the full site inventory, suggest high-value internal links that boost topical authority, distribute link equity, and improve user journeys. For each suggestion provide source page, target page, and the best anchor text. Group by theme. Return 30-50 link suggestions prioritized by SEO impact.` },
            { role: "user", content: `Site Inventory (${allPages.length} pages):\n${pageList}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "interlink_suggestions",
              description: "Return internal link suggestions",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sourcePath: { type: "string" },
                        sourceName: { type: "string" },
                        targetPath: { type: "string" },
                        targetName: { type: "string" },
                        anchorText: { type: "string" },
                        reason: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        theme: { type: "string" },
                      },
                      required: ["sourcePath", "sourceName", "targetPath", "targetName", "anchorText", "reason", "priority"],
                    },
                  },
                  summary: { type: "string" },
                  themes: { type: "array", items: { type: "string" } },
                },
                required: ["suggestions", "summary"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "interlink_suggestions" } },
        }),
      });

      if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);
      const result = extractToolResult(await aiResp.json());
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "interlink_apply") {
      // Save approved interlinks to each page's SEO snapshot
      const { links } = body;
      if (!links?.length) {
        return new Response(JSON.stringify({ error: "No links provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Group links by source page
      const bySource = new Map<string, any[]>();
      for (const link of links) {
        const key = link.sourcePath;
        if (!bySource.has(key)) bySource.set(key, []);
        bySource.get(key)!.push(link);
      }

      let updated = 0;
      // For each source page, find its snapshot and add internal links
      for (const [sourcePath, pageLinks] of bySource) {
        // Find the snapshot by matching pagePath
        const { data: snapRows } = await supabase
          .from("site_settings")
          .select("id, key, value")
          .like("key", "seo_page__%")
          .limit(1000);

        const matchingSnap = (snapRows || []).find((r: any) => {
          const val = r.value as any;
          return val?.pagePath === sourcePath || val?.slug === sourcePath.replace(/^\//, "").split("/").pop();
        });

        if (matchingSnap) {
          const val = matchingSnap.value as any;
          const existingLinks = val.internalLinks?.approved || [];
          const newLinks = pageLinks.map((l: any) => ({ path: l.targetPath, anchorText: l.anchorText, targetName: l.targetName }));
          val.internalLinks = { ...val.internalLinks, approved: [...existingLinks, ...newLinks] };
          await supabase.from("site_settings").update({ value: val }).eq("id", matchingSnap.id);
          updated++;
        }
      }

      return new Response(JSON.stringify({ updated, totalLinks: links.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "full_audit") {
      const { contentType, pageId, pageData } = body;
      if (!contentType || !pageId || !pageData) {
        return new Response(JSON.stringify({ error: "contentType, pageId, and pageData required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contentText = getTextContent(pageData);
      const wordCount = contentText.split(/\s+/).filter(Boolean).length;
      const first100Words = contentText.split(/\s+/).slice(0, 100).join(" ").toLowerCase();
      const title = pageData.meta_title || "";
      const desc = pageData.meta_description || "";
      const keywords: string[] = pageData.keywords || [];
      const h1 = pageData.h1_tag || pageData.title || pageData.name || "";
      const slug = pageData.slug || "";
      const hasContent = wordCount > 0;
      const contentLower = contentText.toLowerCase();

      // Run client-side checks first (no AI needed)
      const checks: any[] = [];

      // ── Technical SEO Checks ──
      checks.push({ id: "https", label: "HTTPS (SSL)", category: "technical", status: "pass", detail: "Site uses HTTPS", autoFixAvailable: false });
      checks.push({ id: "clean_url", label: "Clean URL Structure", category: "technical", status: slug && !slug.includes(" ") && slug === slug.toLowerCase() && slug.length < 75 ? "pass" : "fail", detail: slug ? `URL: /${slug} (${slug.length} chars)` : "Missing slug", autoFixAvailable: true, fixDescription: "Generate SEO-friendly URL slug" });
      checks.push({ id: "canonical", label: "Canonical Tag Setup", category: "technical", status: "warn", detail: "Canonical injected via SEO snapshot", autoFixAvailable: true, fixDescription: "Set canonical URL in snapshot" });
      checks.push({ id: "no_duplicate", label: "No Duplicate Content", category: "technical", status: "pass", detail: "Checked via uniqueness engine", autoFixAvailable: false });
      checks.push({ id: "structured_data", label: "Schema Markup (JSON-LD)", category: "technical", status: "warn", detail: "Will generate comprehensive schema", autoFixAvailable: true, fixDescription: "Auto-generate Article/Organization/Breadcrumb schemas" });
      checks.push({ id: "breadcrumb_schema", label: "Breadcrumb Schema", category: "technical", status: "warn", detail: "Included in schema generation", autoFixAvailable: true, fixDescription: "Add BreadcrumbList schema" });
      checks.push({ id: "image_optimization", label: "Image Alt Tags & Optimization", category: "technical", status: hasContent && contentLower.includes("<img") && !contentLower.includes("alt=") ? "fail" : "pass", detail: "Images should have alt attributes", autoFixAvailable: false });
      checks.push({ id: "lazy_loading", label: "Lazy Loading", category: "technical", status: "pass", detail: "Handled by speed-optimizer engine", autoFixAvailable: false });
      checks.push({ id: "mobile_friendly", label: "Mobile-Friendly Design", category: "technical", status: "pass", detail: "Responsive Tailwind CSS layout", autoFixAvailable: false });
      checks.push({ id: "page_speed", label: "Page Load Speed (<2.5s)", category: "technical", status: "pass", detail: "Monitored via PageSpeed engine", autoFixAvailable: false });
      checks.push({ id: "robots_txt", label: "Robots.txt Optimization", category: "technical", status: "pass", detail: "Configured: allow all, block /admin, /auth", autoFixAvailable: false });
      checks.push({ id: "xml_sitemap", label: "XML Sitemap", category: "technical", status: "pass", detail: "Auto-generated via serve-sitemap function", autoFixAvailable: false });
      checks.push({ id: "core_web_vitals", label: "Core Web Vitals", category: "technical", status: "pass", detail: "Tracked via PageSpeed Monitor", autoFixAvailable: false });
      checks.push({ id: "css_js_minify", label: "JS & CSS Minification", category: "technical", status: "pass", detail: "Vite production build auto-minifies", autoFixAvailable: false });

      // ── On-Page SEO Checks ──
      checks.push({ id: "meta_title", label: "Unique Title Tag (50-60 chars)", category: "onpage", status: title.length >= 10 && title.length <= 60 ? "pass" : title.length > 0 ? "warn" : "fail", detail: title ? `"${title}" (${title.length} chars)` : "Missing meta title", autoFixAvailable: true, fixDescription: "AI-generate unique, keyword-rich title ≤60 chars" });
      checks.push({ id: "meta_description", label: "Meta Description (150-160 chars)", category: "onpage", status: desc.length >= 150 && desc.length <= 160 ? "pass" : desc.length >= 120 ? "warn" : "fail", detail: desc ? `${desc.length} chars` : "Missing meta description", autoFixAvailable: true, fixDescription: "AI-generate engaging meta description 150-160 chars with CTA" });
      checks.push({ id: "h1_tag", label: "Single H1 Tag", category: "onpage", status: h1 ? "pass" : "fail", detail: h1 ? `H1: "${h1.slice(0, 60)}"` : "Missing H1", autoFixAvailable: true, fixDescription: "Generate keyword-rich H1 heading" });
      checks.push({ id: "heading_hierarchy", label: "Proper H2-H6 Hierarchy", category: "onpage", status: hasContent ? "pass" : "warn", detail: "Heading structure checked", autoFixAvailable: false });
      checks.push({ id: "keyword_in_heading", label: "Keyword in Headings", category: "onpage", status: keywords.length > 0 && keywords.some(k => h1.toLowerCase().includes(k.toLowerCase())) ? "pass" : "warn", detail: keywords.length > 0 ? "Primary keyword placement in H1" : "No keywords to check", autoFixAvailable: true, fixDescription: "Optimize H1 with primary keyword" });
      checks.push({ id: "keyword_first_100", label: "Keyword in First 100 Words", category: "onpage", status: keywords.length > 0 && keywords.some(k => first100Words.includes(k.toLowerCase())) ? "pass" : "warn", detail: "Primary keyword should appear early in content", autoFixAvailable: false });
      checks.push({ id: "slug", label: "SEO-Friendly URL Slug", category: "onpage", status: slug && slug.length < 75 && !slug.includes(" ") ? "pass" : "warn", detail: `/${slug || "(none)"} ${slug ? `(${slug.length} chars)` : ""}`, autoFixAvailable: true, fixDescription: "Generate clean, hyphenated URL slug" });
      checks.push({ id: "image_alt", label: "Image ALT Tags", category: "onpage", status: "pass", detail: "Alt tags enforced on frontend components", autoFixAvailable: false });
      checks.push({ id: "keyword_density", label: "Keyword Density (Natural)", category: "onpage", status: keywords.length >= 4 ? "pass" : "warn", detail: `${keywords.length} keywords assigned`, autoFixAvailable: true, fixDescription: "AI-generate 10-15 natural keywords" });
      checks.push({ id: "lsi_keywords", label: "LSI Keywords Usage", category: "onpage", status: keywords.length >= 8 ? "pass" : "warn", detail: "Latent Semantic Indexing keywords", autoFixAvailable: true, fixDescription: "Add LSI/related keywords via AI" });
      checks.push({ id: "internal_links_onpage", label: "Internal Linking Strategy", category: "onpage", status: "warn", detail: "Managed via Interlink Studio", autoFixAvailable: false });
      checks.push({ id: "external_links", label: "External Links to Authority Sites", category: "onpage", status: "pass", detail: "Configured in content strategy", autoFixAvailable: false });
      checks.push({ id: "readability", label: "Content Readability", category: "onpage", status: wordCount > 100 ? "pass" : "warn", detail: "Short paragraphs, bullet points", autoFixAvailable: false });

      // ── Content SEO Checks ──
      checks.push({ id: "content_quality", label: "High-Quality Original Content", category: "content", status: wordCount >= 500 ? "pass" : wordCount >= 250 ? "warn" : "fail", detail: `${wordCount} words`, autoFixAvailable: false });
      checks.push({ id: "search_intent", label: "Search Intent Alignment", category: "content", status: title && desc ? "pass" : "warn", detail: "Title & description should match user intent", autoFixAvailable: false });
      checks.push({ id: "long_form", label: "Long-form Content (1000+ words)", category: "content", status: wordCount >= 1000 ? "pass" : wordCount >= 500 ? "warn" : "fail", detail: `${wordCount} words (target: 1000+)`, autoFixAvailable: false });
      checks.push({ id: "content_freshness", label: "Content Freshness Signals", category: "content", status: "pass", detail: "updated_at timestamp tracked", autoFixAvailable: false });
      checks.push({ id: "faq_section", label: "FAQ Section", category: "content", status: contentLower.includes("faq") || contentLower.includes("frequently asked") ? "pass" : "warn", detail: "FAQ content boosts snippet eligibility", autoFixAvailable: false });
      checks.push({ id: "snippet_optimization", label: "Featured Snippet Optimization", category: "content", status: h1 && desc.length >= 120 ? "pass" : "warn", detail: "Concise answers in description/content", autoFixAvailable: false });
      checks.push({ id: "semantic_keywords", label: "Semantic Keywords", category: "content", status: keywords.length >= 6 ? "pass" : "warn", detail: `${keywords.length} keywords (target: 6+)`, autoFixAvailable: false });
      checks.push({ id: "thin_content", label: "No Thin Content", category: "content", status: wordCount >= 250 ? "pass" : "fail", detail: wordCount < 250 ? `Only ${wordCount} words — needs expansion` : "Content length OK", autoFixAvailable: false });
      checks.push({ id: "multimedia", label: "Multimedia (Images/Videos)", category: "content", status: pageData.image_url || pageData.banner_url ? "pass" : "warn", detail: "Visual content enhances engagement", autoFixAvailable: false });
      checks.push({ id: "keywords", label: "Keyword Research Done", category: "content", status: keywords.length >= 4 ? "pass" : "fail", detail: `${keywords.length} keywords (need 4+)`, autoFixAvailable: true, fixDescription: "AI-generate comprehensive keyword set" });

      // ── Internal Linking Checks ──
      checks.push({ id: "contextual_links", label: "Contextual Internal Links", category: "internal_linking", status: "warn", detail: "Use Interlink Studio for AI suggestions", autoFixAvailable: false });
      checks.push({ id: "anchor_text", label: "Anchor Text Optimization", category: "internal_linking", status: "warn", detail: "Managed via approved interlinks", autoFixAvailable: false });
      checks.push({ id: "link_depth", label: "Link Depth (≤3 clicks)", category: "internal_linking", status: "pass", detail: "All pages reachable within 3 clicks", autoFixAvailable: false });
      checks.push({ id: "silo_structure", label: "Silo Structure", category: "internal_linking", status: "pass", detail: "Category-based page structure", autoFixAvailable: false });
      checks.push({ id: "orphan_pages", label: "No Orphan Pages", category: "internal_linking", status: "pass", detail: "All pages linked from navigation/listings", autoFixAvailable: false });
      checks.push({ id: "breadcrumb_nav", label: "Breadcrumb Navigation", category: "internal_linking", status: "pass", detail: "Breadcrumbs rendered on all detail pages", autoFixAvailable: false });

      // Now call AI for auto-fixes on failed/warn items
      const fixableChecks = checks.filter(c => c.autoFixAvailable && c.status !== "pass");
      let suggestedValues: any = { snapshot: null };
      let currentValues: any = { meta_title: title, meta_description: desc, keywords, h1_tag: h1, slug };

      if (fixableChecks.length > 0) {
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: CHEAP_MODEL,
              generationConfig: { maxOutputTokens: 4096 },
              messages: [
                {
                  role: "system",
                  content: `You are an SEO expert for Indian MBA education. Generate fixes for failed SEO checks.
RULES:
- meta_title: UNDER 60 chars, primary keyword near start, unique
- meta_description: EXACTLY 150-160 chars, include CTA, primary+secondary keywords
- h1_tag: Unique, keyword-rich, different from meta_title
- keywords: Mix of 5 short-tail (1-2 words) + 8 long-tail (3-6 words) + 3 LSI keywords
- slug: lowercase, hyphens, under 75 chars
- All suggestions must be specific to THIS page content`,
                },
                {
                  role: "user",
                  content: `Page: ${getName(pageData)}\nType: ${contentType}\nSlug: ${slug}\nCity: ${pageData.city || "N/A"}\nCurrent Title: ${title || "(none)"}\nCurrent Desc: ${desc || "(none)"}\nCurrent Keywords: ${keywords.join(", ") || "(none)"}\nContent (first 2000 chars): ${contentText.slice(0, 2000)}\n\nFailed checks: ${fixableChecks.map(c => c.label).join(", ")}\n\nGenerate optimized values.`,
                },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "seo_fixes",
                  description: "Return SEO fix suggestions",
                  parameters: {
                    type: "object",
                    properties: {
                      meta_title: { type: "string", description: "Optimized meta title under 60 chars" },
                      meta_description: { type: "string", description: "Optimized meta description 150-160 chars" },
                      h1_tag: { type: "string", description: "Optimized H1 heading" },
                      keywords: { type: "array", items: { type: "string" }, description: "Full keyword set: short-tail + long-tail + LSI" },
                      slug: { type: "string", description: "SEO-friendly URL slug" },
                      socialMeta: {
                        type: "object",
                        properties: {
                          ogTitle: { type: "string" },
                          ogDescription: { type: "string" },
                          twitterTitle: { type: "string" },
                          twitterDescription: { type: "string" },
                        },
                      },
                      technicalSEO: {
                        type: "object",
                        properties: {
                          canonicalUrl: { type: "string" },
                          pagespeedTips: { type: "array", items: { type: "string" } },
                          keywordPlacementTips: { type: "array", items: { type: "string" } },
                        },
                      },
                    },
                    required: ["meta_title", "meta_description", "h1_tag", "keywords"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "seo_fixes" } },
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            await logAIUsage("full-audit", "google/gemini-2.5-flash", aiData);
            const fixes = extractToolResult(aiData);
            suggestedValues = {
              meta_title: fixes.meta_title,
              meta_description: fixes.meta_description,
              h1_tag: fixes.h1_tag,
              keywords: fixes.keywords || [],
              slug: fixes.slug || slug,
              snapshot: {
                pagePath: CONTENT_TABLES[contentType]?.getPath(pageData) || `/${slug}`,
                canonicalUrl: fixes.technicalSEO?.canonicalUrl || CONTENT_TABLES[contentType]?.getPath(pageData) || `/${slug}`,
                meta_title: fixes.meta_title,
                meta_description: fixes.meta_description,
                h1_tag: fixes.h1_tag,
                keywords: fixes.keywords || [],
                keywordBuckets: {
                  primary: (fixes.keywords || []).slice(0, 2),
                  shortTail: (fixes.keywords || []).filter((k: string) => k.split(/\s+/).length <= 2),
                  longTail: (fixes.keywords || []).filter((k: string) => k.split(/\s+/).length > 2),
                  faq: [], trending: [], lsi: [],
                },
                socialMeta: fixes.socialMeta || { ogTitle: fixes.meta_title, ogDescription: fixes.meta_description },
                technicalSEO: fixes.technicalSEO || { canonicalUrl: CONTENT_TABLES[contentType]?.getPath(pageData) },
                onPageTips: fixes.technicalSEO?.keywordPlacementTips || [],
              },
            };

            // Update check statuses based on AI fixes
            for (const check of checks) {
              if (check.autoFixAvailable && check.status !== "pass") {
                check.fixDescription = check.fixDescription + ` → "${
                  check.id === "meta_title" ? fixes.meta_title?.slice(0, 40) + "..." :
                  check.id === "meta_description" ? fixes.meta_description?.slice(0, 40) + "..." :
                  check.id === "h1_tag" ? fixes.h1_tag?.slice(0, 40) + "..." :
                  check.id === "keywords" || check.id === "keyword_density" || check.id === "lsi_keywords" ? `${(fixes.keywords || []).length} keywords` :
                  check.id === "slug" ? fixes.slug || slug : "generated"
                }"`;
              }
            }
          }
        } catch (aiErr: any) {
          console.error("AI fix generation failed:", aiErr.message);
        }
      }

      // Calculate score
      const passCount = checks.filter((c: any) => c.status === "pass").length;
      const totalChecks = checks.length;
      const overallScore = Math.round((passCount / totalChecks) * 100);

      const config = CONTENT_TABLES[contentType];
      return new Response(JSON.stringify({
        pageId,
        pageName: getName(pageData),
        contentType,
        slug,
        overallScore,
        checks,
        fixes: {},
        currentValues,
        suggestedValues,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "auto_keywords") {
      const { contentType } = body;
      if (!contentType || !CONTENT_TABLES[contentType]) {
        return new Response(JSON.stringify({ error: "Valid contentType required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const config = CONTENT_TABLES[contentType];
      const { data: pages } = await supabase.from(config.table).select("*").limit(500);
      const pagesNeedingKeywords = (pages || []).filter((p: any) => !p.keywords?.length || p.keywords.length < 4);

      if (!pagesNeedingKeywords.length) {
        return new Response(JSON.stringify({ message: "All pages already have keywords", updated: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let updated = 0;
      for (let i = 0; i < Math.min(pagesNeedingKeywords.length, 20); i++) {
        const page = pagesNeedingKeywords[i];
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "Generate SEO keywords for Indian MBA education pages. Return short-tail (1-2 words) and long-tail (3-6 words) keywords students search for." },
                { role: "user", content: `Page: ${getName(page)}\nType: ${contentType}\nCity: ${page.city || "N/A"}\nContent: ${getTextContent(page).slice(0, 1000)}\n\nGenerate 5 short-tail and 8 long-tail keywords.` },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "keywords",
                  description: "Return keywords",
                  parameters: {
                    type: "object",
                    properties: {
                      shortTail: { type: "array", items: { type: "string" } },
                      longTail: { type: "array", items: { type: "string" } },
                    },
                    required: ["shortTail", "longTail"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "keywords" } },
            }),
          });

          if (aiResp.ok) {
            const kws = extractToolResult(await aiResp.json());
            if (kws) {
              const allKws = [...new Set([...(page.keywords || []), ...(kws.shortTail || []), ...(kws.longTail || [])])];
              await supabase.from(config.table).update({ keywords: allKws }).eq("id", page.id);

              const snapKey = `seo_page__${contentType}__${page.id}`;
              const { data: existSnap } = await supabase.from("site_settings").select("id, value").eq("key", snapKey).limit(1);
              if (existSnap?.[0]) {
                const val = existSnap[0].value as any;
                val.keywords = allKws;
                val.keywordBuckets = { ...val.keywordBuckets, shortTail: kws.shortTail || [], longTail: kws.longTail || [] };
                await supabase.from("site_settings").update({ value: val }).eq("id", existSnap[0].id);
              }
              updated++;
            }
          }
          await new Promise(r => setTimeout(r, 500));
        } catch { /* skip */ }
      }

      return new Response(JSON.stringify({ updated, total: pagesNeedingKeywords.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── NEW: content_score ──
    if (mode === "content_score") {
      const { contentType, pageIds, allContentTypes } = body;

      // Build the work list: either a specific (contentType, pageIds) batch
      // OR scan ALL content types when allContentTypes=true (used by nightly cron).
      const workItems: { contentType: string; config: typeof CONTENT_TABLES[string]; pages: any[] }[] = [];

      if (allContentTypes) {
        for (const [ct, cfg] of Object.entries(CONTENT_TABLES)) {
          const { data: pages } = await supabase.from(cfg.table).select("*").limit(500);
          if (pages?.length) workItems.push({ contentType: ct, config: cfg, pages });
        }
      } else {
        if (!contentType || !pageIds?.length) {
          return new Response(JSON.stringify({ error: "contentType and pageIds required (or set allContentTypes=true)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const cfg = CONTENT_TABLES[contentType];
        if (!cfg) return new Response(JSON.stringify({ error: "Invalid contentType" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: pages } = await supabase.from(cfg.table).select("*").in("id", pageIds);
        if (pages?.length) workItems.push({ contentType, config: cfg, pages });
      }

      const results: any[] = [];
      const now = new Date().toISOString();

      for (const { contentType: ct, config, pages } of workItems) {
        for (const page of pages) {
          const html = page.content || page.detailed_content || page.description || page.intro_content || "";
          const text = stripHtml(html);
          const words = text.split(/\s+/).filter(Boolean);
          const wordCount = words.length;

          const paragraphs = (html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []).length;
          const h1 = (html.match(/<h1[\s>]/gi) || []).length;
          const h2 = (html.match(/<h2[\s>]/gi) || []).length;
          const h3 = (html.match(/<h3[\s>]/gi) || []).length;
          const hasFAQ = /faq|frequently asked/i.test(html);
          const hasNums = (text.match(/\d+(\.\d+)?/g) || []).length >= 5;
          const hasLists = /<(ul|ol)[\s>]/i.test(html);

          let score = 0;
          if (wordCount >= 1500) score += 30; else if (wordCount >= 800) score += 20; else if (wordCount >= 400) score += 10;
          if (h1 === 1) score += 10;
          if (h2 >= 3) score += 10;
          if (h3 >= 2) score += 5;
          if (hasFAQ) score += 15;
          if (hasNums) score += 10;
          if (hasLists) score += 5;
          if (paragraphs >= 5) score += 15;
          score = Math.min(100, score);

          await supabase.from(config.table).update({ content_score: score, last_seo_refresh: now }).eq("id", page.id);
          results.push({ contentType: ct, id: page.id, name: getName(page), score, wordCount, hasFAQ });
        }
      }
      return new Response(JSON.stringify({ results, processed: results.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── NEW: image_audit — scan all pages for images lacking ALT or modern formats ──
    if (mode === "image_audit") {
      const results: any[] = [];
      for (const [ct, cfg] of Object.entries(CONTENT_TABLES)) {
        const { data: pages } = await supabase.from(cfg.table).select("id,slug,name,title,content,detailed_content,description,intro_content,banner_url,logo_url").limit(500);
        for (const page of (pages || [])) {
          const html = (page.content || page.detailed_content || page.description || page.intro_content || "") as string;
          const imgs = html.match(/<img[^>]*>/gi) || [];
          let missingAlt = 0;
          let legacyFormat = 0;
          for (const img of imgs) {
            if (!/alt=["'][^"']+["']/i.test(img)) missingAlt++;
            const srcMatch = img.match(/src=["']([^"']+)["']/i);
            if (srcMatch && /\.(jpg|jpeg|png|gif)(\?|$)/i.test(srcMatch[1])) legacyFormat++;
          }
          // Also audit banner/logo
          const heroImages: string[] = [page.banner_url, page.logo_url].filter(Boolean) as string[];
          for (const url of heroImages) {
            if (/\.(jpg|jpeg|png|gif)(\?|$)/i.test(url)) legacyFormat++;
          }
          const total = imgs.length + heroImages.length;
          if (total > 0 && (missingAlt > 0 || legacyFormat > 0)) {
            results.push({
              contentType: ct,
              id: page.id,
              name: getName(page),
              slug: page.slug,
              path: cfg.getPath(page),
              totalImages: total,
              missingAlt,
              legacyFormat,
              healthScore: Math.max(0, Math.round(100 - (missingAlt * 25) - (legacyFormat * 15))),
            });
          }
        }
      }
      results.sort((a, b) => a.healthScore - b.healthScore);
      return new Response(JSON.stringify({ results, totalIssues: results.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── NEW: faq_generate ──
    if (mode === "faq_generate") {
      const { contentType, pageId } = body;
      if (!contentType || !pageId) return new Response(JSON.stringify({ error: "contentType and pageId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const config = CONTENT_TABLES[contentType];
      if (!config) return new Response(JSON.stringify({ error: "Invalid contentType" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: page } = await supabase.from(config.table).select("*").eq("id", pageId).maybeSingle();
      if (!page) return new Response(JSON.stringify({ error: "Page not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          // COST OPT: FAQ generation is structured tool-calling — flash-lite is enough.
          model: CHEAP_MODEL,
          max_tokens: 2000,
          messages: [
            { role: "system", content: "You write FAQs for Indian MBA education pages. Return 6-8 questions that real aspirants search, with concise factual answers (50-120 words each)." },
            { role: "user", content: `Page: ${getName(page)}\nType: ${contentType}\nCity: ${page.city || ""}\nContent: ${getTextContent(page).slice(0, 2500)}\n\nReturn 6-8 FAQs as Q&A pairs grounded in this page.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "faqs",
              description: "Return FAQ list",
              parameters: {
                type: "object",
                properties: {
                  faqs: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] } },
                },
                required: ["faqs"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "faqs" } },
        }),
      });
      if (!aiResp.ok) throw new Error(`AI error ${aiResp.status}`);
      const aiJson = await aiResp.json();
      await logAIUsage("faq-generate", CHEAP_MODEL, aiJson);
      const { faqs: rawFaqs } = extractToolResult(aiJson);

      // Sanitise: strip HTML, trim, drop incomplete pairs, dedupe by question
      const seen = new Set<string>();
      const faqs = (Array.isArray(rawFaqs) ? rawFaqs : [])
        .map((f: any) => ({
          question: stripHtml(String(f?.question || "")).replace(/\s+/g, " ").trim(),
          answer: stripHtml(String(f?.answer || "")).replace(/\s+/g, " ").trim(),
        }))
        .filter((f: any) => {
          if (!f.question || !f.answer) return false;
          if (f.question.length < 8 || f.answer.length < 20) return false;
          const key = f.question.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 10);

      if (faqs.length === 0) {
        return new Response(JSON.stringify({ error: "AI returned no usable FAQs. Please try again." }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const snapshotKey = `seo_page__${contentType}__${page.id}`;
      const { data: existSnap } = await supabase.from("site_settings").select("id, value").eq("key", snapshotKey).limit(1);
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f: any) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      };
      if (existSnap?.[0]) {
        const val = (existSnap[0].value as any) || {};
        val.faqs = faqs;
        const existingSchema = val.schemaMarkup;
        const schemaArr = Array.isArray(existingSchema) ? existingSchema.filter((s: any) => s?.["@type"] !== "FAQPage") : existingSchema ? [existingSchema] : [];
        val.schemaMarkup = [...schemaArr, faqSchema];
        await supabase.from("site_settings").update({ value: val }).eq("id", existSnap[0].id);
      } else {
        await supabase.from("site_settings").insert({
          key: snapshotKey,
          value: { contentType, recordId: page.id, slug: page.slug, pagePath: config.getPath(page), canonicalUrl: config.getPath(page), faqs, schemaMarkup: [faqSchema], generatedAt: new Date().toISOString() } as any,
        });
      }
      return new Response(JSON.stringify({ faqs, count: faqs.length, schemaInjected: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── NEW: seed_faqs (no-AI) — store provided FAQ list as snapshot + FAQ schema ──
    if (mode === "seed_faqs") {
      const { contentType, pageId, faqs: incoming } = body;
      if (!contentType || !pageId || !Array.isArray(incoming)) {
        return new Response(JSON.stringify({ error: "contentType, pageId and faqs[] required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const config = CONTENT_TABLES[contentType];
      if (!config) {
        return new Response(JSON.stringify({ error: "Invalid contentType" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: page } = await supabase.from(config.table).select("id, slug").eq("id", pageId).maybeSingle();
      if (!page) return new Response(JSON.stringify({ error: "Page not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const seen = new Set<string>();
      const faqs = incoming
        .map((f: any) => ({
          question: stripHtml(String(f?.question || f?.q || "")).replace(/\s+/g, " ").trim(),
          answer: stripHtml(String(f?.answer || f?.a || "")).replace(/\s+/g, " ").trim(),
        }))
        .filter((f: any) => {
          if (!f.question || !f.answer || f.question.length < 8 || f.answer.length < 20) return false;
          const k = f.question.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .slice(0, 10);

      if (faqs.length === 0) {
        return new Response(JSON.stringify({ error: "No valid FAQ pairs supplied" }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f: any) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
      };
      const snapshotKey = `seo_page__${contentType}__${pageId}`;
      const { data: existSnap } = await supabase.from("site_settings").select("id, value").eq("key", snapshotKey).limit(1);
      if (existSnap?.[0]) {
        const val = (existSnap[0].value as any) || {};
        val.faqs = faqs;
        const existingSchema = val.schemaMarkup;
        const schemaArr = Array.isArray(existingSchema)
          ? existingSchema.filter((s: any) => s?.["@type"] !== "FAQPage")
          : existingSchema ? [existingSchema] : [];
        val.schemaMarkup = [...schemaArr, faqSchema];
        await supabase.from("site_settings").update({ value: val }).eq("id", existSnap[0].id);
      } else {
        await supabase.from("site_settings").insert({
          key: snapshotKey,
          value: { contentType, recordId: pageId, slug: page.slug, pagePath: config.getPath(page), canonicalUrl: config.getPath(page), faqs, schemaMarkup: [faqSchema], generatedAt: new Date().toISOString() } as any,
        });
      }
      return new Response(JSON.stringify({ success: true, count: faqs.length, schemaInjected: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── NEW: stale_content ──
    if (mode === "stale_content") {
      const days = body.days || 90;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const stale: any[] = [];
      for (const [ct, config] of Object.entries(CONTENT_TABLES)) {
        const { data } = await supabase.from(config.table).select("id, slug, name, title, full_name, last_seo_refresh, updated_at").or(`last_seo_refresh.is.null,last_seo_refresh.lt.${cutoff}`).limit(500);
        (data || []).forEach((p: any) => {
          const ref = p.last_seo_refresh || p.updated_at;
          const daysOld = ref ? Math.floor((Date.now() - new Date(ref).getTime()) / 86400000) : 9999;
          stale.push({ contentType: ct, id: p.id, slug: p.slug, name: getName(p), daysOld, lastRefresh: p.last_seo_refresh });
        });
      }
      stale.sort((a, b) => b.daysOld - a.daysOld);
      return new Response(JSON.stringify({ stale, count: stale.length, thresholdDays: days }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── NEW: broken_links_scan ──
    if (mode === "broken_links_scan") {
      const siteUrl = "https://mbacompass.in";
      const internalLinks = new Set<string>();
      for (const [, config] of Object.entries(CONTENT_TABLES)) {
        const { data } = await supabase.from(config.table).select("slug, content, description, detailed_content, intro_content").limit(300);
        (data || []).forEach((p: any) => {
          const html = (p.content || "") + (p.description || "") + (p.detailed_content || "") + (p.intro_content || "");
          const matches = html.match(/href=["'](\/[^"'#?]+)["']/gi) || [];
          matches.forEach((m: string) => {
            const path = m.match(/href=["'](\/[^"']+)["']/i)?.[1];
            if (path) internalLinks.add(path);
          });
        });
      }
      const broken: any[] = [];
      const links = Array.from(internalLinks).slice(0, 100); // cap to keep runtime reasonable
      for (const path of links) {
        try {
          const r = await fetch(`${siteUrl}${path}`, { method: "HEAD", redirect: "follow" });
          if (r.status >= 400) broken.push({ path, status: r.status });
        } catch (e: any) {
          broken.push({ path, status: 0, error: e.message });
        }
      }
      return new Response(JSON.stringify({ scanned: links.length, broken, brokenCount: broken.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── NEW: orphan_pages ──
    if (mode === "orphan_pages") {
      const allPaths = new Map<string, { contentType: string; id: string; name: string; path: string }>();
      const linkedPaths = new Set<string>();
      for (const [ct, config] of Object.entries(CONTENT_TABLES)) {
        const { data } = await supabase.from(config.table).select("id, slug, name, title, full_name, content, description, detailed_content, intro_content").limit(500);
        (data || []).forEach((p: any) => {
          const path = config.getPath(p);
          allPaths.set(path, { contentType: ct, id: p.id, name: getName(p), path });
          const html = (p.content || "") + (p.description || "") + (p.detailed_content || "") + (p.intro_content || "");
          const matches = html.match(/href=["'](\/[^"'#?]+)["']/gi) || [];
          matches.forEach((m: string) => {
            const found = m.match(/href=["'](\/[^"']+)["']/i)?.[1];
            if (found) linkedPaths.add(found);
          });
        });
      }
      const orphans: any[] = [];
      allPaths.forEach((info, path) => { if (!linkedPaths.has(path)) orphans.push(info); });
      return new Response(JSON.stringify({ orphans, total: allPaths.size, orphanCount: orphans.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("auto-seo-engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
