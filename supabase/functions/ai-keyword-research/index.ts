import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildKeywordResearchPayload(query: string, existingKeywords: string[]) {
  const systemPrompt = `You are an elite SEO keyword research specialist for the Indian education sector (MBA coaching, colleges, entrance exams like CAT, GMAT, XAT, SNAP, GRE, NMAT, CMAT, IIFT). Return keyword research data with estimated metrics. Be realistic with estimates based on your knowledge of search patterns in India.`;
  const userPrompt = `Research keywords for: "${query}"

${existingKeywords?.length ? `Already targeting: ${existingKeywords.join(", ")}` : ""}

Find 30-50 keywords organized by category. For each keyword provide:
- keyword text
- estimated monthly search volume (realistic for India)
- competition level (low/medium/high)
- keyword difficulty (0-100)
- CPC estimate in INR
- search intent (informational/commercial/transactional/navigational)
- trending direction (up/stable/down)

Also provide:
- Top 5 content gaps we should fill
- Seasonal keyword opportunities
- Featured snippet opportunities`;

  const tool = {
    type: "function",
    function: {
      name: "keyword_data",
      description: "Return keyword research data",
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
              },
              required: ["keyword", "searchVolume", "competition", "difficulty", "intent", "trending"],
            },
          },
          contentGaps: { type: "array", items: { type: "string" } },
          seasonalOpportunities: { type: "array", items: { type: "string" } },
          snippetOpportunities: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["keywords", "contentGaps", "seasonalOpportunities", "snippetOpportunities", "summary"],
      },
    },
  };
  return { systemPrompt, userPrompt, tool, toolName: "keyword_data" };
}

