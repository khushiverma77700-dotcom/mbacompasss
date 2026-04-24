// AI College Writer — generates a full college profile (basic info, description, placements, SEO, etc.)
// using Lovable AI Gateway (google/gemini-2.5-flash) via tool-calling for structured output.
// Public endpoint (verify_jwt = false in supabase/config.toml is the project default).

import { callAIGateway } from "../_shared/aiGateway.ts";
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
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();
    const freshness = `${currentYear - 1}-${currentYear + 1}`; // 2024–2026
    const admissionCycle = `${currentYear}-${currentYear + 1}`;
    const dateCtx = brief.contentDateContext?.trim() ||
      `Use only the most recent verified data (freshness window ${freshness}; active admission cycle ${admissionCycle}). Fees, placement figures, ranking and seat numbers must reflect the latest available year. Do NOT use outdated 2020-2023 figures unless the field is explicitly historical (e.g. founding year). Today is ${todayIso}.`;

    const systemPrompt = `You are a senior MBA / Masters-in-Management (MiM) researcher and SEO writer for the Indian audience. You write like a smart senior mentor talking to a student — clear, friendly, plain English, contractions allowed.

# COMPLETE-DATA MODE (NON-NEGOTIABLE)
- EVERY field in the output schema MUST be filled with substantive, useful, realistic content for ${currentYear}. Empty strings, "N/A", "Not available", "TBD", "Coming soon", "Contact for details" are STRICTLY FORBIDDEN.
- Use your full research depth: latest NIRF ${currentYear} ranking, official ${currentYear - 1}-${String(currentYear).slice(-2)} placement reports, ${admissionCycle} admission brochures, and well-documented public information. For top Indian B-schools (IIMs, XLRI, FMS, MDI, SPJIMR, IIFT, NMIMS, SIBM, JBIMS, IIT MBAs, ISB, Great Lakes, TAPMI, IMT, IMI, etc.) you have abundant verified data — USE IT.
- When the EXACT current-year figure is not in your training data, give a tight, well-reasoned, realistic range based on the most recent 2-3 years (e.g. "INR 28-34 LPA" for IIM-A average, "INR 24.5 Lakhs" for IIM-A 2-year fees). Never write "varies", "depends", or skip the field.
- For every list field (recruiters, accreditations, exams, courses, specializations) return AT LEAST the schema-required count of REAL, named entries — never placeholders like "Top Tech Company 1".

# SCOPE LOCK — MBA & MASTERS IN MANAGEMENT ONLY (NON-NEGOTIABLE)
- Cover ONLY MBA / PGP / PGDM / PGPM / MMS / MMM / EMBA / PGPX / PGCM / PGPBM / Executive MBA / 1-Year MBA / Masters in Management (MiM) programs.
- DO NOT mention or recommend B.Tech, M.Tech, BE, ME, BCA, MCA, B.Sc, M.Sc, engineering, medical, law, design, coding-bootcamp or data-science-certification courses. If the college also runs non-management programs, IGNORE them — only describe its management offerings.
- Courses[], specializations[], exams_accepted[], top_recruiters[] and all prose must be management-program-specific (Finance, Marketing, Operations, HR, Strategy, Business Analytics within MBA, Consulting, General Management).

# WELL-FORMATTED HTML
- Short paragraphs (2-4 sentences), semantic <ul>/<ol> for 3+ items, and at least one <table> in the long description (key facts / fees / placement summary).
- <h2> for major sub-sections, <h3> for nested. Never use a question as a heading. Bold key facts with <strong> (4-8 per block).

ACCURACY IS MANDATORY. For well-known Indian B-schools (all IIMs, XLRI, FMS, MDI, SPJIMR, IIFT, NMIMS, SIBM, JBIMS, IIT MBAs, ISB, Great Lakes, TAPMI, IMT, IMI, etc.) the following fields MUST be factually correct:
- founding/established year
- city + state
- type (IIM / Private / Government / Deemed / Autonomous / University)
- approximate national ranking band (NIRF tier)
- exams accepted (CAT/XAT/GMAT/NMAT/SNAP/CMAT etc.)
- accreditations (AACSB / AMBA / EQUIS / NBA / NAAC if held)
Reference points you must respect: XLRI Jamshedpur was founded in 1949. IIM Ahmedabad in 1961. IIM Bangalore in 1973. IIM Calcutta in 1961. FMS Delhi in 1954. JBIMS Mumbai in 1965. SPJIMR in 1981. MDI Gurgaon in 1973. IIFT in 1963. NMIMS in 1981. ISB Hyderabad in 2001.

FRESHNESS & CITATION RULES (MACHINE-READABLE):
- Today is ${todayIso}. Active admission cycle: ${admissionCycle}. Freshness window: ${freshness}.
- For EVERY key stat (NIRF rank, fees, average/highest/median package, intake) you MUST append a machine-readable inline citation marker in this EXACT shape: [src:<Source> <Year>]. Examples: [src:NIRF ${currentYear}], [src:Placement Report ${currentYear - 1}-${String(currentYear).slice(-2)}], [src:Admission Brochure ${currentYear}]. Our frontend converts these markers into clickable "view source" pills, so the syntax must be exact (square brackets, "src:" prefix, no quotes, no URLs).
- Use at least one [src:NIRF ${currentYear}], one [src:Placement Report …], and one [src:Admission Brochure …] across the description.
- The long-form description MUST end with a small italic line: <p><em>Last updated: ${todayIso}</em></p>

Output uses HTML only: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. Never include <html>, <head>, <body>, <h1>, or markdown fences. ABSOLUTELY NO inline style="" attributes, NO <font> tags, NO class="" / id="" attributes — plain semantic HTML only.`;

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
1. **COMPLETE DATA, NO BLANKS**: Fill every field with real, latest, useful content. If you don't have the exact ${currentYear} number, give a tight realistic ${currentYear - 1}-${currentYear} range — but NEVER leave anything as "N/A", "Not available", "Contact institute", empty string, or zero where zero is meaningless (total_students=0, fees_lakhs=0). placement_avg, placement_highest, placement_median, total_students, campus_size, fees, fees_lakhs, ranking, established MUST all be populated with concrete realistic values.
2. **FACTUAL ACCURACY (NON-NEGOTIABLE)**: established year, location, type, exams accepted, accreditations and ranking band MUST be correct for known institutions. NEVER output a clearly wrong year (e.g. 2020 for a 1949 institution). For lesser-known colleges, infer a realistic founding year from context (e.g. most Indian private B-schools were founded between 1985-2010).
3. **LATEST DATA (${currentYear})**: All fees, placement figures (avg/median/highest), seat counts and recruiter lists MUST reflect the most recent published cycle (${currentYear - 1}-${currentYear} placements / ${admissionCycle} admissions). State the data year context naturally inside the prose (e.g. "as per the ${currentYear} placement report").
4. **HUMANIZED LANGUAGE**: Roughly 8th-grade reading level. Contractions, second person ("you"), concrete numbers, real examples. NO phrases like "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving", "in today's fast-paced world".
5. **NEVER START WITH A QUESTION**. Headings and opening sentences must be DECLARATIVE statements that give a clear fact.
6. **DESCRIPTION (long-form HTML)**: 700-1000 words covering history (with the CORRECT founding year), USP, campus, academic strength, ranking position, who this college is best for. MUST start with a <p><strong>Quick Summary:</strong> ...</p> block (55-65 words) giving the core overview upfront — including the correct founding year and type. Then 5-7 <h2> sections (e.g. "About ${brief.name}", "Campus & Infrastructure", "Academic Strengths", "Placements ${currentYear - 1}-${currentYear}", "Fees & Scholarships", "Why Choose ${brief.name}"). Use lists, at least TWO <table>s (fees, placements), <strong> for key facts. End with <p><em>Last updated: ${todayIso}</em></p>.
7. **ADMISSION PROCESS (HTML)**: 300-500 words. Cover eligibility, exams accepted (REAL exams), selection stages (written test / WAT / GD / PI), shortlisting weightage, latest ${admissionCycle} cycle dates. Use <h3> subsections, bullet lists, and at least one <table> for the weightage / timeline. NO question headings.
8. **ON-PAGE SEO MUST-HAVES** (build naturally into description):
   - Primary keyword in the first 100 words AND in at least 2 <h2> headings
   - Secondary keywords sprinkled naturally where they fit
   - 4-6 internal-link-style anchors with relative URLs, e.g. <a href="/colleges">top MBA colleges</a>, <a href="/exams/cat">CAT exam</a>, <a href="/coaching">CAT coaching</a>, <a href="/profile-analyzer">AI Profile Analyzer</a>, <a href="/mba-roi-calculator">MBA ROI Calculator</a>, <a href="/college-shortlister">College Shortlister</a>
   - Use <strong> on 8-12 high-value phrases (real names, key facts, numbers)
   - Include a final <h2>Frequently Asked Questions</h2> section with 6-8 Q&A pairs (each Q in <h3>, A in <p>) for FAQ schema
   - Include short citation hints "(source: NIRF ${currentYear})" / "(source: placement report ${currentYear - 1}-${String(currentYear).slice(-2)})" near key stats
