import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

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
};

function stripHtml(v: string) {
  return v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getTextContent(item: Record<string, any>) {
  return stripHtml(
    item.description || item.content || item.intro_content || item.detailed_content || item.faq_content || item.admission_process || item.eligibility || ""
  );
}

function getName(item: Record<string, any>) {
  return item.title || item.name || item.full_name || "Untitled";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const mode = body.mode || "bulk_optimize"; // bulk_optimize | uniqueness_check | content_gaps | auto_keywords

    if (mode === "bulk_optimize") {
      // Process a batch of pages through AI SEO
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
        .from(config.table)
        .select("*")
        .in("id", pageIds);

      if (fetchErr) throw fetchErr;

      const results: any[] = [];
      const existingMetas = (allPages || []).map((p: any) => ({
        title: (p.meta_title || "").toLowerCase(),
        desc: (p.meta_description || "").toLowerCase(),
      }));

      for (const page of (pages || [])) {
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `You are an SEO engine for Indian MBA education. Generate unique SEO data.
RULES:
- meta_title: MUST be unique, under 60 chars, include primary keyword
- meta_description: MUST be unique, 150-160 chars, include CTA
- keywords: Generate 5-7 short-tail AND 8-12 long-tail keywords relevant to THIS specific page
- Ensure NO duplicates with existing meta titles/descriptions provided
- userIntent: Identify the search intent (informational, navigational, transactional, commercial)
- contentFormat: Suggest best format (FAQ, comparison table, guide, listicle, video)
- internalLinks: Suggest 3-5 internal link paths with anchor text

Existing meta titles to AVOID duplicating: ${existingMetas.map((m: any) => m.title).filter(Boolean).slice(0, 30).join(" | ")}`,
                },
                {
                  role: "user",
                  content: `Page Type: ${contentType}\nPage: ${getName(page)}\nSlug: ${page.slug}\nCity: ${page.city || "N/A"}\nContent: ${getTextContent(page).slice(0, 2000)}\n\nGenerate unique SEO optimization for this page.`,
                },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "page_seo",
                  description: "Return SEO data for this page",
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
                      internalLinks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            path: { type: "string" },
                            anchorText: { type: "string" },
                          },
                          required: ["path", "anchorText"],
                        },
                      },
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

          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          let seo: any;
          if (toolCall?.function?.arguments) {
            seo = typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
          } else {
            const content = aiData.choices?.[0]?.message?.content || "";
            const match = content.match(/\{[\s\S]*\}/);
            if (match) seo = JSON.parse(match[0]);
            else throw new Error("Could not parse AI response");
          }

          // Update the page in DB
          const allKeywords = [...(seo.shortTailKeywords || []), ...(seo.longTailKeywords || [])];
          const update: Record<string, any> = {
            meta_title: seo.meta_title,
            meta_description: seo.meta_description,
            keywords: allKeywords,
          };
          if (contentType === "article" && seo.h1_tag) update.h1_tag = seo.h1_tag;

          const { error: updateErr } = await supabase.from(config.table).update(update).eq("id", page.id);

          // Save SEO snapshot
          const snapshotKey = `seo_page__${contentType}__${page.id}`;
          const snapshot = {
            contentType,
            recordId: page.id,
            slug: page.slug,
            pagePath: config.getPath(page),
            canonicalUrl: config.getPath(page),
            meta_title: seo.meta_title,
            meta_description: seo.meta_description,
            h1_tag: seo.h1_tag,
            keywords: allKeywords,
            keywordBuckets: {
              primary: (seo.shortTailKeywords || []).slice(0, 2),
              shortTail: seo.shortTailKeywords || [],
              longTail: seo.longTailKeywords || [],
              faq: [],
              trending: [],
              lsi: [],
            },
            onPageTips: [],
            userIntent: seo.userIntent,
            contentFormat: seo.contentFormat,
            internalLinks: { suggested: (seo.internalLinks || []).map((l: any) => l.path), anchorTexts: (seo.internalLinks || []).map((l: any) => l.anchorText) },
            generatedAt: new Date().toISOString(),
          };

          // Upsert snapshot
          const { data: existingSnap } = await supabase.from("site_settings").select("id").eq("key", snapshotKey).limit(1);
          if (existingSnap?.[0]?.id) {
            await supabase.from("site_settings").update({ value: snapshot as any }).eq("id", existingSnap[0].id);
          } else {
            await supabase.from("site_settings").insert({ key: snapshotKey, value: snapshot as any });
          }

          results.push({
            id: page.id,
            name: getName(page),
            status: updateErr ? "partial" : "success",
            seo,
          });

          // Rate limit protection
          await new Promise(r => setTimeout(r, 500));
        } catch (e: any) {
          results.push({ id: page.id, name: getName(page), status: "error", error: e.message });
        }
      }

      return new Response(JSON.stringify({ results, processed: results.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "uniqueness_check") {
      // Check for duplicate meta titles/descriptions across all pages
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

      titleMap.forEach((pages, title) => {
        if (pages.length > 1) titleDuplicates.push({ title, pages });
      });
      descMap.forEach((pages, desc) => {
        if (pages.length > 1) descDuplicates.push({ description: desc.slice(0, 80) + "...", pages });
      });

      return new Response(JSON.stringify({
        totalPages: allMetas.length,
        titleDuplicates,
        descDuplicates,
        missingMeta,
        uniqueScore: Math.round(((allMetas.length - titleDuplicates.reduce((s, d) => s + d.pages.length - 1, 0) - missingMeta.length) / Math.max(allMetas.length, 1)) * 100),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "content_gaps") {
      // AI analyzes all content and finds gaps
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
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are an SEO expert for Indian MBA education. Analyze the content inventory and identify gaps, opportunities, and missing topics." },
            { role: "user", content: `Content Inventory:\n${contentSummary.join("\n")}\n\nIdentify: 1) Missing topics MBA aspirants search for 2) Content gaps vs competitors (Shiksha, Collegedunia, Careers360, MBAUniverse, InsideIIM, PagalGuy) 3) Internal linking opportunities 4) Content format suggestions 5) User intent patterns we're not covering` },
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

      if (!aiResp.ok) {
        const t = await aiResp.text();
        throw new Error(`AI error: ${aiResp.status} ${t}`);
      }

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let gaps: any;
      if (toolCall?.function?.arguments) {
        gaps = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
      } else {
        const content = aiData.choices?.[0]?.message?.content || "";
        const match = content.match(/\{[\s\S]*\}/);
        if (match) gaps = JSON.parse(match[0]);
        else throw new Error("Could not parse AI response");
      }

      return new Response(JSON.stringify(gaps), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "auto_keywords") {
      // Auto-generate and insert keywords for all pages of a content type
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

      // Process in batches of 5
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
                { role: "system", content: "Generate SEO keywords for Indian MBA education pages. Return ONLY short-tail (1-2 words) and long-tail (3-6 words) keywords that students search for." },
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
            const aiData = await aiResp.json();
            const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
            let kws: any;
            if (tc?.function?.arguments) {
              kws = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
            }
            if (kws) {
              const allKws = [...new Set([...(page.keywords || []), ...(kws.shortTail || []), ...(kws.longTail || [])])];
              await supabase.from(config.table).update({ keywords: allKws }).eq("id", page.id);

              // Also update snapshot
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
          await new Promise(r => setTimeout(r, 400));
        } catch { /* skip */ }
      }

      return new Response(JSON.stringify({ updated, total: pagesNeedingKeywords.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
