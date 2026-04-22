// AI College Writer — generates a full college profile (basic info, description, placements, SEO, etc.)
// using Lovable AI Gateway (google/gemini-2.5-flash) via tool-calling for structured output.
// Public endpoint (verify_jwt = false in supabase/config.toml is the project default).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CollegeBrief {
  name: string;
  slug?: string;
  city?: string;
  state?: string;
  type?: string; // IIM / Private / Government / Deemed / Autonomous / University
  tier?: string; // Tier 1..4
  category?: string; // IIM / Non-IIM
  targetKeyword?: string;
  secondaryKeywords?: string[];
  contentDateContext?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const brief = (await req.json()) as CollegeBrief;
    if (!brief?.name) {
      return new Response(
        JSON.stringify({ error: "name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetKw = (brief.targetKeyword || brief.name).trim();
    const secKws = (brief.secondaryKeywords || []).filter(Boolean);
    const dateCtx = brief.contentDateContext?.trim() ||
      "Use only the most recent verified data (2025-2026 admission cycle). Fees, placement figures, ranking and seat numbers must reflect the latest available year. Do NOT use outdated 2020-2023 figures unless the field is explicitly historical (e.g. founding year).";

    const systemPrompt = `You are a senior MBA/B-school researcher and SEO writer for the Indian audience. You write like a smart senior mentor talking to a student — clear, friendly, plain English, contractions allowed. NEVER fabricate facts. If a precise number is not well known, use a plausible range (e.g. "INR 18-25 LPA") rather than inventing one.

ACCURACY IS MANDATORY. For well-known Indian B-schools (all IIMs, XLRI, FMS, MDI, SPJIMR, IIFT, NMIMS, SIBM, JBIMS, IIT MBAs, ISB, Great Lakes, TAPMI, IMT, IMI, etc.) the following fields MUST be factually correct:
- founding/established year
- city + state
- type (IIM / Private / Government / Deemed / Autonomous / University)
- approximate national ranking band (NIRF tier)
- exams accepted (CAT/XAT/GMAT/NMAT/SNAP/CMAT etc.)
- accreditations (AACSB / AMBA / EQUIS / NBA / NAAC if held)
Reference points you must respect: XLRI Jamshedpur was founded in 1949. IIM Ahmedabad in 1961. IIM Bangalore in 1973. IIM Calcutta in 1961. FMS Delhi in 1954. JBIMS Mumbai in 1965. SPJIMR in 1981. MDI Gurgaon in 1973. IIFT in 1963. NMIMS in 1981. ISB Hyderabad in 2001.

Output uses HTML only: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. Never include <html>, <head>, <body>, <h1>, or markdown fences.`;

    const userPrompt = `Generate a complete, ready-to-publish profile for the following Indian MBA college / B-school. Verify every factual claim against your training knowledge of well-known Indian B-schools before writing.

# COLLEGE
- Name: ${brief.name}
- City: ${brief.city || "(use the actual city — never guess)"}
- State: ${brief.state || "(use the actual state)"}
- Type: ${brief.type || "(use the correct type: IIM/Private/Government/Deemed/Autonomous/University)"}
- Category: ${brief.category || "(IIM or Non-IIM — based on actual status)"}
- Tier: ${brief.tier || "(Tier 1 / Tier 2 / Tier 3 / Tier 4 — based on real NIRF/MBAU positioning)"}
- Primary target keyword: "${targetKw}"
- Secondary keywords: ${secKws.length ? secKws.map(k => `"${k}"`).join(", ") : "(none provided)"}
- Date context: ${dateCtx}

# HARD RULES
1. **FACTUAL ACCURACY (NON-NEGOTIABLE)**: established year, location, type, exams accepted, accreditations and ranking band MUST be correct for known institutions. If you are not confident about the establishment year of a less-famous institution, OMIT it (set established to null) rather than guessing. NEVER output a clearly wrong year (e.g. 2020 for a 1949 institution).
2. **LATEST DATA**: All fees, placement figures (avg/median/highest), seat counts and recruiter lists must reflect the most recent published cycle (2024-2025 placements / 2025-2026 admissions). State the data year context naturally inside the prose (e.g. "as per the 2025 placement report").
3. **HUMANIZED LANGUAGE**: Roughly 8th-grade reading level. Contractions, second person ("you"), concrete numbers. NO phrases like "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving".
4. **NEVER START WITH A QUESTION**. Headings and opening sentences must be DECLARATIVE statements that give a clear fact.
5. **DESCRIPTION (long-form HTML)**: 600-900 words covering history (with the CORRECT founding year), USP, campus, academic strength, ranking position in the Indian B-school landscape, who this college is best for. MUST start with a <p><strong>Quick Summary:</strong> ...</p> block (55-65 words) giving the core overview upfront — including the correct founding year and type. Then 4-6 <h2> sections (e.g. "About ${brief.name}", "Campus & Infrastructure", "Academic Strengths", "Why Choose ${brief.name}"). Use lists where helpful.
6. **ADMISSION PROCESS (HTML)**: 250-450 words. Cover eligibility, exams accepted (use the REAL exams), selection stages (written test / WAT / GD / PI), shortlisting weightage if known. Use <h3> subsections and bullet lists. NO question headings. Reference 2025-2026 cycle dates where applicable.
7. **ON-PAGE SEO MUST-HAVES** (build naturally into description):
   - Primary keyword in the first 100 words AND in at least 2 <h2> headings
   - Secondary keywords sprinkled naturally where they fit
   - 3-5 internal-link-style anchors with relative URLs, e.g. <a href="/colleges">top MBA colleges</a>, <a href="/exams/cat">CAT exam</a>, <a href="/coaching">CAT coaching</a>, <a href="/profile-analyzer">AI Profile Analyzer</a>, <a href="/mba-roi-calculator">MBA ROI Calculator</a>, <a href="/college-shortlister">College Shortlister</a>
   - Use <strong> on 6-10 high-value phrases (real names, key facts, numbers)
   - Include at least one HTML <table> (e.g. fees breakdown, placement summary, key facts)
   - Include a final <h2>Frequently Asked Questions</h2> section with 4-6 Q&A pairs (each Q in <h3>, A in <p>) for AI/voice-search and FAQ schema readiness
8. **STRUCTURED FIELDS**: Fill every required field in the tool schema with REAL, accurate values for known schools. For arrays (courses, accreditations, exams_accepted, top_recruiters, specializations, keywords) return real, realistic values — never placeholder lists.
9. **SEO META**: meta_title <=60 chars (declarative, includes primary keyword, no "?"). meta_description 140-160 chars (declarative, includes primary keyword). h1_tag declarative, no "?".
10. **SLUG**: lowercase-hyphenated, <=80 chars, derived from the college name.
11. **NO IMAGES**: Do not return logo_url or banner_url.

# OUTPUT — return JSON via the tool call below.`;

    const tool = {
      type: "function",
      function: {
        name: "publish_college_profile",
        description: "Return a fully-written, SEO-optimized college profile matching the brief.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string", description: "Long-form HTML description (600-900 words) starting with Quick Summary block." },
            city: { type: "string" },
            state: { type: "string" },
            type: { type: "string", enum: ["IIM", "Private", "Government", "Deemed", "Autonomous", "University"] },
            tier: { type: "string", enum: ["Tier 1", "Tier 2", "Tier 3", "Tier 4"] },
            college_category: { type: "string", enum: ["IIM", "Non-IIM"] },
            established: { type: ["integer", "null"], description: "Founding year. MUST be historically correct for known institutions (e.g. XLRI=1949, IIM-A=1961). Use null if genuinely unknown — never guess." },
            ranking: { type: "integer", description: "National ranking estimate (1-200). Use a realistic NIRF-band number." },
            fees: { type: "string", description: "Display fees, e.g. 'INR 24.5 Lakhs (2-year MBA)'" },
            fees_lakhs: { type: "number", description: "Numeric total program fee in lakhs, e.g. 24.5" },
            website: { type: "string" },
            placement_avg: { type: "string", description: "e.g. 'INR 25 LPA'" },
            placement_highest: { type: "string", description: "e.g. 'INR 80 LPA'" },
            placement_median: { type: "string", description: "e.g. 'INR 22 LPA'" },
            campus_size: { type: "string", description: "e.g. '100 acres'" },
            total_students: { type: "integer" },
            admission_process: { type: "string", description: "HTML, 250-450 words, declarative, no question headings." },
            courses: { type: "array", items: { type: "string" }, description: "MBA programs offered, e.g. ['PGP', 'PGPX', 'Executive MBA']" },
            accreditations: { type: "array", items: { type: "string" }, description: "e.g. ['AACSB', 'AMBA', 'EQUIS', 'NBA', 'NAAC A++']" },
            exams_accepted: { type: "array", items: { type: "string" }, description: "e.g. ['CAT', 'XAT', 'GMAT']" },
            top_recruiters: { type: "array", items: { type: "string" }, description: "8-15 real Indian/global recruiters" },
            specializations: { type: "array", items: { type: "string" }, description: "MBA specializations offered" },
            meta_title: { type: "string" },
            meta_description: { type: "string" },
            keywords: { type: "array", items: { type: "string" }, description: "8-12 SEO keywords (primary first)" },
            primary_keyword: { type: "string" },
            h1_tag: { type: "string" },
            funnel_stage: { type: "string", enum: ["awareness", "consideration", "decision"], description: "Default to 'consideration' for college pages." },
          },
          required: [
            "name", "slug", "description", "type", "tier", "college_category",
            "established", "ranking", "fees", "fees_lakhs", "placement_avg",
            "placement_highest", "placement_median", "campus_size", "total_students",
            "admission_process", "courses", "accreditations", "exams_accepted",
            "top_recruiters", "specializations", "meta_title", "meta_description",
            "keywords", "primary_keyword", "h1_tag", "funnel_stage",
          ],
          additionalProperties: false,
        },
      },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "publish_college_profile" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI generation failed", detail: txt.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiRes.json();
    console.log("AI finish_reason:", aiJson?.choices?.[0]?.finish_reason);
    const message = aiJson?.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    const rawArgs = toolCall?.function?.arguments;

    if (!rawArgs) {
      console.error("No tool call. Message preview:", JSON.stringify(message)?.slice(0, 800));
      return new Response(
        JSON.stringify({
          error: "AI did not return a structured college profile",
          detail: message?.content?.slice(0, 300) || "no content returned",
          finish_reason: aiJson?.choices?.[0]?.finish_reason,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let profile: any;
    try {
      profile = JSON.parse(rawArgs);
    } catch (e) {
      console.error("Parse fail. Length:", rawArgs.length, "Tail:", rawArgs.slice(-300));
      return new Response(
        JSON.stringify({ error: "AI output was truncated or malformed JSON. Try again.", detail: String(e).slice(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitise slug
    const slug = String(profile.slug || brief.slug || brief.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    return new Response(
      JSON.stringify({
        success: true,
        college: {
          ...profile,
          slug,
          // honour user-provided overrides where given
          name: brief.name || profile.name,
          city: brief.city || profile.city || null,
          state: brief.state || profile.state || null,
          type: brief.type || profile.type,
          tier: brief.tier || profile.tier,
          college_category: brief.category || profile.college_category,
          primary_keyword: targetKw,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-college-writer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
