import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { mode, query, niche, competitors, existingKeywords } = await req.json();

    if (!mode) {
      return new Response(JSON.stringify({ error: "mode is required (keyword_research | blog_titles | competitor_analysis)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "keyword_research") {
      systemPrompt = `You are an elite SEO keyword research specialist for the Indian education sector (MBA coaching, colleges, entrance exams like CAT, GMAT, XAT, SNAP, GRE, NMAT, CMAT, IIFT).

Return keyword research data with estimated metrics. Be realistic with estimates based on your knowledge of search patterns in India.`;

      userPrompt = `Research keywords for: "${query || niche || "MBA coaching India"}"

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

    } else if (mode === "blog_titles") {
      systemPrompt = `You are an expert content strategist for Indian MBA education sector. You research blog topics that rank well and drive traffic. For each blog title you MUST also generate an SEO-optimized meta title (under 60 chars), a compelling meta description (120-155 chars), and a clean URL slug.`;

      userPrompt = `Generate 20 high-potential blog title ideas for: "${query || niche || "MBA coaching"}"

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

    } else if (mode === "competitor_analysis") {
      systemPrompt = `You are a competitive intelligence expert for Indian education/MBA coaching websites. Analyze competitors and provide actionable insights.`;

      const competitorList = competitors?.length ? competitors.join(", ") : "shiksha.com, collegedunia.com, careers360.com, mbarendezvous.com, pagalguy.com, mbauniverse.com";

      userPrompt = `Analyze these competitors in the MBA coaching/education space: ${competitorList}

Our website: bestmbacoaching.com
Our niche: MBA coaching institute discovery, comparison, and reviews

For each competitor provide:
- Domain authority estimate
- Key strengths (what they do better than us)
- Content strategy analysis
- Top-performing content types
- Keywords they rank for that we don't
- Backlink strategy insights
- Social media presence assessment

Overall provide:
- Top 20 keyword gaps (keywords competitors rank for but we don't)
- Content opportunities we're missing
- Technical SEO advantages competitors have
- Quick wins we can implement immediately
- Long-term strategy recommendations
- Our competitive position assessment (1-10)`;
    }

    const toolName = mode === "keyword_research" ? "keyword_data" : mode === "blog_titles" ? "blog_title_data" : "competitor_data";

    const tools: any[] = [];

    if (mode === "keyword_research") {
      tools.push({
        type: "function",
        function: {
          name: toolName,
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
      });
    } else if (mode === "blog_titles") {
      tools.push({
        type: "function",
        function: {
          name: toolName,
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
                      metaTitle: { type: "string", description: "SEO meta title under 60 chars" },
                      metaDescription: { type: "string", description: "Meta description 120-155 chars" },
                      slug: { type: "string", description: "Clean URL slug" },
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
                  properties: {
                    week: { type: "number" },
                    topic: { type: "string" },
                    keyword: { type: "string" },
                    reason: { type: "string" },
                  },
                },
              },
              summary: { type: "string" },
            },
            required: ["titles", "evergreenTopics", "trendingTopics", "contentCalendar", "summary"],
          },
        },
      });
    } else {
      tools.push({
        type: "function",
        function: {
          name: toolName,
          description: "Return competitor analysis data",
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
                    strengths: { type: "array", items: { type: "string" } },
                    contentStrategy: { type: "string" },
                    topContentTypes: { type: "array", items: { type: "string" } },
                    uniqueKeywords: { type: "array", items: { type: "string" } },
                    backlinkStrategy: { type: "string" },
                    socialPresence: { type: "string" },
                  },
                  required: ["domain", "domainAuthority", "strengths", "contentStrategy", "uniqueKeywords"],
                },
              },
              keywordGaps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    keyword: { type: "string" },
                    searchVolume: { type: "number" },
                    competitorRanking: { type: "string" },
                    difficulty: { type: "number" },
                    opportunity: { type: "string" },
                  },
                  required: ["keyword", "searchVolume", "difficulty", "opportunity"],
                },
              },
              contentOpportunities: { type: "array", items: { type: "string" } },
              quickWins: { type: "array", items: { type: "string" } },
              longTermStrategy: { type: "array", items: { type: "string" } },
              competitivePosition: { type: "number" },
              summary: { type: "string" },
            },
            required: ["competitors", "keywordGaps", "contentOpportunities", "quickWins", "longTermStrategy", "competitivePosition", "summary"],
          },
        },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: toolName } },
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
      result = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
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
