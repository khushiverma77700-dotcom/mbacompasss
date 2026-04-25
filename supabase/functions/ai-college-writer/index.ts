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
  bulkMode?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Caller (e.g. bulk dashboard) can pick which AI backend to use via header.
  const providerHeader = (req.headers.get("X-AI-Provider") || "").toLowerCase();
  const provider: "gemini" | "lovable" = providerHeader === "lovable" ? "lovable" : "gemini";

  try {
    const requiredKey = provider === "lovable" ? "LOVABLE_API_KEY" : "GEMINI_API_KEY";
    if (!Deno.env.get(requiredKey)) throw new Error(`${requiredKey} is not configured`);

    const brief = (await req.json()) as CollegeBrief;
    if (!brief?.name) {
      return new Response(
        JSON.stringify({ error: "name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetKw = (brief.targetKeyword || brief.name).trim();
    const bulkMode = brief.bulkMode === true;
    const secKws = (brief.secondaryKeywords || []).filter(Boolean);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();
    const freshness = `${currentYear - 1}-${currentYear + 1}`; // 2024–2026
    const admissionCycle = `${currentYear}-${currentYear + 1}`;
    const dateCtx = brief.contentDateContext?.trim() ||
      `Use only the most recent verified data (freshness window ${freshness}; active admission cycle ${admissionCycle}). Fees, placement figures, ranking and seat numbers must reflect the latest available year. Do NOT use outdated 2020-2023 figures unless the field is explicitly historical (e.g. founding year). Today is ${todayIso}.`;

    const systemPrompt = `You are a senior MBA / Masters-in-Management (MiM) researcher and SEO writer for the Indian audience. You write like a smart senior mentor talking to a student — clear, friendly, plain English, contractions allowed, second-person ("you"). Goal: produce industry-leading, deeply researched, plagiarism-free content that ranks #1 on Google and outperforms Shiksha, Collegedunia and CareerLauncher.

# RESEARCH-FIRST APPROACH (MANDATORY)
- Perform deep, multi-source mental research BEFORE writing each section. Cross-check facts against NIRF ${currentYear}, official placement reports, AICTE/NAAC listings, school brochures and reputable Indian education media.
- Never produce shallow, generic, or assumption-based content. Every paragraph must carry concrete data — real recruiter names, real numbers, real dates, real specialisations.

# COMPLETE-DATA MODE (NON-NEGOTIABLE)
- EVERY field in the output schema MUST be filled with substantive, useful, realistic content for ${currentYear}. Empty strings, "N/A", "Not available", "TBD", "Coming soon", "Contact for details" are STRICTLY FORBIDDEN.
- Use your full research depth: latest NIRF ${currentYear} ranking, official ${currentYear - 1}-${String(currentYear).slice(-2)} placement reports, ${admissionCycle} admission brochures, and well-documented public information. For top Indian B-schools (IIMs, XLRI, FMS, MDI, SPJIMR, IIFT, NMIMS, SIBM, JBIMS, IIT MBAs, ISB, Great Lakes, TAPMI, IMT, IMI, etc.) you have abundant verified data — USE IT.
- When the EXACT current-year figure is not in your training data, give a tight, well-reasoned, realistic range based on the most recent 2-3 years (e.g. "INR 28-34 LPA" for IIM-A average, "INR 24.5 Lakhs" for IIM-A 2-year fees). Never write "varies", "depends", or skip the field.
- For every list field (recruiters, accreditations, exams, courses, specializations) return AT LEAST the schema-required count of REAL, named entries — never placeholders like "Top Tech Company 1".

# COLLEGE-NAME WEAVING (SEO + TOPICAL AUTHORITY)
- Use the EXACT college name "${brief.name}" naturally throughout the description — aim for 12-20 mentions across the long-form description, distributed across paragraphs, headings, table captions, and FAQ answers. Never spam consecutively, but never let two H2 sections pass without naming the college.
- At least 4 of the H2/H3 headings MUST contain the college name (e.g. "About ${brief.name}", "Placements at ${brief.name} ${currentYear}", "Why Choose ${brief.name}", "${brief.name} Admission ${admissionCycle}", "${brief.name} Fees & Scholarships", "${brief.name} Campus Life", "${brief.name} FAQs").
- Every FAQ question and answer MUST mention "${brief.name}" by name.
- meta_title and h1_tag MUST contain "${brief.name}" verbatim.

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

Output uses HTML only: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. Never include <html>, <head>, <body>, <h1>, or markdown fences. ABSOLUTELY NO inline style="" attributes, NO <font> tags, NO class="" / id="" attributes — plain semantic HTML only.

# CRITICAL OUTPUT HYGIENE
- NEVER emit the literal characters "\\n", "\n", "/n", or any visible escape sequence inside any string field. Use real <p>, <br>, <li> tags or actual newlines — the frontend renders "\\n" as raw text and breaks the page.
- Do NOT wrap output in markdown code fences. Return plain JSON via the tool call.

# DEEP-RESEARCH MODE
- Before writing each section, mentally verify the facts against the most authoritative public sources (NIRF, official placement reports, school brochures, AICTE/NAAC listings). No shallow filler — every paragraph must carry concrete data, named recruiters, real numbers or specific dates.`;

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
6. **DESCRIPTION (long-form HTML, 1500-2200 words — DEEP & COMPREHENSIVE)**: Cover history & legacy, rankings (national + global), accreditations, courses offered, admission process summary, eligibility, entrance exams accepted, cut-off trends, fees structure breakdown, placements (avg/median/highest/recruiters/trends), ROI analysis, campus infrastructure, faculty strength, student life, internships & industry exposure, scholarships, alumni network, comparisons with peer colleges. MUST start with a <p><strong>Quick Summary:</strong> ...</p> block (70-90 words) giving the core overview upfront — including the correct founding year and type. Then 9-13 <h2> sections such as: "About ${brief.name}", "${brief.name} History & Legacy", "${brief.name} Rankings & Accreditations", "Courses Offered at ${brief.name}", "${brief.name} Admission Process ${admissionCycle}", "${brief.name} Fees Structure & ROI", "${brief.name} Placements ${currentYear - 1}-${currentYear}", "Campus Infrastructure at ${brief.name}", "Faculty & Academic Strengths", "Student Life & Clubs", "Scholarships at ${brief.name}", "${brief.name} vs Peer B-Schools", "Why Choose ${brief.name}", "${brief.name} FAQs". Each H2 section MUST be 120-200 words minimum — never one-liners. Use semantic <ul>/<ol> for any 3+ enumeration. Include AT LEAST THREE <table>s (Fees breakdown; Placements summary; NIRF/peer comparison). Use <strong> on 15-25 high-value phrases. End with <p><em>Last updated: ${todayIso}</em></p>.
7. **ADMISSION PROCESS (HTML, 500-800 words)**: Cover eligibility (academic + work-ex + reservation), exams accepted (REAL exams with cut-off bands), selection stages (written test / WAT / GD / PI), shortlisting weightage, latest ${admissionCycle} cycle dates, application fees, documents required, and tips to crack the process at ${brief.name}. Use <h3> subsections, bullet lists, and at least TWO <table>s (selection-criteria weightage; ${admissionCycle} timeline). Mention "${brief.name}" at least 6 times naturally. NO question headings.
8. **ON-PAGE SEO MUST-HAVES** (build naturally into description):
   - Primary keyword AND college name "${brief.name}" both in the first 100 words AND in at least 4 <h2> headings
   - Secondary keywords sprinkled naturally — every secondary keyword should appear at least once
   - Long-tail variants ("${brief.name} fees", "${brief.name} placements ${currentYear}", "${brief.name} cut-off", "${brief.name} admission ${admissionCycle}", "${brief.name} ranking", "${brief.name} courses", "${brief.name} ROI") woven naturally
   - 6-10 internal-link-style anchors with relative URLs, e.g. <a href="/colleges">top MBA colleges in India</a>, <a href="/exams/cat">CAT exam</a>, <a href="/exams/xat">XAT exam</a>, <a href="/coaching">CAT coaching</a>, <a href="/profile-analyzer">AI Profile Analyzer</a>, <a href="/mba-roi-calculator">MBA ROI Calculator</a>, <a href="/college-shortlister">College Shortlister</a>
   - Use <strong> on 15-25 high-value phrases (real names, key facts, numbers)
   - Include a final <h2>${brief.name} Frequently Asked Questions</h2> section with 8-10 Q&A pairs (each Q in <h3> mentioning "${brief.name}", A in <p> 50-90 words mentioning "${brief.name}")
   - Include short citation hints "(source: NIRF ${currentYear})" / "(source: placement report ${currentYear - 1}-${String(currentYear).slice(-2)})" near key stats
8. **STRUCTURED FIELDS**: Fill every required field in the tool schema with REAL, accurate values for known schools. For arrays (courses, accreditations, exams_accepted, top_recruiters, specializations, keywords) return real, realistic values — never placeholder lists.
9. **SEO META**: meta_title <=60 chars (declarative, includes primary keyword, no "?"). meta_description 140-160 chars (declarative, includes primary keyword + the year ${currentYear}). h1_tag declarative, no "?".
10. **SLUG**: lowercase-hyphenated, <=80 chars, derived from the college name.
11. **NO IMAGES**: Do not return logo_url or banner_url.

# OUTPUT — return JSON via the tool call below.`;

    const repairJSON = (s: string): string => {
      let out = s;
      // strip control chars (except \n \r \t)
      out = out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      // remove trailing commas before } or ]
      out = out.replace(/,(\s*[}\]])/g, "$1");
      // quote unquoted object keys: { foo: ... } or , foo:
      out = out.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_\-]*)\s*:/g, '$1"$2":');
      // convert single-quoted string values to double-quoted (best-effort)
      out = out.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner) => {
        const safe = String(inner).replace(/"/g, '\\"');
        return `: "${safe}"`;
      });
      return out;
    };

    const extractJSON = (raw: string) => {
      let cleaned = String(raw)
        .replace(/^```json\s*/im, "")
        .replace(/^```\s*/im, "")
        .replace(/```\s*$/im, "")
        .trim();

      if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
        const objStart = cleaned.indexOf("{");
        const arrStart = cleaned.indexOf("[");
        const isArray = arrStart !== -1 && (objStart === -1 || arrStart < objStart);
        const start = isArray ? arrStart : objStart;
        const end = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) {
          cleaned = cleaned.slice(start, end + 1);
        }
      }

      try {
        return JSON.parse(cleaned);
      } catch (firstErr) {
        // Attempt repair
        try {
          return JSON.parse(repairJSON(cleaned));
        } catch (_e2) {
          // Try truncating to last balanced brace
          const lastBrace = cleaned.lastIndexOf("}");
          if (lastBrace > 0) {
            try {
              return JSON.parse(repairJSON(cleaned.slice(0, lastBrace + 1)));
            } catch (_e3) { /* fall through */ }
          }
          throw firstErr;
        }
      }
    };

    const callJsonModel = async ({
      system,
      user,
      maxTokens,
      label,
    }: {
      system: string;
      user: string;
      maxTokens: number;
      label: string;
    }) => {
      const res = await callAIGateway({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
      }, { feature: "ai-college-writer", provider, purpose: "structured" });

      if (!res.ok) {
        const txt = await res.text();
        console.error(`${label} AI error:`, res.status, txt);
        if (res.status === 429) throw new Error("RATE_LIMIT");
        if (res.status === 402) throw new Error("GEMINI_QUOTA");
        throw new Error(`${label} failed: ${txt.slice(0, 500)}`);
      }

      const payload = await res.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`${label} returned empty JSON content`);
      }

      try {
        return extractJSON(content);
      } catch (parseError) {
        throw new Error(`${label} returned malformed JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    };

    const callToolModel = async ({
      system,
      user,
      maxTokens,
      label,
      tool,
    }: {
      system: string;
      user: string;
      maxTokens: number;
      label: string;
      tool: any;
    }) => {
      let lastParseError = "";

      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await callAIGateway({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `${system}\n\nYou MUST respond by calling the provided function only. Do not write raw JSON in message.content.` },
            {
              role: "user",
              content: attempt === 0
                ? user
                : `${user}\n\nRETRY ${attempt + 1}: Your previous function arguments were not valid JSON (${lastParseError}). Call the function again with shorter, valid, escaped string values. Keep arrays concise. Do not include unescaped quotes or raw line breaks inside strings.`,
            },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: tool.function.name } },
          max_tokens: maxTokens,
        }, { feature: "ai-college-writer", provider });

        if (!res.ok) {
          const txt = await res.text();
          console.error(`${label} AI error:`, res.status, txt);
          if (res.status === 429) throw new Error("RATE_LIMIT");
          if (res.status === 402) throw new Error("GEMINI_QUOTA");
          throw new Error(`${label} failed: ${txt.slice(0, 500)}`);
        }

        const payload = await res.json();
        const message = payload?.choices?.[0]?.message;
        const args = message?.tool_calls?.[0]?.function?.arguments;
        const content = message?.content;

        if (args && typeof args === "object") return args;

        const raw = typeof args === "string" && args.trim()
          ? args
          : (typeof content === "string" ? content : "");

        if (!raw.trim()) {
          lastParseError = "empty function arguments";
          continue;
        }

        try {
          return extractJSON(raw);
        } catch (parseError) {
          lastParseError = parseError instanceof Error ? parseError.message : String(parseError);
          console.warn(`${label} parse attempt ${attempt + 1} failed:`, lastParseError);
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
        }
      }

      throw new Error(`${label} returned malformed JSON after retry: ${lastParseError}`);
    };

    const callTextModel = async ({
      system,
      user,
      maxTokens,
      label,
    }: {
      system: string;
      user: string;
      maxTokens: number;
      label: string;
    }) => {
      const res = await callAIGateway({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxTokens,
      }, { feature: "ai-college-writer", provider });

      if (!res.ok) {
        const txt = await res.text();
        console.error(`${label} AI error:`, res.status, txt);
        if (res.status === 429) throw new Error("RATE_LIMIT");
        if (res.status === 402) throw new Error("GEMINI_QUOTA");
        throw new Error(`${label} failed: ${txt.slice(0, 500)}`);
      }

      const payload = await res.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`${label} returned empty HTML content`);
      }

      return content
        .replace(/^```html\s*/im, "")
        .replace(/^```\s*/im, "")
        .replace(/```\s*$/im, "")
        .trim();
    };

    const handleModelError = (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (message === "GEMINI_QUOTA") {
        return new Response(
          JSON.stringify({ error: "Google Gemini quota or billing limit reached. Please check the configured API key." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI generation failed", detail: message.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    };

    let profile: any;
    try {
      const coreFieldsTool = {
        type: "function",
        function: {
          name: "college_core_fields",
          description: "Return compact structured core fields for one Indian MBA college profile. Do not include long HTML description or admission_process.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              slug: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              type: { type: "string" },
              tier: { type: "string" },
              college_category: { type: "string" },
              established: { type: "number" },
              ranking: { type: "number" },
              fees: { type: "string" },
              fees_lakhs: { type: "number" },
              website: { type: "string" },
              placement_avg: { type: "string" },
              placement_highest: { type: "string" },
              placement_median: { type: "string" },
              campus_size: { type: "string" },
              total_students: { type: "number" },
              courses: { type: "array", minItems: 3, items: { type: "string" } },
              accreditations: { type: "array", minItems: 2, items: { type: "string" } },
              exams_accepted: { type: "array", minItems: 2, items: { type: "string" } },
              top_recruiters: { type: "array", minItems: 8, items: { type: "string" } },
              specializations: { type: "array", minItems: 6, items: { type: "string" } },
              meta_title: { type: "string" },
              meta_description: { type: "string" },
              keywords: { type: "array", minItems: 6, items: { type: "string" } },
              primary_keyword: { type: "string" },
              h1_tag: { type: "string" },
              funnel_stage: { type: "string" },
            },
            required: [
              "name", "slug", "city", "state", "type", "tier", "college_category", "established",
              "ranking", "fees", "fees_lakhs", "website", "placement_avg", "placement_highest",
              "placement_median", "campus_size", "total_students", "courses", "accreditations",
              "exams_accepted", "top_recruiters", "specializations", "meta_title", "meta_description",
              "keywords", "primary_keyword", "h1_tag", "funnel_stage",
            ],
            additionalProperties: false,
          },
        },
      };

      profile = await callToolModel({
        label: "college core fields",
        maxTokens: 3200,
        system: `${systemPrompt}\n\nReturn compact structured data only through the function call. Do NOT include description or admission_process in this response. Keep every string concise to avoid truncation.`,
        user: `${userPrompt}\n\nCall college_core_fields with ONLY the requested compact fields. Do not include HTML fields in this step.`,
        tool: coreFieldsTool,
      });
    } catch (error) {
      return handleModelError(error);
    }

    const contentSeed = {
      name: profile.name || brief.name,
      city: brief.city || profile.city || "",
      state: brief.state || profile.state || "",
      type: brief.type || profile.type || "",
      tier: brief.tier || profile.tier || "",
      college_category: brief.category || profile.college_category || "",
      established: profile.established,
      ranking: profile.ranking,
      fees: profile.fees,
      fees_lakhs: profile.fees_lakhs,
      placement_avg: profile.placement_avg,
      placement_highest: profile.placement_highest,
      placement_median: profile.placement_median,
      campus_size: profile.campus_size,
      total_students: profile.total_students,
      courses: profile.courses,
      accreditations: profile.accreditations,
      exams_accepted: profile.exams_accepted,
      top_recruiters: profile.top_recruiters,
      specializations: profile.specializations,
      website: profile.website,
      keywords: profile.keywords,
      primary_keyword: targetKw,
    };

    const bulkOverride = bulkMode
      ? "\n\nBULK MODE OVERRIDE: Keep this response compact and complete. Follow the shorter word counts in the user request even if earlier rules ask for longer content."
      : "";
    const descriptionSystem = `${systemPrompt}${bulkOverride}\n\nReturn ONLY plain semantic HTML for the long-form college description. No JSON. No markdown fences. No commentary before or after the HTML.`;
    const admissionSystem = `${systemPrompt}${bulkOverride}\n\nReturn ONLY plain semantic HTML for the admission_process section. No JSON. No markdown fences. No commentary before or after the HTML.`;

    let descriptionHtml = "";
    let admissionHtml = "";
    try {
      [descriptionHtml, admissionHtml] = await Promise.all([
        callTextModel({
          label: "college description",
          maxTokens: bulkMode ? 2400 : 4200,
          system: descriptionSystem,
          user: bulkMode
            ? `Using the structured profile below, write a concise ready-to-publish HTML description for ${brief.name}.\n\nSTRUCTURED PROFILE:\n${JSON.stringify(contentSeed, null, 2)}\n\nRequirements:\n- 450-650 words\n- start with <p><strong>Quick Summary:</strong> ...</p>\n- 4-5 <h2> sections\n- include 1 compact <table>\n- final FAQ section with 3 Q&A pairs\n- include citation markers like [src:NIRF ${currentYear}]\n- end with <p><em>Last updated: ${todayIso}</em></p>`
            : `Using the structured profile below, write the complete long-form HTML description for ${brief.name}.\n\nSTRUCTURED PROFILE:\n${JSON.stringify(contentSeed, null, 2)}\n\nRequirements:\n- 900-1300 words\n- start with <p><strong>Quick Summary:</strong> ...</p>\n- 6-8 <h2> sections\n- at least 2 <table>s\n- final FAQ section with 5-6 Q&A pairs\n- include citation markers like [src:NIRF ${currentYear}]\n- end with <p><em>Last updated: ${todayIso}</em></p>`,
        }),
        callTextModel({
          label: "college admission process",
          maxTokens: bulkMode ? 1600 : 2600,
          system: admissionSystem,
          user: bulkMode
            ? `Using the structured profile below, write the HTML admission_process field for ${brief.name}.\n\nSTRUCTURED PROFILE:\n${JSON.stringify(contentSeed, null, 2)}\n\nRequirements:\n- 250-400 words\n- cover eligibility, exams accepted, selection steps, dates, fees, documents, tips\n- use <h3> subsections, bullet list, and 1 compact <table>\n- mention ${brief.name} naturally\n- end with a short freshness line for ${admissionCycle}`
            : `Using the structured profile below, write the HTML admission_process field for ${brief.name}.\n\nSTRUCTURED PROFILE:\n${JSON.stringify(contentSeed, null, 2)}\n\nRequirements:\n- 450-700 words\n- cover eligibility, exams accepted, selection steps, dates, fees, documents, tips\n- use <h3> subsections, bullet lists, and at least 2 <table>s\n- mention ${brief.name} at least 6 times naturally\n- end with a short freshness line for ${admissionCycle}`,
        }),
      ]);
    } catch (error) {
      return handleModelError(error);
    }

    profile.description = descriptionHtml.trim();
    profile.admission_process = admissionHtml.trim();

    if (!profile.description || !profile.admission_process) {
      return new Response(
        JSON.stringify({ error: "AI returned incomplete college content", detail: "Missing description or admission_process HTML" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip stray "\n" / "\\n" / "/n" escape artifacts the model sometimes leaks as visible text.
    const stripEscapeArtifacts = (s: string): string =>
      String(s)
        .replace(/\\+n/gi, " ")
        .replace(/(^|[\s>])\/n(?=[\s<]|$)/gi, "$1 ")
        .replace(/<p>\s*(?:\\n|\/n|\s)*\s*<\/p>/gi, "")
        .replace(/<li>\s*(?:\\n|\/n|\s)*\s*<\/li>/gi, "")
        .replace(/[ \t]{2,}/g, " ");
    for (const k of ["description", "admission_process"]) {
      if (typeof profile[k] === "string") profile[k] = stripEscapeArtifacts(profile[k]);
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
    if (!bulkMode) try {
      const auditRes = await callAIGateway({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a meticulous fact-checker for Indian MBA / B-school profiles. You only confirm facts you are confident about; otherwise you flag them." },
            { role: "user", content: auditPrompt },
          ],
          tools: [factCheckTool],
          tool_choice: { type: "function", function: { name: "audit_college_facts" } },
          max_tokens: 2000,
        }, { feature: "ai-college-writer", provider });
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
