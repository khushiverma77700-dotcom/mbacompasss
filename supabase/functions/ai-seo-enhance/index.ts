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

    const systemPrompt = `You are an elite SEO consultant specializing in the Indian education sector — MBA coaching, colleges, entrance exams (CAT, GMAT, XAT, SNAP, GRE, NMAT, CMAT, IIFT, TISSNET).

Your job is to perform DEEP, DATA-BACKED SEO research and generate comprehensive, actionable SEO optimizations.

CRITICAL RULES:
1. DO NOT modify or suggest changes to the page's core content or descriptions. Only optimize meta tags, headers, technical SEO, and schema markup.
2. Every suggestion must be specific, actionable, and data-backed — no generic advice.
3. Research trending keywords that Indian MBA aspirants actually search for TODAY.
4. Consider seasonal trends (CAT registration Aug-Sep, results Jan, admission Mar-Jun).
5. Generate detailed, page-type-specific JSON-LD schema markup.

ALWAYS return a valid JSON object with this EXACT structure:
{
  "meta_title": "SEO-optimized title under 60 chars, primary keyword near start",
  "meta_description": "Compelling description 150-155 chars with CTA and primary keyword",
  "h1_tag": "Unique H1 with primary keyword, different from meta_title",
  "keywords": {
    "primary": ["top 5 high-volume short-tail keywords with est. monthly search volume"],
    "longTail": ["8-10 long-tail keywords students actually search"],
    "faq": ["7-10 question-format keywords like 'What is the best...'"],
    "trending": ["5 currently trending keywords in this niche"],
    "lsi": ["5-8 LSI (latent semantic indexing) related terms"]
  },
  "onPageTips": [
    "Specific actionable on-page optimization tip with exact implementation detail"
  ],
  "technicalSEO": {
    "canonicalUrl": "suggested canonical URL path",
    "urlSlugSuggestion": "optimized-url-slug if current is suboptimal",
    "imageAltTags": ["suggested alt text for key images on this page"],
    "contentLengthAnalysis": {
      "currentWordCount": 0,
      "recommendedMinimum": 1500,
      "verdict": "needs more content / adequate / excellent"
    },
    "headerStructure": ["H1: suggested", "H2: suggested sub-sections", "H3: suggested sub-sub-sections"],
    "pagespeedTips": ["specific speed optimization tips for this page type"],
    "mobileTips": ["mobile UX optimization suggestions"],
    "securityChecks": ["HTTPS status note", "mixed content warnings if any"]
  },
  "socialMeta": {
    "ogTitle": "Open Graph title (may differ from meta_title for social engagement)",
    "ogDescription": "Open Graph description optimized for social sharing",
    "twitterTitle": "Twitter card title",
    "twitterDescription": "Twitter card description"
  },
  "schemaMarkup": {},
  "internalLinks": {
    "suggested": ["internal link paths with anchor text suggestions"],
    "anchorTexts": ["optimized anchor text for each suggested link"]
  },
  "contentSuggestions": [
    "Content structure improvement that does NOT change existing text"
  ],
  "competitorInsights": [
    "What top-ranking pages for similar keywords are doing differently"
  ],
  "seoScore": {
    "overall": 0,
    "breakdown": {
      "metaTags": 0,
      "keywords": 0,
      "technicalSEO": 0,
      "schema": 0,
      "contentStructure": 0,
      "socialMeta": 0
    },
    "criticalIssues": ["list of critical SEO issues found"],
    "warnings": ["list of SEO warnings"],
    "passed": ["list of SEO checks that passed"]
  }
}

For schemaMarkup, generate DETAILED, COMPLETE JSON-LD based on content type:
- article → Article + BreadcrumbList + FAQPage (if FAQs present) + Organization
- institute → EducationalOrganization with courses, reviews, address, geo, contactPoint + BreadcrumbList + AggregateRating
- college → EducationalOrganization with courses, placements, rankings, admissionProcess + BreadcrumbList + AggregateRating + FAQPage
- exam → Course + Event with dates, eligibility, registration + BreadcrumbList + FAQPage + HowTo (for preparation)
- cityPage → WebPage + ItemList + LocalBusiness + BreadcrumbList + FAQPage

Include @context, @type, and ALL relevant properties for each schema type. Be exhaustive.

The seoScore should be calculated based on the CURRENT state of the page data provided, not after your suggestions. Score each category 0-100.`;

    const userPrompt = `Content Type: ${contentType}

Content Data:
${JSON.stringify(data, null, 2)}

Perform DEEP SEO analysis of this ${contentType} page. Research and provide:

1. KEYWORD RESEARCH: Find the exact keywords Indian MBA aspirants search for to find this specific page. Include search volume estimates where possible. Find LSI keywords.

2. META OPTIMIZATION: Craft meta title (under 60 chars, keyword-first), meta description (150-155 chars with CTA), and unique H1 tag. Do NOT change the page's actual content.

3. TECHNICAL SEO AUDIT:
   - Analyze URL/slug for SEO-friendliness
   - Suggest canonical URL
   - Analyze content length adequacy (minimum 1500 words for ranking)
   - Suggest optimal header hierarchy (H1-H3)
   - Image alt tag suggestions
   - Page speed optimization tips specific to this page
   - Mobile responsiveness considerations

4. SOCIAL META: Generate Open Graph and Twitter Card meta suggestions optimized for social sharing engagement.

5. SCHEMA MARKUP: Generate COMPLETE, DETAILED JSON-LD schema with every relevant property filled. This should be production-ready code.

6. INTERNAL LINKING: Suggest 5-8 internal links with exact anchor text optimized for link equity distribution.

7. COMPETITOR ANALYSIS: What are the top 3 things competing pages do better for similar keywords?

8. SEO SCORE: Rate the CURRENT page's SEO health (0-100) across all categories before your improvements. List critical issues, warnings, and passed checks.

Be thorough. Every suggestion must be specific to THIS exact page, not generic advice.`;

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
            description: "Return comprehensive SEO analysis and suggestions",
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
                    lsi: { type: "array", items: { type: "string" } },
                  },
                  required: ["primary", "longTail", "faq", "trending", "lsi"],
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
                    securityChecks: { type: "array", items: { type: "string" } },
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
                schemaMarkup: { type: "object" },
                internalLinks: {
                  type: "object",
                  properties: {
                    suggested: { type: "array", items: { type: "string" } },
                    anchorTexts: { type: "array", items: { type: "string" } },
                  },
                },
                contentSuggestions: { type: "array", items: { type: "string" } },
                competitorInsights: { type: "array", items: { type: "string" } },
                seoScore: {
                  type: "object",
                  properties: {
                    overall: { type: "number" },
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
              required: ["meta_title", "meta_description", "h1_tag", "keywords", "onPageTips", "technicalSEO", "socialMeta", "schemaMarkup", "internalLinks", "contentSuggestions", "competitorInsights", "seoScore"],
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