function buildBlogTitlesPayload(query: string) {
  const systemPrompt = `You are an expert content strategist for Indian MBA education sector. You research blog topics that rank well and drive traffic. For each blog title you MUST also generate an SEO-optimized meta title (under 60 chars), a compelling meta description (120-155 chars), and a clean URL slug.`;
  const userPrompt = `Generate 20 high-potential blog title ideas for: "${query}"

For each title provide:
- title (optimized for CTR and SEO)
- metaTitle (SEO meta title, under 60 characters, with primary keyword)
- metaDescription (compelling meta description, 120-155 characters, include CTA)
- slug (clean URL slug, lowercase, hyphens, no stop words)
- target keyword
- estimated monthly search volume for the target keyword
- competition level
- content type (listicle/guide/comparison/news/how-to/case-study)
- estimated word count needed to rank
- priority (high/medium/low based on traffic potential vs effort)
- trending score (1-10, how trending this topic is right now)

Also suggest:
- 5 evergreen topics that will always drive traffic
- 5 trending/timely topics for this month
- Content calendar suggestion for next 4 weeks`;

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
                title: { type: "string" },
                metaTitle: { type: "string" },
                metaDescription: { type: "string" },
                slug: { type: "string" },
                targetKeyword: { type: "string" },
                searchVolume: { type: "number" },
                competition: { type: "string", enum: ["low", "medium", "high"] },
                contentType: { type: "string" },
                wordCount: { type: "number" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                trendingScore: { type: "number" },
              },
              required: ["title", "metaTitle", "metaDescription", "slug", "targetKeyword", "searchVolume", "competition", "contentType", "priority", "trendingScore"],
            },
          },
          evergreenTopics: { type: "array", items: { type: "string" } },
          trendingTopics: { type: "array", items: { type: "string" } },
          contentCalendar: {
            type: "array",
            items: {
              type: "object",
              properties: { week: { type: "number" }, topic: { type: "string" }, keyword: { type: "string" }, reason: { type: "string" } },
            },
          },
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
  const systemPrompt = `You are a world-class competitive intelligence expert for Indian education/MBA coaching websites. Provide extremely detailed, actionable analysis with specific recommendations.`;
  const userPrompt = `Perform an exhaustive competitive analysis of these competitors in the MBA coaching/education space: ${competitorList}

Our website: bestmbacoaching.com
Our niche: MBA coaching institute discovery, comparison, and reviews

For each competitor provide detailed profile:
- Domain authority estimate (0-100)
- Estimated monthly organic traffic
- Number of indexed pages estimate
- Key strengths (what they do better than us) — at least 4 points
- Key weaknesses we can exploit — at least 3 points
- Content strategy analysis (detailed)
- Top-performing content types
- Keywords they rank for that we don't — at least 8 keywords
- Backlink strategy insights
- Social media presence assessment
- Top pages driving traffic — at least 3 URLs/topics
- SERP features they own (featured snippets, people also ask, knowledge panels)
- UX/Technical advantages

SWOT Analysis for our website vs competitors:
- Strengths (what we do well)
- Weaknesses (where we fall short)
- Opportunities (untapped areas)
- Threats (competitive risks)

Provide detailed keyword gaps (at least 20):
- keyword, search volume, difficulty, which competitor ranks, ranking position estimate, our opportunity level, recommended action (create new content / optimize existing / build backlinks)

Content opportunities we're missing (at least 8 detailed items)

Quick wins we can implement this week (at least 8 specific actions)

Long-term strategy recommendations (at least 6 detailed points)

Backlink opportunities:
- Types of sites linking to competitors but not us
- Specific outreach strategies
- Resource page opportunities
- Guest posting targets

Page-wise recommendations (for different page types on our site):
- Homepage improvements
- Institute listing pages
- College pages
- Exam pages
- Blog/article pages
- City landing pages
Each with specific, actionable items

Our competitive position assessment (1-10) with detailed justification`;

  const tool = {
    type: "function",
    function: {
      name: "competitor_data",
      description: "Return detailed competitor analysis data",
      parameters: {
        type: "object",
        properties: {
          competitors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                domain: { type: "string" },
                domainAuthority: { type: "number" },
                estimatedTraffic: { type: "string" },
                indexedPages: { type: "string" },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                contentStrategy: { type: "string" },
                topContentTypes: { type: "array", items: { type: "string" } },
                uniqueKeywords: { type: "array", items: { type: "string" } },
                backlinkStrategy: { type: "string" },
                socialPresence: { type: "string" },
                topPages: { type: "array", items: { type: "string" } },
                serpFeatures: { type: "array", items: { type: "string" } },
                technicalAdvantages: { type: "array", items: { type: "string" } },
              },
              required: ["domain", "domainAuthority", "strengths", "weaknesses", "contentStrategy", "uniqueKeywords"],
            },
          },
          swotAnalysis: {
            type: "object",
            properties: {
              strengths: { type: "array", items: { type: "string" } },
              weaknesses: { type: "array", items: { type: "string" } },
              opportunities: { type: "array", items: { type: "string" } },
              threats: { type: "array", items: { type: "string" } },
            },
            required: ["strengths", "weaknesses", "opportunities", "threats"],
          },
          keywordGaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                keyword: { type: "string" },
                searchVolume: { type: "number" },
                difficulty: { type: "number" },
                competitorRanking: { type: "string" },
                rankingPosition: { type: "string" },
                opportunity: { type: "string" },
                recommendedAction: { type: "string" },
              },
              required: ["keyword", "searchVolume", "difficulty", "opportunity", "recommendedAction"],
            },
          },
          contentOpportunities: { type: "array", items: { type: "string" } },
          quickWins: { type: "array", items: { type: "string" } },
          longTermStrategy: { type: "array", items: { type: "string" } },
          backlinkOpportunities: {
            type: "object",
            properties: {
              siteTypes: { type: "array", items: { type: "string" } },
              outreachStrategies: { type: "array", items: { type: "string" } },
              resourcePages: { type: "array", items: { type: "string" } },
              guestPostTargets: { type: "array", items: { type: "string" } },
            },
          },
          pageRecommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pageType: { type: "string" },
                recommendations: { type: "array", items: { type: "string" } },
                priority: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["pageType", "recommendations", "priority"],
            },
          },
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
      payload = buildKeywordResearchPayload(query || niche || "MBA coaching India", existingKeywords || []);
    } else if (mode === "blog_titles") {
      payload = buildBlogTitlesPayload(query || niche || "MBA coaching");
    } else {
      payload = buildCompetitorPayload(competitors || []);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: payload.systemPrompt },
          { role: "user", content: payload.userPrompt },
        ],
        tools: [payload.tool],
        tool_choice: { type: "function", function: { name: payload.toolName } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall?.function?.arguments) {
      result = typeof toolCall.function.arguments === "string" ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error("Could not parse AI response");
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
