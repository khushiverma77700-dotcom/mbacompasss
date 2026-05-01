import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";

import { callAIGateway } from "../_shared/aiGateway.ts";
async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    const { error } = await sb.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0, estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
    if (error) console.error("[ai-usage-log] Insert failed:", JSON.stringify(error));
  } catch (e) { console.error("[ai-usage-log] Exception:", e); }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonStart = cleaned.search(/[\{\[]/);
  const jsonEnd = cleaned.lastIndexOf(jsonStart !== -1 && cleaned[jsonStart] === "[" ? "]" : "}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in response");
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  try { return JSON.parse(cleaned); } catch {
    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "").replace(/\\'/g, "'");
    return JSON.parse(cleaned);
  }
}

function detectTruncation(response: string): boolean {
  const text = response.trim();
  const ob = (text.match(/{/g) || []).length;
  const cb = (text.match(/}/g) || []).length;
  const obr = (text.match(/\[/g) || []).length;
  const cbr = (text.match(/\]/g) || []).length;
  if (ob !== cb || obr !== cbr) return true;
  return /\.\.\.$/m.test(text) || /\u2026$/m.test(text) || /\[truncated\]/i.test(text);
}

// ── Schema markup generator (AI-powered) ──
async function generateSchemaMarkup(
  GEMINI_API_KEY: string, contentType: string, data: Record<string, any>, siteUrl: string
): Promise<any[]> {
  const contentTypePaths: Record<string, string> = {
    article: "article", institute: "institute", college: "college", exam: "exam", cityPage: "colleges",
  };
  const basePath = contentTypePaths[contentType] || contentType;
  const pageUrl = `${siteUrl}/${basePath}/${data.slug || ""}`;

  const schemaContext: Record<string, string> = {
    article: `Article page. Title: "${data.title || data.name}". Author: "${data.author || 'MBA Compass Team'}". Category: "${data.category || ''}". Published: ${data.created_at || 'N/A'}. Updated: ${data.updated_at || 'N/A'}. Image: "${data.banner_url || data.image_url || ''}". Content excerpt: "${(data.content || data.description || '').replace(/<[^>]*>/g, ' ').slice(0, 500)}".
Generate: Article, BreadcrumbList (Home > Blog > ${data.title || data.name}), Organization (publisher), FAQPage (generate 3-5 relevant FAQ Q&As about this article topic).`,

    institute: `MBA Coaching Institute page. Name: "${data.name}". City: "${data.city || ''}". State: "${data.state || ''}". Rating: ${data.rating || 'N/A'}/5 (${data.total_reviews || 0} reviews). Phone: "${data.phone || ''}". Website: "${data.website || ''}". Mode: "${data.mode || 'Offline'}". Address: "${data.address || ''}". Lat: ${data.latitude || 'N/A'}, Lng: ${data.longitude || 'N/A'}. Features: ${(data.features || []).join(', ') || 'N/A'}. Success rate: ${data.success_rate || 'N/A'}%.
Generate: EducationalOrganization (with aggregateRating, address, courses offered), LocalBusiness (with geo if available), BreadcrumbList (Home > Coaching Institutes > ${data.name}), FAQPage (5 Q&As about this institute's fees, results, batches, faculty, location).`,

    college: `MBA College page. Name: "${data.name}". City: "${data.city || ''}". State: "${data.state || ''}". Ranking: #${data.ranking || 'N/A'}. Established: ${data.established || 'N/A'}. Type: "${data.type || ''}". Tier: "${data.tier || ''}". Courses: ${(data.courses || []).join(', ') || 'N/A'}. Exams accepted: ${(data.exams_accepted || []).join(', ') || 'N/A'}. Fees: "${data.fees || 'N/A'}". Avg placement: "${data.placement_avg || 'N/A'}". Highest placement: "${data.placement_highest || 'N/A'}". Median: "${data.placement_median || 'N/A'}". Top recruiters: ${(data.top_recruiters || []).slice(0, 10).join(', ') || 'N/A'}. Accreditations: ${(data.accreditations || []).join(', ') || 'N/A'}. Campus size: "${data.campus_size || ''}".
Generate: CollegeOrUniversity (with ranking, fees, placements), EducationalOrganization, BreadcrumbList (Home > MBA Colleges > ${data.name}), FAQPage (5-7 Q&As about admission, fees, placements, cutoff, eligibility, campus life), AggregateRating.`,

    exam: `Entrance Exam page. Name: "${data.full_name || data.name}". Conducting body: "${data.conducting_body || ''}". Exam date: "${data.exam_date || ''}". Registration deadline: "${data.registration_deadline || ''}". Eligibility: "${data.eligibility || ''}". Frequency: "${data.frequency || ''}". Syllabus: ${(data.syllabus || []).slice(0, 10).join(', ') || 'N/A'}. Pattern: ${JSON.stringify(data.pattern || {}).slice(0, 300)}.
Generate: Course (educational), Event (exam event with dates), BreadcrumbList (Home > Exams > ${data.name}), FAQPage (5-7 Q&As about eligibility, syllabus, exam pattern, important dates, preparation tips), HowTo (registration process).`,

    cityPage: `City/State MBA Coaching landing page. City: "${data.name}". State: "${data.state || ''}". Type: "${data.type || 'city'}". Content: "${(data.intro_content || data.detailed_content || '').replace(/<[^>]*>/g, ' ').slice(0, 500)}".
Generate: WebPage, ItemList (MBA coaching institutes in ${data.name}), BreadcrumbList (Home > MBA Coaching > ${data.name}), FAQPage (5 Q&As about MBA coaching in ${data.name}), LocalBusiness aggregate.`,
  };

  const prompt = schemaContext[contentType] || schemaContext.article;

  try {
    const response = await callAIGateway({
        // COST OPT: schema generation is templated; flash-lite is sufficient and ~7× cheaper.
        model: "google/gemini-2.5-flash-lite",
        max_tokens: 2500,
        messages: [
          {
            role: "system",
            content: `You are a Google Rich Results expert. Generate a JSON array of complete, valid JSON-LD schemas for search engine rich results.

RULES:
- Each schema MUST have "@context": "https://schema.org" and a valid "@type"
- Use REAL data from the page — never use placeholder text
- All URLs must use base: ${siteUrl}
- Page URL: ${pageUrl}
- Organization name: "MBA Compass by MBA Compass", logo: "${siteUrl}/logo.png"
- FAQPage schemas must have real, useful Q&As that students would actually search for
- Include ALL relevant schema types for the page (aim for 4-6 schemas)
- Return ONLY the JSON array, no markdown, no explanation`,
          },
          { role: "user", content: prompt },
        ],
      });

    if (!response.ok) {
      console.error("Schema generation failed:", response.status);
      return getDefaultSchemas(contentType, data, siteUrl);
    }

    const aiData = await response.json();
    await logAIUsage("seo-schema", "google/gemini-2.5-flash-lite", aiData);
    const content = aiData.choices?.[0]?.message?.content || "";

    if (detectTruncation(content)) return getDefaultSchemas(contentType, data, siteUrl);
    const parsed = extractJsonFromResponse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.["@type"]) return parsed;
    if (typeof parsed === "object" && (parsed as any)["@type"]) return [parsed];
    return getDefaultSchemas(contentType, data, siteUrl);
  } catch (e) {
    console.error("Schema generation error:", e);
    return getDefaultSchemas(contentType, data, siteUrl);
  }
}

