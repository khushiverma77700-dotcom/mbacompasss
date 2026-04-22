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
      "Use only the most recent dates, fees, placement figures and statistics (2025-2026). Do NOT use outdated years.";

    const systemPrompt = `You are an expert MBA/B-school content researcher and SEO writer for the Indian audience. You produce factual, well-structured college profiles in a clear, friendly, HUMAN voice — like a smart senior mentor talking to a student. Plain English, short sentences, contractions allowed. Avoid corporate jargon and robotic AI phrasing. For long-form fields you may use HTML (<h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td>). Never include <html>, <head>, <body>, <h1>, or markdown fences. If unsure of a precise number, use plausible ranges (e.g. "INR 18-25 LPA") rather than inventing numbers.`;

    const userPrompt = `Generate a complete, ready-to-publish profile for the following Indian MBA college / B-school.

# COLLEGE
- Name: ${brief.name}
- City: ${brief.city || "(infer if well known, else leave blank)"}
- State: ${brief.state || "(infer if well known, else leave blank)"}
- Type: ${brief.type || "(infer: IIM/Private/Government/Deemed/Autonomous/University)"}
- Category: ${brief.category || "(IIM or Non-IIM)"}
- Tier: ${brief.tier || "(Tier 1 / Tier 2 / Tier 3 / Tier 4)"}
- Primary target keyword: "${targetKw}"
- Secondary keywords: ${secKws.length ? secKws.map(k => `"${k}"`).join(", ") : "(none provided)"}
- Date context: ${dateCtx}

# HARD RULES
1. **HUMANIZED LANGUAGE**: Write at roughly an 8th-grade reading level. Use contractions, real examples, second person ("you"), and concrete numbers. NO phrases like "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving".
2. **NEVER START WITH A QUESTION**. Headings and opening sentences must be DECLARATIVE statements that give a clear fact.
3. **DESCRIPTION (long-form HTML)**: 600-900 words covering history, USP, campus, academic strength, ranking position in Indian B-school landscape, who this college is best for. MUST start with a <p><strong>Quick Summary:</strong> ...</p> block (55-65 words) giving the core overview upfront. Then 4-6 <h2> sections (e.g. "About ${brief.name}", "Campus & Infrastructure", "Academic Strengths", "Why Choose ${brief.name}"). Use lists where helpful.
4. **ADMISSION PROCESS (HTML)**: 250-450 words. Cover eligibility, exams accepted, selection stages (written test / WAT / GD / PI), shortlisting weightage if known. Use <h3> subsections and bullet lists. NO question headings.
5. **ON-PAGE SEO MUST-HAVES** (build naturally into description):
   - Primary keyword in the first 100 words AND in at least 2 <h2> headings
   - Secondary keywords sprinkled naturally where they fit
   - 2-4 internal-link-style anchors to relevant site sections, e.g. <a href="/colleges">top MBA colleges</a>, <a href="/exams/cat">CAT exam</a>, <a href="/coaching">CAT coaching</a>, <a href="/profile-analyzer">AI Profile Analyzer</a>, <a href="/mba-roi-calculator">MBA ROI Calculator</a>, <a href="/college-shortlister">College Shortlister</a>
   - Use <strong> on 6-10 high-value phrases
6. **REAL DATA**: Use realistic Indian MBA ecosystem context (CAT/XAT/NMAT/SNAP/CMAT, IIMs, top private B-schools, fees in lakhs, packages in LPA, 2025-2026 cycle).
7. **STRUCTURED FIELDS**: Fill every field in the tool schema. For arrays (courses, accreditations, exams_accepted, top_recruiters, specializations, keywords), return real, realistic values.
8. **SEO META**: meta_title <=60 chars (declarative, includes primary keyword, no "?"). meta_description 140-160 chars (declarative, includes primary keyword). h1_tag declarative, no "?".
9. **SLUG**: lowercase-hyphenated, <=80 chars, derived from the college name.
10. **NO IMAGES**: Do not return logo_url or banner_url.

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
            established: { type: "integer", description: "Founding year, e.g. 1961" },
            ranking: { type: "integer", description: "National ranking estimate (1-200). Use a realistic number." },
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
        model: "google/gemini-2.5-flash",
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
