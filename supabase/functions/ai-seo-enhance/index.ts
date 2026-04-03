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
5. Generate detailed, page-type-specific JSON-LD schema markup — THIS IS MANDATORY, never return an empty schemaMarkup object.

CRITICAL SCORING RULES:
- The seoScore MUST evaluate the CURRENT state of the page data BEFORE your suggestions are applied.
- Score each category honestly 0-100 based on what's actually present in the data.
- If meta_title is missing or poor, metaTags score should be LOW (0-30).
- If no keywords exist, keywords score should be 0.
- If no schema markup exists on the page currently, schema score should be 0.
- If no social meta exists, socialMeta score should be 0.
- DO NOT inflate scores. Be brutally honest. A page missing meta title should NEVER score above 40 overall.
- criticalIssues should list everything that's ACTUALLY wrong with the current page data.

ALWAYS return a valid JSON object with this EXACT structure:
{
  "meta_title": "SEO-optimized title under 60 chars, primary keyword near start",
  "meta_description": "Compelling description 150-155 chars with CTA and primary keyword",
  "h1_tag": "Unique H1 with primary keyword, different from meta_title",
  "keywords": {
    "primary": ["top 5 high-volume short-tail keywords"],
    "shortTail": ["5-7 short-tail 1-2 word keywords"],
    "longTail": ["8-10 long-tail keywords students actually search"],
    "faq": ["7-10 question-format keywords like 'What is the best...'"],
    "trending": ["5 currently trending keywords in this niche"],
    "lsi": ["5-8 LSI (latent semantic indexing) related terms"]
  },
  "onPageTips": ["Specific actionable tip with exact implementation detail"],
  "technicalSEO": {
    "canonicalUrl": "suggested canonical URL path",
    "urlSlugSuggestion": "optimized-url-slug if current is suboptimal",
    "imageAltTags": ["suggested alt text for key images"],
    "contentLengthAnalysis": {
      "currentWordCount": <actual count from data>,
      "recommendedMinimum": 1500,
      "verdict": "needs more content / adequate / excellent"
    },
    "headerStructure": ["H1: suggested", "H2: sub-sections", "H3: sub-sub-sections"],
    "pagespeedTips": ["specific speed optimization tips"],
    "mobileTips": ["mobile UX optimization suggestions"],
    "securityChecks": ["HTTPS status note", "mixed content warnings"],
    "crawlabilityTips": ["robots.txt, sitemap suggestions"],
    "backlinkIdeas": ["backlink acquisition strategies"],
    "engagementTips": ["CTR and engagement improvements"],
    "freshnessTips": ["content freshness and update schedule"],
    "keywordPlacementTips": ["where to place keywords in content"]
  },
  "socialMeta": {
    "ogTitle": "Open Graph title optimized for social engagement",
    "ogDescription": "Open Graph description for social sharing",
    "twitterTitle": "Twitter card title",
    "twitterDescription": "Twitter card description"
  },
  "schemaMarkup": { COMPLETE JSON-LD schema - NEVER empty },
  "internalLinks": {
    "suggested": ["internal link paths"],
    "anchorTexts": ["optimized anchor text for each link"]
  },
  "contentSuggestions": ["Content structure improvement without changing text"],
  "competitorInsights": ["What top-ranking pages do differently"],
  "seoScore": {
    "overall": <honest 0-100 score of CURRENT page state>,
    "breakdown": {
      "metaTags": <0-100>,
      "keywords": <0-100>,
      "technicalSEO": <0-100>,
      "schema": <0-100>,
      "contentStructure": <0-100>,
      "socialMeta": <0-100>
    },
    "criticalIssues": ["critical SEO issues in CURRENT page"],
    "warnings": ["SEO warnings in CURRENT page"],
    "passed": ["SEO checks that CURRENT page passes"]
  }
}

For schemaMarkup, generate DETAILED, COMPLETE JSON-LD arrays based on content type:
- article → [Article, BreadcrumbList, FAQPage (if FAQs present), Organization]
- institute → [EducationalOrganization with courses/reviews/address/geo/contactPoint, BreadcrumbList, AggregateRating]
- college → [EducationalOrganization with courses/placements/rankings/admissionProcess, BreadcrumbList, AggregateRating, FAQPage]
- exam → [Course, Event with dates/eligibility/registration, BreadcrumbList, FAQPage, HowTo]
- cityPage → [WebPage, ItemList, LocalBusiness, BreadcrumbList, FAQPage]

