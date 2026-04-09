import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonStart = cleaned.search(/[\{\[]/);
  const jsonEnd = cleaned.lastIndexOf(jsonStart !== -1 && cleaned[jsonStart] === "[" ? "]" : "}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  try { return JSON.parse(cleaned); } catch {
    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

// ── Free API helpers for real keyword data ──

async function fetchGoogleSuggest(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=en&gl=in`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data[1] || []).slice(0, 10);
  } catch { return []; }
}

async function fetchGoogleTrends(query: string): Promise<string[]> {
  try {
    const url = `https://trends.google.com/trends/api/autocomplete/${encodeURIComponent(query)}?hl=en-US&tz=-330`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!resp.ok) return [];
    const text = await resp.text();
    const clean = text.replace(/^\)\]\}',?\n/, "");
    const data = JSON.parse(clean);
    return (data.default?.topics || []).map((t: any) => t.title || t.mid).filter(Boolean).slice(0, 8);
  } catch { return []; }
}

async function fetchWikipediaSuggestions(query: string): Promise<string[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data[1] || []).slice(0, 5);
  } catch { return []; }
}

async function fetchPeopleAlsoAsk(query: string): Promise<string[]> {
  // Uses Google's related searches API alternative
  const variations = [
    `what is ${query}`,
    `best ${query}`,
    `${query} vs`,
    `how to ${query}`,
    `${query} fees`,
    `${query} reviews`,
    `${query} admission`,
    `${query} eligibility`,
  ];
  const results: string[] = [];
  for (const v of variations.slice(0, 4)) {
    const suggestions = await fetchGoogleSuggest(v);
    results.push(...suggestions.slice(0, 3));
  }
  return [...new Set(results)].slice(0, 15);
}

// ── Payload builders ──

function buildKeywordResearchPayload(query: string, existingKeywords: string[], realSuggestions: { google: string[]; paa: string[]; trends: string[]; wiki: string[] }) {
  const systemPrompt = `You are an elite SEO keyword research specialist for Indian MBA education (coaching, colleges, exams like CAT, GMAT, XAT, SNAP, GRE, NMAT, CMAT). 

You have access to REAL Google autocomplete suggestions and trends data. Use these to validate and enrich your keyword research. Be realistic with search volume estimates based on India market.`;

  const userPrompt = `Research keywords for: "${query}"

${existingKeywords?.length ? `Already targeting: ${existingKeywords.join(", ")}` : ""}

REAL DATA FROM GOOGLE:
- Google Autocomplete: ${realSuggestions.google.join(", ") || "N/A"}
- People Also Search: ${realSuggestions.paa.join(", ") || "N/A"}  
- Google Trends Related: ${realSuggestions.trends.join(", ") || "N/A"}
- Wikipedia Related: ${realSuggestions.wiki.join(", ") || "N/A"}

Use this real data to:
1. Validate keyword ideas against actual search behavior
2. Discover keywords we might miss
3. Estimate realistic search volumes for India

Find 20-30 keywords organized by category. For each provide:
- keyword, estimated monthly search volume (India), competition (low/medium/high), difficulty (0-100), intent (informational/commercial/transactional/navigational), trending direction

Also provide:
- Top 5 content gaps to fill
- Seasonal keyword opportunities (exam seasons, admission windows)
- Featured snippet opportunities (questions that can rank)
- Competitor keywords (what Shiksha, Collegedunia, Careers360 rank for)`;

  const tool = {
    type: "function",
    function: {
      name: "keyword_data",
      description: "Return keyword research data enriched with real search data",
      parameters: {
        type: "object",
        properties: {
          keywords: {
            type: "array",
            items: {
              type: "object",
              properties: {
                keyword: { type: "string" },
                searchVolume: { type: "number" },
                competition: { type: "string", enum: ["low", "medium", "high"] },
                difficulty: { type: "number" },
                cpc: { type: "number" },
                intent: { type: "string", enum: ["informational", "commercial", "transactional", "navigational"] },
                trending: { type: "string", enum: ["up", "stable", "down"] },
                category: { type: "string" },
                source: { type: "string", description: "Where this keyword was found: google_suggest, trends, ai_generated, paa" },
              },
              required: ["keyword", "searchVolume", "competition", "difficulty", "intent", "trending"],
            },
          },
          contentGaps: { type: "array", items: { type: "string" } },
          seasonalOpportunities: { type: "array", items: { type: "string" } },
          snippetOpportunities: { type: "array", items: { type: "string" } },
          competitorKeywords: { type: "array", items: { type: "object", properties: { keyword: { type: "string" }, competitor: { type: "string" }, estimatedPosition: { type: "number" } } } },
          summary: { type: "string" },
          dataSourcesUsed: { type: "array", items: { type: "string" } },
        },
        required: ["keywords", "contentGaps", "seasonalOpportunities", "snippetOpportunities", "summary"],
      },
    },
  };
  return { systemPrompt, userPrompt, tool, toolName: "keyword_data" };
}

