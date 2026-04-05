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

MANDATORY SEO RULES — ENFORCE STRICTLY:

TITLE TAG & META TITLE:
- Max 60 characters. Include the PRIMARY keyword naturally, ideally near the start.
- Meta title should match the title tag or be a slight variation, always under 60 characters.
- If the current title exceeds 60 chars or lacks the primary keyword, flag as CRITICAL issue.

META DESCRIPTION:
- 150–160 characters. Must include BOTH primary and secondary keywords.
- Must be concise, engaging, and include a clear CTA (e.g., "Compare now", "Check eligibility", "Explore top colleges").
- If missing or under 100 chars or over 160 chars, flag as CRITICAL.

HEADER TAGS:
- Only ONE H1 per page — unique, keyword-rich, different from meta title.
- H2 for main sections, H3 for subsections. Never go beyond H4.
- If multiple H1s or no H1 exists, flag as CRITICAL.

KEYWORDS:
- 1–2 primary keywords per page, 3–4 secondary keywords.
- Avoid keyword stuffing — natural flow is mandatory.
- Score keywords 0 if none exist in the current page data.

INTERNAL LINKING:
- Minimum 2–3 relevant internal links per page, contextually placed.
- Suggest 5–8 internal links with exact anchor text optimized for link equity.
- Flag pages with fewer than 2 internal links as a WARNING.

IMAGE ALT TEXT:
- Every image must have alt text. Describe accurately, max 125 characters.
- Include keyword only if relevant — no stuffing.
- Flag images without alt text as a WARNING.

MOBILE-FRIENDLINESS:
- Ensure responsive design recommendations for all pages.
- Flag any mobile UX concerns.

PAGE SPEED:
- Target load time under 3 seconds.
- Recommend: compress images, leverage browser caching, minimize CSS/JS.
- Include specific pagespeed tips for this page type.

URL STRUCTURE:
- Short, descriptive, under 75 characters, use hyphens only.
- No special characters, no uppercase, no IDs in URL.
- If URL exceeds 75 chars or uses underscores/IDs, flag as WARNING.

SCHEMA MARKUP:
- Add for key elements (reviews, courses, events, FAQs, breadcrumbs) — no clutter.
- ALWAYS return schemaMarkup as an ARRAY of JSON-LD objects, each with @context and @type.
- NEVER return empty schemaMarkup. This is MANDATORY.

ROBOTS.TXT:
- Allow essential pages; block irrelevant ones (/admin, /auth, /dashboard).
- Include crawlability and indexing tips.

BACKLINKS:
- Prioritize quality over quantity, ensure relevance.
- Suggest 3–5 specific backlink acquisition strategies for this page.

CRITICAL SCORING RULES:
- The seoScore MUST evaluate the CURRENT state of the page data BEFORE your suggestions are applied.
- Score each category honestly 0–100 based on what's actually present in the data.
- If meta_title is missing or poor → metaTags score 0–30.
- If no keywords exist → keywords score 0.
- If no schema markup exists → schema score 0.
- If no social meta exists → socialMeta score 0.
- DO NOT inflate scores. Be brutally honest. A page missing meta title should NEVER score above 40 overall.
- criticalIssues must list everything ACTUALLY wrong with the current page data.

DO NOT modify or suggest changes to the page's core content or descriptions. Only optimize meta tags, headers, technical SEO, and schema markup.