8. **STRUCTURED FIELDS**: Fill every required field in the tool schema with REAL, accurate values for known schools. For arrays (courses, accreditations, exams_accepted, top_recruiters, specializations, keywords) return real, realistic values — never placeholder lists.
9. **SEO META**: meta_title <=60 chars (declarative, includes primary keyword, no "?"). meta_description 140-160 chars (declarative, includes primary keyword + the year ${currentYear}). h1_tag declarative, no "?".
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

    const aiRes = await callAIGateway({
        // COST OPT: gemini-2.5-flash matches preview tier quality for tool-calling at ~30% lower cost.
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "publish_college_profile" } },
        max_tokens: 4000,
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

    // ── Auto-extract FAQs from the generated description for FAQ schema ──
    const extractFaqs = (html: string): { question: string; answer: string }[] => {
      if (!html) return [];
      const text = html;
      // Find each <h3>Question</h3><p>Answer</p> pair anywhere in the body
      const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
      const out: { question: string; answer: string }[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const q = m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const a = m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        // Heuristic: only treat as FAQ if heading reads like a question or is inside FAQ section context
        if (q && a && (q.endsWith("?") || /^(what|why|how|is|are|can|should|do|does|when|where|which|who)\b/i.test(q))) {
          out.push({ question: q, answer: a });
        }
      }
      // Dedupe
      const seen = new Set<string>();
      return out.filter((f) => {
        const k = f.question.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return f.answer.length >= 20;
      }).slice(0, 8);
    };

    const extractedFaqs = extractFaqs(profile.description || "");

    // ── FACTUALITY CHECK PASS — score high-risk fields and flag inconsistencies ──
    const currentYear = new Date().getFullYear();
    const factCheckTool = {
      type: "function",
      function: {
        name: "audit_college_facts",
        description: "Audit the AI-generated college profile for factual accuracy. Score each high-risk field as Verified/Range/Unknown and list any inconsistencies.",
        parameters: {
          type: "object",
          properties: {
            confidence: {
              type: "object",
              properties: {
                established: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                city: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                state: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                type: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                ranking: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                fees: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                placement_avg: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                placement_highest: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                exams_accepted: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                accreditations: { type: "string", enum: ["Verified", "Range", "Unknown"] },
              },
              required: [
                "established", "city", "state", "type", "ranking", "fees",
                "placement_avg", "placement_highest", "exams_accepted", "accreditations",
              ],
            },
            warnings: {
              type: "array",
              description: "List of concrete factual issues. Each warning names the field, the suspect value and the likely correct value or reason.",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  severity: { type: "string", enum: ["high", "medium", "low"] },
                  message: { type: "string" },
                  suggested: { type: "string" },
                },
                required: ["field", "severity", "message"],
              },
            },
            omit_fields: {
              type: "array",
              description: "Field names whose generated value is likely wrong AND no confident correction exists — frontend should drop these (set to null).",
              items: { type: "string" },
            },
          },
          required: ["confidence", "warnings", "omit_fields"],
          additionalProperties: false,
        },
      },
    };

    const auditPrompt = `Audit the following AI-generated profile of an Indian MBA / B-school for factual accuracy. Use ONLY your verified knowledge of well-known Indian B-schools. Flag anything that contradicts known facts (especially established year, city/state, type, exams accepted, accreditations, ranking band). Today's year is ${currentYear}.

PROFILE TO AUDIT (JSON):
${JSON.stringify({
  name: profile.name,
  established: profile.established,
  city: profile.city,
  state: profile.state,
  type: profile.type,
  ranking: profile.ranking,
  fees: profile.fees,
  placement_avg: profile.placement_avg,
  placement_highest: profile.placement_highest,
  exams_accepted: profile.exams_accepted,
  accreditations: profile.accreditations,
}, null, 2)}

RULES:
- "Verified" = you are highly confident this exact value is correct from training knowledge of this institution.
- "Range" = it's a plausible bracket / industry-standard estimate but not the precise published figure.
- "Unknown" = you cannot verify and the AI may have guessed.
- A wildly wrong establishment year for a known institution (e.g. 2020 for XLRI which is 1949) MUST be flagged severity:"high" with the correct year in "suggested".
- An establishment year > ${currentYear} or < 1800 MUST be flagged.
- Add the field to omit_fields ONLY when severity is high AND you have no confident correction.`;

    let factCheck: any = { confidence: {}, warnings: [], omit_fields: [] };
    try {
      const auditRes = await callAIGateway({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a meticulous fact-checker for Indian MBA / B-school profiles. You only confirm facts you are confident about; otherwise you flag them." },
            { role: "user", content: auditPrompt },
          ],
          tools: [factCheckTool],
          tool_choice: { type: "function", function: { name: "audit_college_facts" } },
          max_tokens: 2000,
        });
      if (auditRes.ok) {
        const auditJson = await auditRes.json();
        const auditArgs = auditJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (auditArgs) {
          try { factCheck = JSON.parse(auditArgs); } catch (_) { /* ignore */ }
        }
      } else {
        console.warn("Audit pass failed status:", auditRes.status);
      }
    } catch (e) {
      console.warn("Audit pass exception:", e);
    }

    // Deterministic guardrails on top of model audit
    const extraWarnings: any[] = [];
    if (typeof profile.established === "number") {
      if (profile.established > currentYear) {
        extraWarnings.push({ field: "established", severity: "high", message: `Established year ${profile.established} is in the future.`, suggested: "" });
      } else if (profile.established < 1800) {
        extraWarnings.push({ field: "established", severity: "high", message: `Established year ${profile.established} looks wrong.`, suggested: "" });
      }
    }
    if (Array.isArray(factCheck.warnings)) {
      factCheck.warnings = [...factCheck.warnings, ...extraWarnings];
    } else {
      factCheck.warnings = extraWarnings;
    }

    // Complete-Data Mode: keep all populated fields. The audit metadata is still
    // returned (factCheck.warnings) so the admin UI can surface low-confidence
    // values, but we never null them out — empty fields hurt the page worse
    // than a confidence-flagged value.
    const safeProfile: any = { ...profile };

    return new Response(
      JSON.stringify({
        success: true,
        college: {
          ...safeProfile,
          slug,
          // honour user-provided overrides where given
          name: brief.name || safeProfile.name,
          city: brief.city || safeProfile.city || null,
          state: brief.state || safeProfile.state || null,
          type: brief.type || safeProfile.type,
          tier: brief.tier || safeProfile.tier,
          college_category: brief.category || safeProfile.college_category,
          primary_keyword: targetKw,
        },
        faqs: extractedFaqs,
        factCheck,
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