function buildBlogTitlesPayload(query: string) {
  const systemPrompt = `You are an expert content strategist for Indian MBA education. Research blog topics that rank well and drive traffic. For each title generate SEO-optimized meta title (<60 chars), compelling meta description (120-155 chars), and clean URL slug.`;
  const userPrompt = `Generate 20 high-potential blog title ideas for: "${query}"

For each title provide:
- title (CTR + SEO optimized)
- metaTitle (under 60 chars, primary keyword)
- metaDescription (120-155 chars, CTA)
- slug (clean, hyphens, no stop words)
- target keyword
- estimated monthly search volume
- competition level
- content type (listicle/guide/comparison/news/how-to/case-study)
- estimated word count needed to rank
- priority (high/medium/low)
- trendingScore (1-10)

Also suggest:
- 5 evergreen topics
- 5 trending/timely topics
- 4-week content calendar`;

  const tool = {
    type: "function",
    function: {
      name: "blog_title_data",
      description: "Return blog title research data",
      parameters: {
        type: "object",
        properties: {
          titles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" }, metaTitle: { type: "string" }, metaDescription: { type: "string" },
                slug: { type: "string" }, targetKeyword: { type: "string" }, searchVolume: { type: "number" },
                competition: { type: "string", enum: ["low", "medium", "high"] },
                contentType: { type: "string" }, wordCount: { type: "number" },
                priority: { type: "string", enum: ["high", "medium", "low"] }, trendingScore: { type: "number" },
              },
              required: ["title", "metaTitle", "metaDescription", "slug", "targetKeyword", "searchVolume", "competition", "contentType", "priority", "trendingScore"],
            },
          },
          evergreenTopics: { type: "array", items: { type: "string" } },
          trendingTopics: { type: "array", items: { type: "string" } },
          contentCalendar: { type: "array", items: { type: "object", properties: { week: { type: "number" }, topic: { type: "string" }, keyword: { type: "string" }, reason: { type: "string" } } } },
          summary: { type: "string" },
        },
        required: ["titles", "evergreenTopics", "trendingTopics", "contentCalendar", "summary"],
      },
    },
  };
  return { systemPrompt, userPrompt, tool, toolName: "blog_title_data" };
}

