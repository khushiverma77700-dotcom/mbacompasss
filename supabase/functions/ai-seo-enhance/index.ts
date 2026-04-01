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

    const { contentType, data } = await req.json();

    if (!contentType || !data) {
      return new Response(JSON.stringify({ error: "contentType and data are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert SEO consultant specializing in the Indian education sector — MBA coaching, colleges, entrance exams (CAT, GMAT, XAT, SNAP, GRE). 

Your job is to analyze the given content and generate comprehensive SEO suggestions.

ALWAYS return a valid JSON object with this exact structure:
{
  "meta_title": "SEO-optimized title under 60 chars with primary keyword",
  "meta_description": "Compelling description under 155 chars with CTA",
  "h1_tag": "Unique H1 tag with primary keyword",
  "keywords": {
    "primary": ["top 3-5 high-volume short-tail keywords"],
    "longTail": ["5-8 long-tail keywords students actually search"],
    "faq": ["5-7 question-format keywords like 'What is the best...'"],
    "trending": ["3-5 currently trending keywords in this niche"]
  },
  "onPageTips": [
    "Specific actionable tip 1",
    "Specific actionable tip 2",
    "Specific actionable tip 3"
  ],
  "schemaMarkup": {}, 
  "internalLinks": ["suggested internal link paths like /colleges, /exam/cat"],
  "contentSuggestions": [
    "Add a comparison table for...",
    "Include FAQ section about..."
  ]
}

For schemaMarkup, generate the appropriate JSON-LD schema based on content type:
- article → Article schema
- institute → EducationalOrganization with courses
- college → EducationalOrganization with placements
- exam → Event schema
- cityPage → WebPage with local business markup

Focus on keywords that Indian MBA aspirants actually search for. Consider seasonal trends (CAT registration in Aug-Sep, results in Jan, admission season Mar-Jun).`;

    const userPrompt = `Content Type: ${contentType}

Content Data:
${JSON.stringify(data, null, 2)}

Analyze this content and provide comprehensive SEO suggestions. Focus on:
1. What students would search to find this page
2. Trending keywords in the ${contentType} space right now
3. Long-tail keywords with buying/action intent
4. FAQ-style keywords
5. Optimal meta tags
6. Schema markup for this specific content
7. On-page SEO improvements
8. Internal linking opportunities`;

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
        tools: [{
          type: "function",
          function: {
            name: "seo_suggestions",
            description: "Return SEO suggestions for the content",
            parameters: {
              type: "object",
              properties: {
                meta_title: { type: "string" },
                meta_description: { type: "string" },
                h1_tag: { type: "string" },
                keywords: {
                  type: "object",
                  properties: {
                    primary: { type: "array", items: { type: "string" } },
                    longTail: { type: "array", items: { type: "string" } },
                    faq: { type: "array", items: { type: "string" } },
                    trending: { type: "array", items: { type: "string" } },
                  },
                  required: ["primary", "longTail", "faq", "trending"],
                },
                onPageTips: { type: "array", items: { type: "string" } },
                schemaMarkup: { type: "object" },
                internalLinks: { type: "array", items: { type: "string" } },
                contentSuggestions: { type: "array", items: { type: "string" } },
              },
              required: ["meta_title", "meta_description", "h1_tag", "keywords", "onPageTips", "schemaMarkup", "internalLinks", "contentSuggestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "seo_suggestions" } },
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
    
    let suggestions;
    if (toolCall?.function?.arguments) {
      suggestions = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
    } else {
      // Fallback: try parsing content directly
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    return new Response(JSON.stringify({ success: true, suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-seo-enhance error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
