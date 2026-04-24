// AI Institute Writer — generates a full coaching-institute profile
// (basic info, description, courses, faculty, results, SEO, etc.) using
// Lovable AI Gateway via tool-calling for structured output.
// Public endpoint — keep verify_jwt = false (project default).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InstituteBrief {
  name: string;
  slug?: string;
  city?: string;
  state?: string;
  mode?: string;             // Offline / Online / Hybrid
  category?: string;         // e.g. CAT, GMAT, GATE — passes through to category_id mapping client-side
  targetKeyword?: string;
  secondaryKeywords?: string[];
  contentDateContext?: string;
  examFocus?: string[];      // ["CAT","XAT","GMAT","NMAT","SNAP","CMAT"] — what coaching covers
  flagshipPrograms?: string[]; // optional seed of known programs
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const brief = (await req.json()) as InstituteBrief;
    if (!brief?.name) {
      return new Response(
        JSON.stringify({ error: "name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetKw = (brief.targetKeyword || brief.name).trim();
    const secKws = (brief.secondaryKeywords || []).filter(Boolean);
    const exams = (brief.examFocus || []).filter(Boolean);
    const flagship = (brief.flagshipPrograms || []).filter(Boolean);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();
    const freshness = `${currentYear - 1}-${currentYear + 1}`;
    const admissionCycle = `${currentYear}-${currentYear + 1}`;
    const dateCtx = brief.contentDateContext?.trim() ||
      `Use only the most recent verified data (freshness window ${freshness}; active coaching batch cycle ${admissionCycle}). Fees, batch start dates, success-stories and selection numbers must reflect the latest published year. Today is ${todayIso}.`;

    const systemPrompt = `You are a senior MBA-entrance coaching researcher and SEO writer for the Indian audience. You write like a smart senior mentor talking to a CAT/XAT/GMAT aspirant — clear, friendly, plain English, contractions allowed.

# COMPLETE-DATA MODE (NON-NEGOTIABLE)
- EVERY field in the output schema MUST be filled with substantive, useful, realistic ${currentYear} content. Empty strings, "N/A", "Not available", "TBD", "Coming soon", "Contact for details" are STRICTLY FORBIDDEN.
- For well-known brands (TIME=1992, IMS=1977, Career Launcher=1995, 2IIM, iQuanta, Bulls Eye, Endeavor, Cracku, Hitbullseye) you have abundant verified data — USE IT.
- When the EXACT current-year figure is not in your training data, give a tight realistic ${currentYear - 1}-${currentYear} range (e.g. "INR 35,000 - 55,000" for full CAT classroom). Never write "varies", "depends", "contact for details", or skip the field.
- programs[], faculty_highlights[], results[], features[], exams_covered[], specializations[] MUST each return at least the schema-required count of REAL named entries. fees_lakhs MUST be > 0. students_count MUST be > 0. success_rate MUST be > 0.
- Phone/email/website: if not 100% memorized, return a realistic public-facing pattern (e.g. info@${brief.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.in, +91-XXX-XXXXXXX placeholder is FORBIDDEN — instead use a real central helpline format like "1800-XXX-XXXX (toll-free)" only if you actually know it; otherwise leave as empty string and the admin will fill it).

# SCOPE LOCK — MBA / MASTERS-IN-MANAGEMENT ENTRANCE COACHING ONLY (NON-NEGOTIABLE)
- Cover ONLY coaching for management-entrance exams: CAT, XAT, GMAT, GRE-for-MiM, NMAT, SNAP, CMAT, MAT, MAH-CET, IIFT, TISSNET, MICAT, KMAT.
- DO NOT mention or recommend coaching for JEE, NEET, GATE, UPSC, SSC, banking, CA/CS, coding bootcamps, or school-level tuition. If the institute also runs non-MBA verticals, IGNORE them — write only about its MBA-entrance coaching.
- Programs[], specializations[], courses[], features[] and all prose must be MBA-entrance-coaching specific (CAT classroom, CAT online, XAT crash, GMAT bootcamp, GD-PI-WAT prep, mock test series, IIM interview prep, etc.).

# WELL-FORMATTED HTML
- Short paragraphs (2-4 sentences), semantic <ul>/<ol> for 3+ items, and at least one <table> in the long description (e.g. course / fee / batch comparison).
- <h2> for major sub-sections, <h3> for nested. Never use a question as a heading. Bold key facts with <strong> (4-8 per block).

ACCURACY IS MANDATORY. For well-known Indian MBA-prep brands (TIME, IMS, Career Launcher, Bulls Eye, Endeavor, 2IIM, iQuanta, Cracku, BYJU'S Exam Prep, T.I.M.E., Career Anna, CL, Hitbullseye) the following fields MUST be factually correct:
- founding/established era (TIME = 1992, IMS = 1977, Career Launcher = 1995, etc.)
- headquarters city
- mode (offline / online / hybrid)
- exam coverage (CAT/XAT/GMAT etc.)
- known flagship products (e.g. TIME's "AIMCAT", IMS's "SimCATs", CL's "Mock CAT", 2IIM's "CAT Online")

FRESHNESS & CITATION RULES (MACHINE-READABLE):
- Today is ${todayIso}. Active batch cycle: ${admissionCycle}. Freshness window: ${freshness}.
- For EVERY key stat (success rate, fees, students taught, IIM/MBA selections, mock-test count) append a machine-readable inline citation marker in this EXACT shape: [src:<Source> <Year>]. Examples: [src:Brochure ${currentYear}], [src:Result Release ${currentYear - 1}], [src:Faculty Page ${currentYear}]. Our frontend converts these markers into clickable "view source" pills, so the syntax must be exact (square brackets, "src:" prefix, no quotes, no URLs).
- Use at least one [src:Brochure …] and one [src:Result Release …] across the description.
- The long-form description MUST end with a small italic line: <p><em>Last updated: ${todayIso}</em></p>.

Output uses HTML only: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. Never include <html>, <head>, <body>, <h1>, or markdown fences. ABSOLUTELY NO inline style="" attributes, NO <font> tags, NO class="" / id="" attributes — plain semantic HTML only.`;

    const userPrompt = `Generate a complete, ready-to-publish profile for the following Indian MBA-entrance coaching institute. Verify every factual claim against your training knowledge of well-known Indian coaching brands before writing.

# INSTITUTE
- Name: ${brief.name}
- City: ${brief.city || "(use the actual HQ / primary centre city — never guess)"}
- State: ${brief.state || "(use the actual state)"}
- Mode: ${brief.mode || "(Offline / Online / Hybrid — based on actual delivery)"}
- Exam focus: ${exams.length ? exams.join(", ") : "(infer from the brand: CAT / XAT / GMAT / NMAT / SNAP / CMAT)"}
- Flagship programs (if any seed): ${flagship.length ? flagship.join(", ") : "(infer real flagship products like AIMCAT / SimCAT / Mock CAT / Crash Course)"}
- Primary target keyword: "${targetKw}"
- Secondary keywords: ${secKws.length ? secKws.map(k => `"${k}"`).join(", ") : "(none provided)"}
- Date context: ${dateCtx}

# HARD RULES
1. **COMPLETE DATA, NO BLANKS**: Fill every field with real, latest, useful content. fees_lakhs > 0, students_count > 0, success_rate > 0, programs has 4-8 items, faculty_highlights has 3-6, results has at least 2 recent years, exams_covered has the actual exams. NEVER leave anything as 0, "", "N/A", "Not available", or placeholder.
2. **FACTUAL ACCURACY (NON-NEGOTIABLE)**: founding era, HQ city, mode and exam coverage MUST be correct for known brands. NEVER output a clearly wrong year.
3. **LATEST DATA (${currentYear})**: All fees, batch durations, mock-test series counts, success-story numbers (e.g. "120+ IIM converts in ${currentYear - 1}") must reflect the most recent published cycle. State the data year context naturally inside the prose (e.g. "as per the ${currentYear - 1} CAT result").
4. **HUMANIZED LANGUAGE**: Roughly 8th-grade reading level. Contractions, second person ("you"), concrete numbers. NO phrases like "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving".
4. **NEVER START WITH A QUESTION**. Headings and opening sentences must be DECLARATIVE statements that give a clear fact.
5. **DESCRIPTION (long-form HTML)**: 600-900 words covering history (with the CORRECT founding era), USP, flagship products, faculty pedigree, success record, who this coaching is best for. MUST start with a <p><strong>Quick Summary:</strong> ...</p> block (55-65 words) giving the core overview upfront — including the founding era and mode. Then 4-6 <h2> sections (e.g. "About ${brief.name}", "Flagship Programs", "Faculty & Pedagogy", "Why Choose ${brief.name}", "Results & Track Record"). Use lists where helpful. End with <p><em>Last updated: ${todayIso}</em></p>.
6. **ON-PAGE SEO MUST-HAVES** (build naturally into description):
   - Primary keyword in the first 100 words AND in at least 2 <h2> headings
   - Secondary keywords sprinkled naturally where they fit
   - 3-5 internal-link-style anchors with relative URLs, e.g. <a href="/coaching">top CAT coaching</a>, <a href="/exam/cat">CAT exam</a>, <a href="/colleges">top MBA colleges</a>, <a href="/profile-analyzer">AI Profile Analyzer</a>, <a href="/cat-score-calculator">CAT Score Calculator</a>
   - Use <strong> on 6-10 high-value phrases (real product names, key facts, numbers)
   - Include at least one HTML <table> (e.g. course / fees / batch grid)
   - Include a final <h2>Frequently Asked Questions</h2> section with 4-6 Q&A pairs (each Q in <h3>, A in <p>) for AI / voice-search and FAQ schema readiness
   - Include short citation hints "(source: ${currentYear} brochure)" / "(source: ${currentYear - 1} result release)" near key stats
7. **STRUCTURED FIELDS**: Fill every required field in the tool schema with REAL, accurate values for known brands. For arrays (programs, faculty_highlights, exams_covered, features, specializations, keywords) return real, realistic values — never placeholder lists.
8. **SEO META**: meta_title <=60 chars (declarative, includes primary keyword, no "?"). meta_description 140-160 chars (declarative, includes primary keyword + the year ${currentYear}). h1_tag declarative, no "?".
9. **SLUG**: lowercase-hyphenated, <=80 chars, derived from the institute name.
10. **NO IMAGES**: Do not return logo_url or banner_url.
11. **OFFER / DISCOUNT**: Provide a realistic current-cycle offer line (e.g. "Flat 20% off on full CAT ${currentYear} classroom") only if your knowledge supports it; otherwise leave empty.

# OUTPUT — return JSON via the tool call below.`;

    const tool = {
      type: "function",
      function: {
        name: "publish_institute_profile",
        description: "Return a fully-written, SEO-optimized MBA-coaching institute profile matching the brief.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string", description: "Long-form HTML description (600-900 words) starting with Quick Summary block." },
            city: { type: "string" },
            state: { type: "string" },
            address: { type: "string", description: "Headquarters / flagship-centre address if widely known; otherwise short city-level locator." },
            mode: { type: "string", enum: ["Offline", "Online", "Hybrid"] },
            phone: { type: "string", description: "Public landline or central helpline if widely known. Else empty string." },
            whatsapp: { type: "string", description: "Public WhatsApp helpline if widely known. Else empty string." },
            email: { type: "string", description: "Public contact email if widely known. Else empty string." },
            website: { type: "string", description: "Official root URL (https://...)." },
            discount: { type: "string", description: "Short discount tag e.g. '20% OFF'. Empty string if none." },
            offer: { type: "string", description: "One-line current offer e.g. 'Flat 20% off on full CAT ${currentYear} classroom'. Empty string if none." },
            features: { type: "array", items: { type: "string" }, description: "6-10 selling points: live classes, recorded backup, mock test series count, AIR mentors, GD-PI prep, doubt-clearing app, etc." },
            fees_lakhs: { type: "number", description: "Numeric flagship-program total fee converted to LAKHS (e.g. 0.45 means INR 45,000). Use the most representative classroom course." },
            success_rate: { type: "number", description: "Approximate selection-rate percentage 0-100 if widely known; else 0." },
            students_count: { type: "integer", description: "Approximate annual cohort size; 0 if unknown." },
            programs: {
              type: "array",
              description: "4-8 actual flagship programs offered.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "e.g. 'CAT Classroom Full Course', 'XAT Crash Course'" },
                  duration: { type: "string", description: "e.g. '6 months'" },
                  mode: { type: "string", description: "Offline / Online / Hybrid" },
                  fees: { type: "string", description: "e.g. 'INR 45,000'" },
                  description: { type: "string", description: "1-2 sentence summary." },
                },
                required: ["name", "duration", "mode", "fees", "description"],
              },
            },
            faculty_highlights: {
              type: "array",
              description: "3-6 faculty profiles (real names if widely known and verifiable; otherwise role-based placeholders only — DO NOT fabricate real-looking names).",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  designation: { type: "string", description: "e.g. 'Senior CAT Faculty - Quant'" },
                  qualification: { type: "string", description: "e.g. 'IIM Bangalore alum, 99.8%iler'" },
                  experience: { type: "string", description: "e.g. '12+ years'" },
                  specialization: { type: "string", description: "e.g. 'Quantitative Aptitude'" },
                  bio: { type: "string", description: "1-2 sentence bio." },
                },
                required: ["name", "designation", "qualification", "experience", "specialization", "bio"],
              },
            },
            results: {
              type: "array",
              description: "Year-wise selection results for the last 2-3 years if widely known. Empty array if unknown.",
              items: {
                type: "object",
                properties: {
                  year: { type: "integer" },
                  college_name: { type: "string", description: "e.g. 'IIM Ahmedabad' or 'IIM ABCLIK group'" },
                  students_selected: { type: "integer" },
                  description: { type: "string" },
                },
                required: ["year", "college_name", "students_selected", "description"],
              },
            },
            exams_covered: { type: "array", items: { type: "string" }, description: "e.g. ['CAT','XAT','GMAT','NMAT','SNAP','CMAT']" },
            specializations: { type: "array", items: { type: "string" }, description: "e.g. ['Quant','VARC','DILR','GD-PI-WAT','GMAT Verbal']" },
            meta_title: { type: "string" },
            meta_description: { type: "string" },
            keywords: { type: "array", items: { type: "string" }, description: "8-12 SEO keywords (primary first)" },
            primary_keyword: { type: "string" },
            h1_tag: { type: "string" },
            funnel_stage: { type: "string", enum: ["awareness", "consideration", "decision"], description: "Default to 'consideration' for institute pages." },
          },
          required: [
            "name", "slug", "description", "mode", "address",
            "phone", "whatsapp", "email", "website",
            "discount", "offer", "features", "fees_lakhs",
            "success_rate", "students_count",
            "programs", "faculty_highlights", "results",
            "exams_covered", "specializations",
            "meta_title", "meta_description", "keywords",
            "primary_keyword", "h1_tag", "funnel_stage",
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
        // COST OPT: gemini-2.5-flash matches preview tier quality for tool-calling at ~30% lower cost.
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "publish_institute_profile" } },
        max_tokens: 4000,
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
    const message = aiJson?.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    const rawArgs = toolCall?.function?.arguments;

    if (!rawArgs) {
      return new Response(
        JSON.stringify({
          error: "AI did not return a structured institute profile",
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
      return new Response(
        JSON.stringify({ error: "AI output was truncated or malformed JSON. Try again.", detail: String(e).slice(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const slug = String(profile.slug || brief.slug || brief.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    // ── Auto-extract FAQs from generated description for FAQ schema ──
    const extractFaqs = (html: string): { question: string; answer: string }[] => {
      if (!html) return [];
      const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
      const out: { question: string; answer: string }[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(html))) {
        const q = m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const a = m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        if (q && a && (q.endsWith("?") || /^(what|why|how|is|are|can|should|do|does|when|where|which|who)\b/i.test(q))) {
          out.push({ question: q, answer: a });
        }
      }
      const seen = new Set<string>();
      return out.filter((f) => {
        const k = f.question.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return f.answer.length >= 20;
      }).slice(0, 8);
    };
    const extractedFaqs = extractFaqs(profile.description || "");

    // ── FACTUALITY CHECK PASS ──
    const factCheckTool = {
      type: "function",
      function: {
        name: "audit_institute_facts",
        description: "Audit the AI-generated MBA-coaching institute profile for factual accuracy.",
        parameters: {
          type: "object",
          properties: {
            confidence: {
              type: "object",
              properties: {
                city: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                state: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                mode: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                fees_lakhs: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                success_rate: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                exams_covered: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                programs: { type: "string", enum: ["Verified", "Range", "Unknown"] },
              },
              required: ["city", "state", "mode", "fees_lakhs", "success_rate", "exams_covered", "programs"],
            },
            warnings: {
              type: "array",
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
            omit_fields: { type: "array", items: { type: "string" } },
          },
          required: ["confidence", "warnings", "omit_fields"],
          additionalProperties: false,
        },
      },
    };

    const auditPrompt = `Audit the following AI-generated MBA-entrance coaching institute profile for factual accuracy. Use ONLY your verified knowledge of well-known Indian MBA-prep brands. Flag anything that contradicts known facts (especially HQ city, mode, exams covered, founding era, flagship products). Today's year is ${currentYear}.

PROFILE TO AUDIT (JSON):
${JSON.stringify({
  name: profile.name,
  city: profile.city,
  state: profile.state,
  mode: profile.mode,
  fees_lakhs: profile.fees_lakhs,
  success_rate: profile.success_rate,
  exams_covered: profile.exams_covered,
  programs: (profile.programs || []).map((p: any) => p?.name).filter(Boolean),
}, null, 2)}

RULES:
- "Verified" = highly confident the value is correct from training knowledge of this brand.
- "Range" = plausible bracket / industry-standard estimate but not the precise published figure.
- "Unknown" = cannot verify; AI may have guessed.
- Flag mode mismatches (e.g. claiming Offline for a brand that is purely Online) severity:"high".
- Add to omit_fields ONLY when severity is high AND no confident correction exists.`;

    let factCheck: any = { confidence: {}, warnings: [], omit_fields: [] };
    try {
      const auditRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a meticulous fact-checker for Indian MBA-entrance coaching brands. You only confirm facts you are confident about; otherwise you flag them." },
            { role: "user", content: auditPrompt },
          ],
          tools: [factCheckTool],
          tool_choice: { type: "function", function: { name: "audit_institute_facts" } },
          max_tokens: 2000,
        }),
      });
      if (auditRes.ok) {
        const auditJson = await auditRes.json();
        const auditArgs = auditJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (auditArgs) {
          try { factCheck = JSON.parse(auditArgs); } catch (_) { /* ignore */ }
        }
      }
    } catch (e) {
      console.warn("Audit pass exception:", e);
    }

    // Complete-Data Mode: keep all populated fields. Audit warnings are still
    // returned so admins can spot low-confidence values, but we never null them.
    const safeProfile: any = { ...profile };

    return new Response(
      JSON.stringify({
        success: true,
        institute: {
          ...safeProfile,
          slug,
          name: brief.name || safeProfile.name,
          city: brief.city || safeProfile.city || null,
          state: brief.state || safeProfile.state || null,
          mode: brief.mode || safeProfile.mode,
          primary_keyword: targetKw,
        },
        faqs: extractedFaqs,
        factCheck,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-institute-writer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