ALWAYS return a valid JSON object with this EXACT structure:
{
  "meta_title": "SEO-optimized title UNDER 60 chars, primary keyword near start",
  "meta_description": "Compelling description 150-160 chars with CTA, primary + secondary keywords",
  "h1_tag": "Unique H1 with primary keyword, different from meta_title",
  "keywords": {
    "primary": ["1-2 high-volume primary keywords"],
    "shortTail": ["5-7 short-tail 1-2 word keywords"],
    "longTail": ["8-10 long-tail keywords students actually search"],
    "faq": ["7-10 question-format keywords like 'What is the best...'"],
    "trending": ["5 currently trending keywords in this niche"],
    "lsi": ["5-8 LSI (latent semantic indexing) related terms"]
  },
  "onPageTips": ["Specific actionable tip with exact implementation detail"],
  "technicalSEO": {
    "canonicalUrl": "suggested canonical URL path",
    "urlSlugSuggestion": "optimized-url-slug under 75 chars, hyphens only",
    "imageAltTags": ["alt text under 125 chars, keyword if relevant"],
    "contentLengthAnalysis": {
      "currentWordCount": <actual count>,
      "recommendedMinimum": 1500,
      "verdict": "needs more content / adequate / excellent"
    },
    "headerStructure": ["H1: one unique heading", "H2: main sections", "H3: subsections only"],
    "pagespeedTips": ["compress images", "leverage caching", "minimize render-blocking"],
    "mobileTips": ["responsive design checks and suggestions"],
    "securityChecks": ["HTTPS status", "mixed content warnings"],
    "crawlabilityTips": ["robots.txt checks", "sitemap inclusion", "indexing status"],
    "backlinkIdeas": ["3-5 quality backlink strategies with relevance focus"],
    "engagementTips": ["CTR and engagement improvements"],
    "freshnessTips": ["content update schedule recommendations"],
    "keywordPlacementTips": ["where to place primary/secondary keywords naturally"]
  },
  "socialMeta": {
    "ogTitle": "Open Graph title under 60 chars",
    "ogDescription": "OG description 150-160 chars for social sharing",
    "twitterTitle": "Twitter card title under 60 chars",
    "twitterDescription": "Twitter description 150-160 chars"
  },
  "schemaMarkup": [COMPLETE JSON-LD schema ARRAY - NEVER empty],
  "internalLinks": {
    "suggested": ["minimum 3 internal link paths"],
    "anchorTexts": ["keyword-optimized anchor text for each link"]
  },
  "contentSuggestions": ["Content structure improvements without changing text"],
  "competitorInsights": ["What top-ranking pages do differently"],
  "seoScore": {
    "overall": <honest 0-100 of CURRENT page state>,
    "breakdown": {
      "metaTags": <0-100 based on title ≤60 chars + description 150-160 chars>,
      "keywords": <0-100 based on primary + secondary keyword presence>,
      "technicalSEO": <0-100 based on URL ≤75 chars + speed + mobile>,
      "schema": <0-100 based on existing schema markup>,
      "contentStructure": <0-100 based on H1 uniqueness + header hierarchy>,
      "socialMeta": <0-100 based on OG + Twitter meta presence>
    },
    "criticalIssues": ["all critical SEO issues in CURRENT page"],
    "warnings": ["all SEO warnings in CURRENT page"],
    "passed": ["SEO checks that CURRENT page passes"]
  }
}

For schemaMarkup, generate DETAILED JSON-LD arrays based on content type:
- article → [Article, BreadcrumbList, FAQPage (if FAQs present), Organization]
- institute → [EducationalOrganization with courses/reviews/address/geo/contactPoint, BreadcrumbList, AggregateRating]
- college → [EducationalOrganization with courses/placements/rankings/admissionProcess, BreadcrumbList, AggregateRating, FAQPage]
- exam → [Course, Event with dates/eligibility/registration, BreadcrumbList, FAQPage, HowTo]
- cityPage → [WebPage, ItemList, LocalBusiness, BreadcrumbList, FAQPage]`;

    const userPrompt = `Content Type: ${contentType}

Content Data:
${JSON.stringify(data, null, 2)}

Perform DEEP SEO analysis of this ${contentType} page using these STRICT rules:

1. KEYWORD RESEARCH: Find 1–2 primary + 3–4 secondary keywords Indian MBA aspirants search for. Include LSI and long-tail keywords. Avoid stuffing — natural flow only.

2. META OPTIMIZATION:
   - Title tag: UNDER 60 characters, primary keyword near start.
   - Meta description: 150–160 characters, primary + secondary keywords, clear CTA.
   - H1: Unique, keyword-rich, different from title. Only ONE H1 per page.

3. TECHNICAL SEO AUDIT:
   - URL: Under 75 characters, hyphens, descriptive, no IDs.
   - Canonical URL suggestion.
   - Content length (minimum 1500 words for ranking).
   - Header hierarchy: H1 → H2 → H3 only, no H4+.
   - Image alt text: Under 125 chars, keyword if relevant.
   - Page speed: Target under 3 seconds, compress images, leverage caching.
   - Mobile: Responsive design recommendations.
   - Crawlability: robots.txt, sitemap, indexing tips.
   - Backlinks: 3–5 quality, relevant backlink strategies.
   - Internal links: Minimum 3 contextual internal links with anchor text.

4. SOCIAL META: OG and Twitter Card meta, titles under 60 chars, descriptions 150–160 chars.

5. SCHEMA MARKUP: Complete JSON-LD ARRAY — production-ready, no empty objects. Add for reviews, courses, events, FAQs, breadcrumbs as relevant.

6. INTERNAL LINKING: 5–8 internal links with keyword-optimized anchor text. Minimum 2–3 per page.

7. COMPETITOR ANALYSIS: Top 3 things competing pages do better.

8. SEO SCORE: Rate CURRENT page honestly (0–100). Enforce:
   - Title missing or >60 chars → metaTags 0–20.
   - No keywords → keywords 0.
   - No schema → schema 0.
   - No social meta → socialMeta 0.
   List ALL critical issues, warnings, and passed checks for CURRENT state.

Be specific to THIS exact page — no generic advice.`;

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