ALWAYS return schemaMarkup as an ARRAY of schema objects, each with @context and @type. Include ALL relevant properties.`;

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
   - Crawlability and indexing tips
   - Backlink opportunity ideas
   - User engagement and CTR tips
   - Content freshness recommendations

4. SOCIAL META: Generate Open Graph and Twitter Card meta suggestions optimized for social sharing engagement.

5. SCHEMA MARKUP: Generate COMPLETE, DETAILED JSON-LD schema array with every relevant property filled. This MUST be production-ready. Return an ARRAY of schema objects. NEVER return an empty object.

6. INTERNAL LINKING: Suggest 5-8 internal links with exact anchor text optimized for link equity distribution.

7. COMPETITOR ANALYSIS: What are the top 3 things competing pages do better for similar keywords?

8. SEO SCORE: Rate the CURRENT page's SEO health (0-100) across all categories BEFORE your improvements. Be honest — if meta_title is missing, metaTags should be 0-20. If no schema exists, schema should be 0. List all critical issues, warnings, and passed checks for the CURRENT state.

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
                    securityChecks: { type: "array", items: { type: "string" } },
                    crawlabilityTips: { type: "array", items: { type: "string" } },
                    backlinkIdeas: { type: "array", items: { type: "string" } },
                    engagementTips: { type: "array", items: { type: "string" } },
                    freshnessTips: { type: "array", items: { type: "string" } },
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
                schemaMarkup: {
                  oneOf: [
                    { type: "object" },
                    { type: "array", items: { type: "object" } },
                  ],
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

    // Ensure schemaMarkup is always an array
    if (suggestions.schemaMarkup && !Array.isArray(suggestions.schemaMarkup)) {
      if (suggestions.schemaMarkup["@type"]) {
        suggestions.schemaMarkup = [suggestions.schemaMarkup];
      } else {
        // It might be nested like { Article: {...}, BreadcrumbList: {...} }
        const schemas = Object.values(suggestions.schemaMarkup).filter(
          (v: any) => v && typeof v === "object" && v["@type"]
        );
        suggestions.schemaMarkup = schemas.length > 0 ? schemas : [suggestions.schemaMarkup];
      }
    }

    // Ensure all arrays have defaults
    suggestions.keywords = {
      primary: suggestions.keywords?.primary || [],
      shortTail: suggestions.keywords?.shortTail || [],
      longTail: suggestions.keywords?.longTail || [],
      faq: suggestions.keywords?.faq || [],
      trending: suggestions.keywords?.trending || [],
      lsi: suggestions.keywords?.lsi || [],
    };
    suggestions.onPageTips = suggestions.onPageTips || [];
    suggestions.contentSuggestions = suggestions.contentSuggestions || [];
    suggestions.competitorInsights = suggestions.competitorInsights || [];
    suggestions.technicalSEO = {
      canonicalUrl: suggestions.technicalSEO?.canonicalUrl || "",
      urlSlugSuggestion: suggestions.technicalSEO?.urlSlugSuggestion || "",
      imageAltTags: suggestions.technicalSEO?.imageAltTags || [],
      contentLengthAnalysis: suggestions.technicalSEO?.contentLengthAnalysis || { currentWordCount: 0, recommendedMinimum: 1500, verdict: "unknown" },
      headerStructure: suggestions.technicalSEO?.headerStructure || [],
      pagespeedTips: suggestions.technicalSEO?.pagespeedTips || [],
      mobileTips: suggestions.technicalSEO?.mobileTips || [],
      securityChecks: suggestions.technicalSEO?.securityChecks || [],
      crawlabilityTips: suggestions.technicalSEO?.crawlabilityTips || [],
      backlinkIdeas: suggestions.technicalSEO?.backlinkIdeas || [],
      engagementTips: suggestions.technicalSEO?.engagementTips || [],
      freshnessTips: suggestions.technicalSEO?.freshnessTips || [],
      keywordPlacementTips: suggestions.technicalSEO?.keywordPlacementTips || [],
    };
    suggestions.socialMeta = suggestions.socialMeta || {};
    suggestions.internalLinks = {
      suggested: suggestions.internalLinks?.suggested || [],
      anchorTexts: suggestions.internalLinks?.anchorTexts || [],
    };
    suggestions.seoScore = suggestions.seoScore || { overall: 0, breakdown: {}, criticalIssues: [], warnings: [], passed: [] };

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
