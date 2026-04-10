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

// ── Real data fetchers ──

async function fetchGoogleSuggest(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=en&gl=in`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data[1] || []).slice(0, 10);
  } catch { return []; }
}

async function fetchGoogleSuggestMultiple(queries: string[]): Promise<string[]> {
  const all = await Promise.all(queries.map(q => fetchGoogleSuggest(q)));
  return [...new Set(all.flat())];
}

async function fetchGoogleTrends(query: string): Promise<string[]> {
  try {
    const url = `https://trends.google.com/trends/api/autocomplete/${encodeURIComponent(query)}?hl=en-US&tz=-330`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (!resp.ok) return [];
    const text = await resp.text();
    const clean = text.replace(/^\)\]\}',?\n/, "");
    const data = JSON.parse(clean);
    return (data.default?.topics || []).map((t: any) => t.title || t.mid).filter(Boolean).slice(0, 10);
  } catch { return []; }
}

async function fetchWikipediaSuggestions(query: string): Promise<string[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=8&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data[1] || []).slice(0, 8);
  } catch { return []; }
}

async function fetchPeopleAlsoAsk(query: string): Promise<string[]> {
  const questionPrefixes = [
    `what is ${query}`, `how to ${query}`, `best ${query}`,
    `${query} vs`, `${query} fees`, `${query} reviews`,
    `${query} admission`, `${query} eligibility`, `${query} salary`,
    `${query} cutoff`, `${query} placement`, `is ${query} worth it`,
    `${query} syllabus`, `${query} preparation`, `why ${query}`,
  ];
  // Fetch in parallel batches of 5
  const batches = [];
  for (let i = 0; i < questionPrefixes.length; i += 5) {
    batches.push(questionPrefixes.slice(i, i + 5));
  }
  const results: string[] = [];
  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(v => fetchGoogleSuggest(v)));
    results.push(...batchResults.flat().slice(0, 3));
  }
  return [...new Set(results)].slice(0, 25);
}

// Alphabet expansion (a-z variations)
async function fetchAlphabetExpansion(query: string): Promise<string[]> {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const selected = letters.filter(() => Math.random() > 0.5).slice(0, 8); // Sample 8 random letters
  const results = await Promise.all(
    selected.map(letter => fetchGoogleSuggest(`${query} ${letter}`))
  );
  return [...new Set(results.flat())].slice(0, 20);
}

// ── Payload builders ──

