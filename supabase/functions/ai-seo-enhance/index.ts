import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Robust JSON extraction with truncation detection ──

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.search(/[\{\[]/);
  const jsonEnd = cleaned.lastIndexOf(
    jsonStart !== -1 && cleaned[jsonStart] === "[" ? "]" : "}"
  );

  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in response");
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix common LLM JSON issues
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/\\'/g, "'");
    return JSON.parse(cleaned);
  }
}

function detectTruncation(response: string): boolean {
  const text = response.trim();
  const openBraces = (text.match(/{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/\]/g) || []).length;
  if (openBraces !== closeBraces || openBrackets !== closeBrackets) return true;
  return /\.\.\.$/m.test(text) || /\u2026$/m.test(text) || /\[truncated\]/i.test(text);
}

// ── Schema markup generator (separate focused call) ──

async function generateSchemaMarkup(
  LOVABLE_API_KEY: string,
  contentType: string,
  data: Record<string, any>,
  siteUrl: string
): Promise<any[]> {
  const schemaPrompts: Record<string, string> = {
    article: `Generate JSON-LD schemas for an article page:
1. Article schema with headline, author, datePublished, dateModified, image, publisher
2. BreadcrumbList with Home > Blog > Article Name
3. FAQPage if any FAQ content exists in the data
4. Organization for the publisher

Article data: title="${data.title || data.name}", slug="${data.slug}", author="${data.author || 'MBAHub Team'}", category="${data.category || ''}", content length=${(data.content || data.description || '').length} chars`,

    institute: `Generate JSON-LD schemas for an educational coaching institute page:
1. EducationalOrganization with name, description, address (city: ${data.city || 'India'}, state: ${data.state || ''}), telephone, url, aggregateRating (rating: ${data.rating || 4.0}, reviewCount: ${data.total_reviews || 10}), courses offered
2. BreadcrumbList with Home > Coaching Institutes > ${data.name}
3. LocalBusiness with geo coordinates if available (lat: ${data.latitude || ''}, lng: ${data.longitude || ''})
4. FAQPage with common questions about this institute

Institute: name="${data.name}", slug="${data.slug}", mode="${data.mode || 'Offline'}", city="${data.city || ''}"`,

    college: `Generate JSON-LD schemas for an MBA college page:
1. EducationalOrganization with name, description, address, ranking (#${data.ranking || 'N/A'}), accreditations, courses (${(data.courses || []).join(', ')}), fees (${data.fees || 'N/A'})
2. BreadcrumbList with Home > MBA Colleges > ${data.name}
3. AggregateRating (if placement data exists: avg=${data.placement_avg || 'N/A'}, highest=${data.placement_highest || 'N/A'})
4. FAQPage with admission, fees, placement FAQs
5. CollegeOrUniversity type

College: name="${data.name}", slug="${data.slug}", city="${data.city || ''}", established=${data.established || 'N/A'}`,

    exam: `Generate JSON-LD schemas for an entrance exam page:
1. Course/Event with name, description, provider (conducting body: ${data.conducting_body || 'N/A'}), dates
2. BreadcrumbList with Home > Exams > ${data.name}
3. FAQPage with eligibility, syllabus, exam pattern FAQs
4. HowTo for registration process

Exam: name="${data.name || data.full_name}", slug="${data.slug}", exam_date="${data.exam_date || ''}", registration_deadline="${data.registration_deadline || ''}"`,

    cityPage: `Generate JSON-LD schemas for a city/state landing page about MBA coaching:
1. WebPage with name, description, about
2. ItemList with MBA coaching institutes in this city
3. BreadcrumbList with Home > MBA Coaching > ${data.name}
4. FAQPage with city-specific MBA coaching FAQs
5. LocalBusiness aggregate for the city

City: name="${data.name}", slug="${data.slug}", state="${data.state || ''}", type="${data.type || 'city'}"`,
  };

  const prompt = schemaPrompts[contentType] || schemaPrompts.article;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a schema markup expert. Generate ONLY a valid JSON array of JSON-LD objects. Each object MUST have "@context": "https://schema.org" and "@type". Use real data from the provided info. Site URL: ${siteUrl}. Do NOT wrap in markdown. Return ONLY the JSON array.`,
        },
        { role: "user", content: prompt },
      ],
      generationConfig: { maxOutputTokens: 4096 },
    }),
  });

  if (!response.ok) {
    console.error("Schema generation failed:", response.status);
    return getDefaultSchemas(contentType, data, siteUrl);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content || "";

  try {
    if (detectTruncation(content)) {
      console.warn("Schema output truncated, using defaults");
      return getDefaultSchemas(contentType, data, siteUrl);
    }
    const parsed = extractJsonFromResponse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.["@type"]) return parsed;
    if (typeof parsed === "object" && (parsed as any)["@type"]) return [parsed];
    return getDefaultSchemas(contentType, data, siteUrl);
  } catch {
    console.error("Failed to parse schema JSON, using defaults");
    return getDefaultSchemas(contentType, data, siteUrl);
  }
}

function getDefaultSchemas(contentType: string, data: Record<string, any>, siteUrl: string): any[] {
  const name = data.title || data.name || data.full_name || "Untitled";
  const slug = data.slug || "";
  const description = (data.meta_description || data.description || "").slice(0, 200);
  const city = data.city || "";
  const state = data.state || "";

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: contentType === "article" ? "Blog" : contentType === "institute" ? "Coaching" : contentType === "college" ? "Colleges" : contentType === "exam" ? "Exams" : "Cities", item: `${siteUrl}/${contentType === "article" ? "blog" : contentType === "institute" ? "category/cat" : contentType === "college" ? "colleges" : contentType === "exam" ? "exams" : "colleges"}` },
      { "@type": "ListItem", position: 3, name, item: `${siteUrl}/${contentType === "article" ? "article" : contentType === "institute" ? "institute" : contentType === "college" ? "college" : contentType === "exam" ? "exam" : "colleges"}/${slug}` },
    ],
  };

  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MBAHub by B School Buzz",
    url: siteUrl,
    logo: `${siteUrl}/placeholder.svg`,
    sameAs: [],
  };

  if (contentType === "article") {
    return [
      { "@context": "https://schema.org", "@type": "Article", headline: name, description, author: { "@type": "Person", name: data.author || "MBAHub Team" }, publisher: { "@type": "Organization", name: "MBAHub", logo: { "@type": "ImageObject", url: `${siteUrl}/placeholder.svg` } }, datePublished: data.created_at, dateModified: data.updated_at, mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/article/${slug}` }, image: data.banner_url || data.image_url || `${siteUrl}/placeholder.svg` },
      breadcrumb, org,
    ];
  }

  if (contentType === "institute") {
    return [
      { "@context": "https://schema.org", "@type": "EducationalOrganization", name, description, url: data.website || `${siteUrl}/institute/${slug}`, address: { "@type": "PostalAddress", addressLocality: city, addressRegion: state, addressCountry: "IN" }, telephone: data.phone || "", aggregateRating: data.rating ? { "@type": "AggregateRating", ratingValue: data.rating, bestRating: 5, ratingCount: data.total_reviews || 1 } : undefined },
      breadcrumb, org,
    ];
  }

  if (contentType === "college") {
    return [
      { "@context": "https://schema.org", "@type": "CollegeOrUniversity", name, description, url: data.website || `${siteUrl}/college/${slug}`, address: { "@type": "PostalAddress", addressLocality: city, addressRegion: state, addressCountry: "IN" }, foundingDate: data.established ? String(data.established) : undefined },
      breadcrumb, org,
    ];
  }

  if (contentType === "exam") {
    return [
      { "@context": "https://schema.org", "@type": "Course", name: data.full_name || name, description, provider: { "@type": "Organization", name: data.conducting_body || "Various" } },
      breadcrumb, org,
    ];
  }

  // cityPage
  return [
    { "@context": "https://schema.org", "@type": "WebPage", name: `MBA Coaching in ${name}`, description, url: `${siteUrl}/colleges/${slug}` },
    breadcrumb, org,
  ];
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { contentType, data, pageUrl } = await req.json();

    if (!contentType || !data) {
      return new Response(JSON.stringify({ error: "contentType and data are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = "https://bestmbacoaching.com";

    // Step 1: Generate schema markup separately (focused, reliable)
    const schemaPromise = generateSchemaMarkup(LOVABLE_API_KEY, contentType, data, siteUrl);

    // Step 2: Main SEO analysis
    const systemPrompt = `You are an elite SEO consultant for Indian MBA education (CAT, GMAT, XAT, SNAP, GRE, NMAT, CMAT, IIFT, TISSNET).

CRITICAL RULES:
- meta_title: UNDER 60 chars, primary keyword near start
- meta_description: 150-160 chars, primary+secondary keywords, clear CTA
- h1_tag: Unique, keyword-rich, different from meta_title
- Score the CURRENT page honestly (0-100) BEFORE your suggestions
- If meta_title missing → metaTags score 0-20
- If no keywords → keywords score 0
- DO NOT inflate scores
- Generate detailed, page-specific keywords (not generic)
- Internal links must be real paths on the site (/college/*, /institute/*, /exam/*, /article/*, /blog, /compare)

Return ONLY valid JSON matching the tool schema. No markdown.`;

    const contentText = (data.description || data.content || data.intro_content || data.detailed_content || data.admission_process || data.eligibility || "")
      .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = contentText.split(/\s+/).filter(Boolean).length;

    const userPrompt = `Content Type: ${contentType}
Page Name: ${data.title || data.name || data.full_name || "Untitled"}
Slug: ${data.slug || ""}
City: ${data.city || "N/A"}
State: ${data.state || "N/A"}
Current Meta Title: ${data.meta_title || "MISSING"}
Current Meta Description: ${data.meta_description || "MISSING"}
Current Keywords: ${(data.keywords || []).join(", ") || "NONE"}
Current H1: ${data.h1_tag || "MISSING"}
Word Count: ${wordCount}
${pageUrl ? `Live Page URL: ${pageUrl}` : ""}

Content Preview (first 3000 chars):
${contentText.slice(0, 3000)}

${data.courses ? `Courses: ${(data.courses || []).join(", ")}` : ""}
${data.exams_accepted ? `Exams Accepted: ${(data.exams_accepted || []).join(", ")}` : ""}
${data.fees ? `Fees: ${data.fees}` : ""}
${data.ranking ? `Ranking: #${data.ranking}` : ""}
${data.rating ? `Rating: ${data.rating}/5 (${data.total_reviews || 0} reviews)` : ""}
${data.placement_avg ? `Avg Placement: ${data.placement_avg}` : ""}
${data.conducting_body ? `Conducting Body: ${data.conducting_body}` : ""}
${data.exam_date ? `Exam Date: ${data.exam_date}` : ""}

Perform DEEP, page-specific SEO analysis. Be brutally honest about current state.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        generationConfig: { maxOutputTokens: 8192 },
        tools: [{
          type: "function",
          function: {
            name: "seo_suggestions",
            description: "Return comprehensive SEO analysis and suggestions",
            parameters: {
              type: "object",
              properties: {
                meta_title: { type: "string", description: "SEO title UNDER 60 chars" },
                meta_description: { type: "string", description: "Meta description 150-160 chars with CTA" },
                h1_tag: { type: "string", description: "Unique H1, different from meta_title" },
                keywords: {
                  type: "object",
                  properties: {
                    primary: { type: "array", items: { type: "string" }, description: "1-2 high-volume primary keywords" },
                    shortTail: { type: "array", items: { type: "string" }, description: "5-7 short-tail keywords" },
                    longTail: { type: "array", items: { type: "string" }, description: "8-10 long-tail keywords students search" },
                    faq: { type: "array", items: { type: "string" }, description: "7-10 question-format keywords" },
                    trending: { type: "array", items: { type: "string" }, description: "5 trending keywords" },
                    lsi: { type: "array", items: { type: "string" }, description: "5-8 LSI related terms" },
                  },
                  required: ["primary", "shortTail", "longTail", "faq", "trending", "lsi"],
                },
                onPageTips: { type: "array", items: { type: "string" }, description: "Specific actionable SEO tips" },
                technicalSEO: {
                  type: "object",
                  properties: {
                    canonicalUrl: { type: "string" },
                    urlSlugSuggestion: { type: "string" },
                    imageAltTags: { type: "array", items: { type: "string" } },
                    contentLengthAnalysis: { type: "object", properties: { currentWordCount: { type: "number" }, recommendedMinimum: { type: "number" }, verdict: { type: "string" } } },
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
                    ogTitle: { type: "string" }, ogDescription: { type: "string" },
                    twitterTitle: { type: "string" }, twitterDescription: { type: "string" },
                  },
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
                        metaTags: { type: "number" }, keywords: { type: "number" },
                        technicalSEO: { type: "number" }, schema: { type: "number" },
                        contentStructure: { type: "number" }, socialMeta: { type: "number" },
                      },
                    },
                    criticalIssues: { type: "array", items: { type: "string" } },
                    warnings: { type: "array", items: { type: "string" } },
                    passed: { type: "array", items: { type: "string" } },
                  },
                },
              },
              required: ["meta_title", "meta_description", "h1_tag", "keywords", "onPageTips", "technicalSEO", "socialMeta", "internalLinks", "contentSuggestions", "competitorInsights", "seoScore"],
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let suggestions: any;
    if (toolCall?.function?.arguments) {
      const args = toolCall.function.arguments;
      suggestions = typeof args === "string" ? JSON.parse(args) : args;
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      if (detectTruncation(content)) {
        console.warn("AI response appears truncated, attempting partial parse");
      }
      suggestions = extractJsonFromResponse(content);
    }

    // Wait for schema generation
    const schemaMarkup = await schemaPromise;
    suggestions.schemaMarkup = schemaMarkup;

    // Ensure all fields have defaults
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
      contentLengthAnalysis: suggestions.technicalSEO?.contentLengthAnalysis || { currentWordCount: wordCount, recommendedMinimum: 1500, verdict: wordCount >= 1500 ? "adequate" : "needs more content" },
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