function buildCompetitorPayload(competitors: string[]) {
  const competitorList = competitors.length ? competitors.join(", ") : "shiksha.com, collegedunia.com, careers360.com, mbarendezvous.com, pagalguy.com, mbauniverse.com";
  const systemPrompt = `You are a competitive intelligence expert for Indian education/MBA websites. Provide extremely detailed, actionable analysis.`;
  const userPrompt = `Competitive analysis: ${competitorList}
Our site: bestmbacoaching.com (MBA coaching discovery, comparison, reviews)

For each competitor: domain authority estimate, traffic, strengths (4+), weaknesses (3+), content strategy, unique keywords (8+), top pages (3+)
SWOT for us vs them
20+ keyword gaps with search volume, difficulty, recommended action
8+ content opportunities, 8+ quick wins, 6+ long-term strategies
Backlink opportunities, page-type recommendations
Overall competitive position (1-10) with justification`;

  const tool = {
    type: "function",
    function: {
      name: "competitor_data",
      description: "Return competitor analysis",
      parameters: {
        type: "object",
        properties: {
          competitors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                domain: { type: "string" }, domainAuthority: { type: "number" },
                estimatedTraffic: { type: "string" }, indexedPages: { type: "string" },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                contentStrategy: { type: "string" }, topContentTypes: { type: "array", items: { type: "string" } },
                uniqueKeywords: { type: "array", items: { type: "string" } },
                backlinkStrategy: { type: "string" }, socialPresence: { type: "string" },
                topPages: { type: "array", items: { type: "string" } },
                serpFeatures: { type: "array", items: { type: "string" } },
                technicalAdvantages: { type: "array", items: { type: "string" } },
              },
              required: ["domain", "domainAuthority", "strengths", "weaknesses", "contentStrategy", "uniqueKeywords"],
            },
          },
          swotAnalysis: { type: "object", properties: { strengths: { type: "array", items: { type: "string" } }, weaknesses: { type: "array", items: { type: "string" } }, opportunities: { type: "array", items: { type: "string" } }, threats: { type: "array", items: { type: "string" } } }, required: ["strengths", "weaknesses", "opportunities", "threats"] },
          keywordGaps: { type: "array", items: { type: "object", properties: { keyword: { type: "string" }, searchVolume: { type: "number" }, difficulty: { type: "number" }, competitorRanking: { type: "string" }, rankingPosition: { type: "string" }, opportunity: { type: "string" }, recommendedAction: { type: "string" } }, required: ["keyword", "searchVolume", "difficulty", "opportunity", "recommendedAction"] } },
          contentOpportunities: { type: "array", items: { type: "string" } },
          quickWins: { type: "array", items: { type: "string" } },
          longTermStrategy: { type: "array", items: { type: "string" } },
          backlinkOpportunities: { type: "object", properties: { siteTypes: { type: "array", items: { type: "string" } }, outreachStrategies: { type: "array", items: { type: "string" } }, resourcePages: { type: "array", items: { type: "string" } }, guestPostTargets: { type: "array", items: { type: "string" } } } },
          pageRecommendations: { type: "array", items: { type: "object", properties: { pageType: { type: "string" }, recommendations: { type: "array", items: { type: "string" } }, priority: { type: "string", enum: ["high", "medium", "low"] } }, required: ["pageType", "recommendations", "priority"] } },
          competitivePosition: { type: "number" },
          positionJustification: { type: "string" },
          summary: { type: "string" },
        },
        required: ["competitors", "swotAnalysis", "keywordGaps", "contentOpportunities", "quickWins", "longTermStrategy", "backlinkOpportunities", "pageRecommendations", "competitivePosition", "summary"],
      },
    },
  };
  return { systemPrompt, userPrompt, tool, toolName: "competitor_data" };
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { mode, query, niche, competitors, existingKeywords } = await req.json();
    if (!mode) {
      return new Response(JSON.stringify({ error: "mode is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: { systemPrompt: string; userPrompt: string; tool: any; toolName: string };

    if (mode === "keyword_research") {
      const searchQuery = query || niche || "MBA coaching India";
      
      // Fetch real data from free APIs in parallel
      const [google, paa, trends, wiki] = await Promise.all([
        fetchGoogleSuggest(searchQuery),
        fetchPeopleAlsoAsk(searchQuery),
        fetchGoogleTrends(searchQuery),
        fetchWikipediaSuggestions(searchQuery),
      ]);

      console.log(`Real data fetched: ${google.length} Google, ${paa.length} PAA, ${trends.length} Trends, ${wiki.length} Wiki`);

      payload = buildKeywordResearchPayload(searchQuery, existingKeywords || [], { google, paa, trends, wiki });
    } else if (mode === "blog_titles") {
      payload = buildBlogTitlesPayload(query || niche || "MBA coaching");
    } else {
      payload = buildCompetitorPayload(competitors || []);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: payload.systemPrompt },
          { role: "user", content: payload.userPrompt },
        ],
        generationConfig: { maxOutputTokens: 8192 },
        tools: [payload.tool],
        tool_choice: { type: "function", function: { name: payload.toolName } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall?.function?.arguments) {
      result = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      result = extractJsonFromResponse(content);
    }

    return new Response(JSON.stringify({ success: true, data: result, mode, generatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-keyword-research error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