function buildKeywordResearchPayload(
  query: string,
  existingKeywords: string[],
  realSuggestions: { google: string[]; paa: string[]; trends: string[]; wiki: string[]; alphabet: string[] }
) {
  const allRealKeywords = [...new Set([
    ...realSuggestions.google, ...realSuggestions.paa, ...realSuggestions.alphabet
  ])];

  const systemPrompt = `You are an elite SEO keyword research specialist for the Indian education market, particularly MBA/management education (coaching centers, colleges, exams like CAT, XAT, SNAP, GMAT, GRE, NMAT, CMAT, MAT, IPMAT).

CRITICAL RULES:
- Use ONLY the real Google autocomplete data provided below for primary keywords
- For each keyword you list, mark the source accurately (google_suggest, paa, trends, alphabet, ai_enriched)
- Search volume estimates must be REALISTIC for India (not inflated). Most long-tail keywords get 100-2000 searches/month
- Include a mix: head terms (high volume, high competition), body terms, and long-tail terms (low volume, low competition)
- Group keywords by clear categories (exam-specific, city-specific, comparison, preparation, fees, etc.)
- Prioritize keywords where a new/growing site can actually compete`;

  const userPrompt = `Research keywords for: "${query}"

${existingKeywords?.length ? `Already targeting (don't repeat these): ${existingKeywords.slice(0, 30).join(", ")}` : ""}

REAL GOOGLE AUTOCOMPLETE DATA (VERIFIED):
${realSuggestions.google.length ? `✅ Direct suggestions: ${realSuggestions.google.join(" | ")}` : "⚠️ No direct suggestions found"}

REAL "PEOPLE ALSO SEARCH" (VERIFIED):
${realSuggestions.paa.length ? `✅ Related queries: ${realSuggestions.paa.join(" | ")}` : "⚠️ No PAA data"}

ALPHABET EXPANSION (VERIFIED):  
${realSuggestions.alphabet.length ? `✅ Expanded: ${realSuggestions.alphabet.join(" | ")}` : "⚠️ No expansion data"}

GOOGLE TRENDS (VERIFIED):
${realSuggestions.trends.length ? `✅ Trending: ${realSuggestions.trends.join(" | ")}` : "⚠️ No trends data"}

WIKIPEDIA RELATED (VERIFIED):
${realSuggestions.wiki.length ? `✅ Related: ${realSuggestions.wiki.join(" | ")}` : "⚠️ No wiki data"}

TOTAL REAL KEYWORDS COLLECTED: ${allRealKeywords.length}

Instructions:
1. Start with the REAL keywords above — tag them with their source
2. Then add AI-enriched keywords you're confident about — tag them as "ai_enriched"
3. Provide 30-40 keywords total, organized into clear categories
4. For EACH keyword: realistic India monthly search volume, competition level, difficulty score, search intent, trend direction
5. Include CPC estimates in INR where relevant
6. Identify content gaps, seasonal opportunities, and featured snippet chances
7. Suggest competitor keywords (what Shiksha, Collegedunia, Careers360 rank for that we don't)`;

  const tool = {
    type: "function",
    function: {
      name: "keyword_data",
      description: "Return comprehensive keyword research data with source attribution",
      parameters: {
        type: "object",
        properties: {
          keywords: {
            type: "array",
            items: {
              type: "object",
              properties: {
                keyword: { type: "string" },
                searchVolume: { type: "number", description: "Realistic monthly search volume for India" },
                competition: { type: "string", enum: ["low", "medium", "high"] },
                difficulty: { type: "number", description: "SEO difficulty 0-100" },
                cpc: { type: "number", description: "Estimated CPC in INR" },
                intent: { type: "string", enum: ["informational", "commercial", "transactional", "navigational"] },
                trending: { type: "string", enum: ["up", "stable", "down"] },
                category: { type: "string", description: "Keyword grouping category" },
                source: { type: "string", enum: ["google_suggest", "paa", "trends", "alphabet", "wiki", "ai_enriched"], description: "Where this keyword was found" },
                priorityScore: { type: "number", description: "1-10, how important for our site" },
              },
              required: ["keyword", "searchVolume", "competition", "difficulty", "intent", "trending", "source"],
            },
          },
          keywordClusters: {
            type: "array",
            description: "Group related keywords into topic clusters",
            items: {
              type: "object",
              properties: {
                clusterName: { type: "string" },
                pillarKeyword: { type: "string" },
                supportingKeywords: { type: "array", items: { type: "string" } },
                suggestedContentType: { type: "string" },
              },
              required: ["clusterName", "pillarKeyword", "supportingKeywords"],
            },
          },
          contentGaps: { type: "array", items: { type: "object", properties: { gap: { type: "string" }, suggestedTitle: { type: "string" }, estimatedTraffic: { type: "number" }, difficulty: { type: "string" } }, required: ["gap", "suggestedTitle"] } },
          seasonalOpportunities: { type: "array", items: { type: "object", properties: { keyword: { type: "string" }, peakMonths: { type: "string" }, action: { type: "string" } }, required: ["keyword", "peakMonths", "action"] } },
          snippetOpportunities: { type: "array", items: { type: "object", properties: { question: { type: "string" }, suggestedAnswer: { type: "string" }, currentRanker: { type: "string" } }, required: ["question"] } },
          competitorKeywords: { type: "array", items: { type: "object", properties: { keyword: { type: "string" }, competitor: { type: "string" }, estimatedPosition: { type: "number" }, ourOpportunity: { type: "string" } }, required: ["keyword", "competitor"] } },
          dataQualityReport: {
            type: "object",
            properties: {
              totalRealKeywords: { type: "number" },
              totalAiEnriched: { type: "number" },
              dataSourcesUsed: { type: "array", items: { type: "string" } },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              notes: { type: "string" },
            },
          },
          summary: { type: "string" },
        },
        required: ["keywords", "keywordClusters", "contentGaps", "seasonalOpportunities", "snippetOpportunities", "dataQualityReport", "summary"],
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
Our site: bschoolbuzz.com (MBA coaching discovery, comparison, reviews)

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
    const startTime = Date.now();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { mode, query, niche, competitors, existingKeywords } = await req.json();
    console.log(`[ai-keyword-research] mode=${mode}, query=${query || niche || 'default'}`);
    if (!mode) {
      return new Response(JSON.stringify({ error: "mode is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: { systemPrompt: string; userPrompt: string; tool: any; toolName: string };

    if (mode === "keyword_research") {
      const searchQuery = query || niche || "MBA coaching India";
      
      // Fetch real data from multiple sources in parallel
      const [google, paa, trends, wiki, alphabet] = await Promise.all([
        fetchGoogleSuggest(searchQuery),
        fetchPeopleAlsoAsk(searchQuery),
        fetchGoogleTrends(searchQuery),
        fetchWikipediaSuggestions(searchQuery),
        fetchAlphabetExpansion(searchQuery),
      ]);

      const totalReal = new Set([...google, ...paa, ...alphabet]).size;
      console.log(`[ai-keyword-research] Real data fetched in ${Date.now() - startTime}ms: ${google.length} Google, ${paa.length} PAA, ${trends.length} Trends, ${wiki.length} Wiki, ${alphabet.length} Alphabet, ${totalReal} unique`);

      payload = buildKeywordResearchPayload(searchQuery, existingKeywords || [], { google, paa, trends, wiki, alphabet });
    } else if (mode === "blog_titles") {
      payload = buildBlogTitlesPayload(query || niche || "MBA coaching");
    } else {
      payload = buildCompetitorPayload(competitors || []);
    }

    console.log(`[ai-keyword-research] Calling AI gateway...`);
    const aiStartTime = Date.now();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: payload.systemPrompt },
          { role: "user", content: payload.userPrompt },
        ],
        max_tokens: 8192,
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

    console.log(`[ai-keyword-research] AI call completed in ${Date.now() - aiStartTime}ms`);
    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall?.function?.arguments) {
      result = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      result = extractJsonFromResponse(content);
    }

    console.log(`[ai-keyword-research] Total time: ${Date.now() - startTime}ms, keywords: ${result?.keywords?.length || 0}`);
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