function getDefaultSchemas(contentType: string, data: Record<string, any>, siteUrl: string): any[] {
  const name = data.title || data.name || data.full_name || "Untitled";
  const slug = data.slug || "";
  const description = (data.meta_description || data.description || "").slice(0, 200);
  const city = data.city || "";
  const state = data.state || "";
  const pathMap: Record<string, string> = { article: "article", institute: "institute", college: "college", exam: "exam", cityPage: "colleges" };
  const parentMap: Record<string, [string, string]> = { article: ["Blog", "blog"], institute: ["Coaching", "category/cat"], college: ["Colleges", "colleges"], exam: ["Exams", "exams"], cityPage: ["Cities", "colleges"] };
  const [parentName, parentPath] = parentMap[contentType] || ["Pages", ""];
  const basePath = pathMap[contentType] || contentType;

  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: parentName, item: `${siteUrl}/${parentPath}` },
      { "@type": "ListItem", position: 3, name, item: `${siteUrl}/${basePath}/${slug}` },
    ],
  };
  const org = {
    "@context": "https://schema.org", "@type": "Organization",
    name: "MBA Compass by MBA Compass", url: siteUrl, logo: `${siteUrl}/logo.png`, sameAs: [],
  };

  if (contentType === "article") {
    return [{ "@context": "https://schema.org", "@type": "Article", headline: name, description, author: { "@type": "Person", name: data.author || "MBA Compass Team" }, publisher: { "@type": "Organization", name: "MBA Compass by MBA Compass", logo: { "@type": "ImageObject", url: `${siteUrl}/logo.png` } }, datePublished: data.created_at, dateModified: data.updated_at, mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/article/${slug}` }, image: data.banner_url || data.image_url }, breadcrumb, org];
  }
  if (contentType === "institute") {
    return [{ "@context": "https://schema.org", "@type": "EducationalOrganization", name, description, url: data.website || `${siteUrl}/institute/${slug}`, address: { "@type": "PostalAddress", addressLocality: city, addressRegion: state, addressCountry: "IN" }, telephone: data.phone || "", aggregateRating: data.rating ? { "@type": "AggregateRating", ratingValue: data.rating, bestRating: 5, ratingCount: data.total_reviews || 1 } : undefined }, breadcrumb, org];
  }
  if (contentType === "college") {
    return [{ "@context": "https://schema.org", "@type": "CollegeOrUniversity", name, description, url: data.website || `${siteUrl}/college/${slug}`, address: { "@type": "PostalAddress", addressLocality: city, addressRegion: state, addressCountry: "IN" }, foundingDate: data.established ? String(data.established) : undefined }, breadcrumb, org];
  }
  if (contentType === "exam") {
    return [{ "@context": "https://schema.org", "@type": "Course", name: data.full_name || name, description, provider: { "@type": "Organization", name: data.conducting_body || "Various" } }, breadcrumb, org];
  }
  return [{ "@context": "https://schema.org", "@type": "WebPage", name: `MBA Coaching in ${name}`, description, url: `${siteUrl}/colleges/${slug}` }, breadcrumb, org];
}

async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sbAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roleRow } = await sbAdmin
    .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authFail = await requireAdmin(req);
    if (authFail) return authFail;

    const startTime = Date.now();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { contentType, data, pageUrl } = await req.json();
    console.log(`[ai-seo-enhance] Starting deep analysis for ${contentType}: ${data?.name || data?.title || 'unknown'}`);

    if (!contentType || !data) {
      return new Response(JSON.stringify({ error: "contentType and data are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = "https://mbacompass.in";

    // Generate AI-powered schema markup in parallel with main analysis
    const schemaPromise = generateSchemaMarkup(GEMINI_API_KEY, contentType, data, siteUrl);

    // Extract and analyze ALL content deeply
    const allContent = [
      data.description, data.content, data.intro_content, data.detailed_content,
      data.admission_process, data.eligibility, data.faq_content,
    ].filter(Boolean).join("\n\n");

    const contentText = allContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = contentText.split(/\s+/).filter(Boolean).length;

    // Extract existing images from content for alt-tag analysis
    const imgMatches = allContent.match(/<img[^>]*>/gi) || [];
    const existingImages = imgMatches.map(img => {
      const src = img.match(/src="([^"]*)"/)?.[1] || "";
      const alt = img.match(/alt="([^"]*)"/)?.[1] || "";
      return { src, alt, hasAlt: alt.length > 0 };
    });

    // Extract existing headers from content
    const headerMatches = allContent.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
    const existingHeaders = headerMatches.map(h => h.replace(/<[^>]*>/g, "").trim());

    // Determine current SEO state for honest scoring
    const currentState = {
      hasMetaTitle: Boolean(data.meta_title && data.meta_title.length > 5),
      metaTitleLength: (data.meta_title || "").length,
      hasMetaDesc: Boolean(data.meta_description && data.meta_description.length > 20),
      metaDescLength: (data.meta_description || "").length,
      hasH1: Boolean(data.h1_tag && data.h1_tag.length > 3),
      hasKeywords: Boolean(data.keywords && data.keywords.length > 0),
      keywordCount: (data.keywords || []).length,
      wordCount,
      imageCount: imgMatches.length,
      imagesWithoutAlt: existingImages.filter(i => !i.hasAlt).length,
      headerCount: headerMatches.length,
      existingHeaders,
    };

    const systemPrompt = `You are a world-class SEO analyst specializing in Indian MBA education (CAT, GMAT, XAT, SNAP, GRE, NMAT, CMAT, IIFT, TISSNET, MAT, ATMA, KMAT).

YOUR MISSION: Perform an exhaustive SEO audit of this page. Read EVERY word of the content. Identify EVERY SEO issue. Provide SPECIFIC, actionable fixes.

CRITICAL SCORING RULES (score the CURRENT state BEFORE your fixes):
- Meta title missing or <10 chars → metaTags: 0-15
- Meta title exists but poor (no keywords, wrong length) → metaTags: 20-40
- Meta title optimized → metaTags: 70-100
- No keywords at all → keywords: 0
- Few generic keywords → keywords: 10-30
- Rich, page-specific keywords → keywords: 60-100
- No schema markup → schema: 0
- Basic schema only → schema: 20-40
- No social meta → socialMeta: 0
- Content <500 words → contentStructure: 10-30
- No proper header hierarchy → contentStructure reduced by 20
- Technical issues (no canonical, no alt tags, etc.) → technicalSEO: 20-40

KEYWORD RESEARCH GUIDELINES:
- primary: 2-3 exact-match high-volume keywords specific to THIS page
- shortTail: 8-10 2-3 word competitive keywords students actually search
- longTail: 12-15 specific 4-7 word phrases with search intent (e.g., "best MBA coaching in Mumbai for working professionals 2025")
- faq: 10-12 question-format keywords starting with What/How/Which/Is/Can/Does (e.g., "What is the fee structure of IIM Ahmedabad MBA?")
- trending: 8-10 current year keywords with "2025", "2026", "latest", "new" (e.g., "CAT 2025 preparation strategy")
- lsi: 10-12 semantically related terms and synonyms (e.g., for "MBA coaching" → "management entrance preparation", "B-school test prep")

META TITLE RULES: Under 60 chars. Primary keyword at/near start. Include brand or location qualifier. Power words: Best, Top, Guide, Review, Compare.
META DESCRIPTION RULES: 150-160 chars. Include primary + secondary keyword. End with CTA (Apply Now, Check Details, Compare, etc.).
H1 TAG: Must be unique from meta_title. Include primary keyword naturally. Should be the main heading a student sees.

TECHNICAL SEO — analyze deeply:
- canonicalUrl: exact canonical URL for this page
- urlSlugSuggestion: improved slug if current one can be better
- imageAltTags: specific alt text for EACH image found on the page
- contentLengthAnalysis: honest assessment with specific recommendation
- headerStructure: suggest full H1 > H2 > H3 hierarchy for the page
- pagespeedTips: specific tips (lazy load images, minimize CSS, defer JS, etc.)
- mobileTips: touch targets, font sizes, viewport, scroll behavior
- securityChecks: HTTPS, mixed content, CSP headers
- crawlabilityTips: robots.txt, sitemap inclusion, internal linking depth
- backlinkIdeas: 5+ specific websites/directories to get backlinks from
- engagementTips: reduce bounce rate, increase time on page
- freshnessTips: content update schedule, date display
- keywordPlacementTips: where exactly to place keywords (first 100 words, headers, alt tags, URL)

INTERNAL LINKS: Suggest 5-8 real internal link paths from these available routes: /college/[slug], /institute/[slug], /exam/[slug], /article/[slug], /blog, /compare, /colleges, /cat-score-calculator, /profile-analyzer, /college-shortlister, /college-finder
For each link, provide the exact anchor text to use.

COMPETITOR INSIGHTS: What are the top 3-5 ranking pages doing differently? What content gaps exist?
CONTENT SUGGESTIONS: 5-8 specific sections/paragraphs to add for better rankings.

Return ONLY valid JSON. No markdown wrapping.`;

    const userPrompt = `=== DEEP SEO AUDIT REQUEST ===

Content Type: ${contentType}
Page: ${data.title || data.name || data.full_name || "Untitled"}
Slug: /${contentType === "cityPage" ? "colleges" : contentType === "article" ? "article" : contentType}/${data.slug || ""}
City: ${data.city || "N/A"} | State: ${data.state || "N/A"}

=== CURRENT SEO STATE (score THIS honestly) ===
Meta Title: ${data.meta_title ? `"${data.meta_title}" (${data.meta_title.length} chars)` : "❌ MISSING"}
Meta Description: ${data.meta_description ? `"${data.meta_description}" (${data.meta_description.length} chars)` : "❌ MISSING"}
H1 Tag: ${data.h1_tag ? `"${data.h1_tag}"` : "❌ MISSING"}
Current Keywords: ${(data.keywords || []).length > 0 ? (data.keywords || []).join(", ") : "❌ NONE"}
Word Count: ${wordCount}
Images Found: ${imgMatches.length} (${existingImages.filter(i => !i.hasAlt).length} missing alt tags)
Headers Found: ${existingHeaders.length > 0 ? existingHeaders.join(" | ") : "None"}
${pageUrl ? `Live URL: ${pageUrl}` : ""}

=== FULL PAGE CONTENT (analyze thoroughly) ===
${contentText.slice(0, 6000)}

=== ADDITIONAL DATA ===
${data.courses ? `Courses Offered: ${(data.courses || []).join(", ")}` : ""}
${data.exams_accepted ? `Exams Accepted: ${(data.exams_accepted || []).join(", ")}` : ""}
${data.fees ? `Fees: ${data.fees}` : ""}
${data.ranking ? `Ranking: #${data.ranking}` : ""}
${data.rating ? `Rating: ${data.rating}/5 (${data.total_reviews || 0} reviews)` : ""}
${data.placement_avg ? `Avg Placement: ${data.placement_avg}` : ""}
${data.placement_highest ? `Highest Placement: ${data.placement_highest}` : ""}
${data.placement_median ? `Median Placement: ${data.placement_median}` : ""}
${data.conducting_body ? `Conducting Body: ${data.conducting_body}` : ""}
${data.exam_date ? `Exam Date: ${data.exam_date}` : ""}
${data.registration_deadline ? `Registration Deadline: ${data.registration_deadline}` : ""}
${data.established ? `Established: ${data.established}` : ""}
${data.accreditations ? `Accreditations: ${(data.accreditations || []).join(", ")}` : ""}
${data.top_recruiters ? `Top Recruiters: ${(data.top_recruiters || []).slice(0, 15).join(", ")}` : ""}
${data.campus_size ? `Campus: ${data.campus_size}` : ""}
${data.success_rate ? `Success Rate: ${data.success_rate}%` : ""}
${data.mode ? `Mode: ${data.mode}` : ""}
${data.features ? `Features: ${(data.features || []).join(", ")}` : ""}
${data.category ? `Category: ${data.category}` : ""}
${data.author ? `Author: ${data.author}` : ""}
${data.tier ? `Tier: ${data.tier}` : ""}
${data.type ? `Type: ${data.type}` : ""}
${data.college_category ? `College Category: ${data.college_category}` : ""}

Perform COMPREHENSIVE, DEEP SEO analysis. Score the CURRENT state honestly. Show what's wrong and provide the BEST possible suggestions.`;

    console.log(`[ai-seo-enhance] Calling AI with deep analysis prompt (premium GPT-5)...`);
    const aiStartTime = Date.now();
    // PREMIUM SEO: route through OpenAI GPT-5 for top-tier copywriting + research depth.
    // Bigger token budget (12K) so the model can produce all 50+ keywords + tips
    // without truncation. The aiGateway helper auto-pads to max_completion_tokens
    // for GPT-5 reasoning models.
    const response = await callAIGateway({
        model: "openai/gpt-5",
        max_tokens: 12000,
        reasoning: { effort: "low" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tool_choice: { type: "function", function: { name: "seo_suggestions" } },
        tools: [{
          type: "function",
          function: {
            name: "seo_suggestions",
            description: "Return comprehensive deep SEO analysis with before/after comparisons",
            parameters: {
              type: "object",
              properties: {
                meta_title: { type: "string", description: "Optimized SEO title UNDER 60 chars with primary keyword" },
                meta_description: { type: "string", description: "Meta description 150-160 chars with keywords and CTA" },
                h1_tag: { type: "string", description: "Unique H1 tag, different from meta_title, keyword-rich" },
                keywords: {
                  type: "object",
                  properties: {
                    primary: { type: "array", items: { type: "string" }, description: "2-3 high-volume primary keywords" },
                    shortTail: { type: "array", items: { type: "string" }, description: "8-10 short-tail keywords" },
                    longTail: { type: "array", items: { type: "string" }, description: "12-15 long-tail keywords students search" },
                    faq: { type: "array", items: { type: "string" }, description: "10-12 question-format keywords" },
                    trending: { type: "array", items: { type: "string" }, description: "8-10 trending 2025/2026 keywords" },
                    lsi: { type: "array", items: { type: "string" }, description: "10-12 LSI semantically related terms" },
                  },
                  required: ["primary", "shortTail", "longTail", "faq", "trending", "lsi"],
                },
                onPageTips: { type: "array", items: { type: "string" }, description: "8-12 specific actionable on-page SEO tips" },
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
                contentSuggestions: { type: "array", items: { type: "string" }, description: "5-8 specific content sections to add" },
                competitorInsights: { type: "array", items: { type: "string" }, description: "5 competitor analysis insights" },
                seoScore: {
                  type: "object",
                  properties: {
                    overall: { type: "number", description: "Honest 0-100 score of CURRENT page state" },
                    breakdown: {
                      type: "object",
                      properties: {
                        metaTags: { type: "number" }, keywords: { type: "number" },
                        technicalSEO: { type: "number" }, schema: { type: "number" },
                        contentStructure: { type: "number" }, socialMeta: { type: "number" },
                      },
                    },
                    projectedScore: { type: "number", description: "Estimated score AFTER applying all suggestions" },
                    criticalIssues: { type: "array", items: { type: "string" }, description: "Issues that MUST be fixed immediately" },
                    warnings: { type: "array", items: { type: "string" }, description: "Issues that should be fixed soon" },
                    passed: { type: "array", items: { type: "string" }, description: "Things that are already good" },
                  },
                },
              },
          required: ["meta_title", "meta_description", "h1_tag", "keywords", "onPageTips", "technicalSEO", "socialMeta", "internalLinks", "contentSuggestions", "competitorInsights", "seoScore"],
            },
          },
        }],
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
    await logAIUsage("seo-enhance", "google/gemini-2.5-flash", aiData);
    console.log(`[ai-seo-enhance] AI analysis completed in ${Date.now() - aiStartTime}ms`);

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: any;
    if (toolCall?.function?.arguments) {
      const args = toolCall.function.arguments;
      try {
        suggestions = typeof args === "string" ? JSON.parse(args) : args;
      } catch (e) {
        console.error("[ai-seo-enhance] tool_call args parse failed:", e, "raw:", String(args).slice(0, 500));
        throw new Error("AI returned malformed tool arguments. Please retry.");
      }
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      if (!content.trim()) {
        const finishReason = aiData.choices?.[0]?.finish_reason;
        console.error("[ai-seo-enhance] Empty AI response. finish_reason:", finishReason, "full:", JSON.stringify(aiData).slice(0, 800));
        throw new Error(`AI returned empty response (finish_reason: ${finishReason || "unknown"}). The model may have hit its token/safety limit. Please retry.`);
      }
      if (detectTruncation(content)) console.warn("AI response appears truncated");
      try {
        suggestions = extractJsonFromResponse(content);
      } catch (e) {
        console.error("[ai-seo-enhance] JSON extract failed. Content preview:", content.slice(0, 500));
        throw new Error("AI did not return valid JSON. Please retry — this is usually transient.");
      }
    }

    // Wait for schema markup
    const schemaMarkup = await schemaPromise;
    suggestions.schemaMarkup = schemaMarkup;
    console.log(`[ai-seo-enhance] Schema generated (${schemaMarkup.length} items)`);

    // Include current state for before/after comparison
    suggestions.currentState = currentState;

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
    suggestions.internalLinks = { suggested: suggestions.internalLinks?.suggested || [], anchorTexts: suggestions.internalLinks?.anchorTexts || [] };
    suggestions.seoScore = suggestions.seoScore || { overall: 0, breakdown: {}, criticalIssues: [], warnings: [], passed: [] };
    suggestions.seoScore.projectedScore = suggestions.seoScore.projectedScore || Math.min(95, (suggestions.seoScore.overall || 0) + 30);

    console.log(`[ai-seo-enhance] Total time: ${Date.now() - startTime}ms. Score: ${suggestions.seoScore.overall}/100 → projected ${suggestions.seoScore.projectedScore}/100`);

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
