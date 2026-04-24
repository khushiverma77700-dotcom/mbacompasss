// AI Course Writer — two-mode endpoint:
//   mode = "discover"  -> given an institute, return a list of MBA / Masters-in-Management
//                         related courses that institute is known to offer (CAT, XAT, GMAT,
//                         NMAT, SNAP, CMAT, MAT, MICAT, IIFT, GD-PI-WAT, interview prep, etc.).
//   mode = "generate"  -> given an institute + an editable list of courses, deeply research
//                         and return rich, accurate, ready-to-publish course content
//                         (description, curriculum, fees range, batch info, highlights, SEO).
//
// Public endpoint — verify_jwt = false (project default). Calls Lovable AI Gateway via
// tool-calling for strict structured output.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// COST OPT (2026-04): downgraded from gemini-2.5-pro → gemini-2.5-flash.
// Course discovery + content generation is structured tool-calling work; flash
// produces equivalent results at ~1/4 the cost. Pro is reserved for true deep
// reasoning tasks only (e.g. premium profile reports).
const MODEL = "google/gemini-2.5-flash";

interface InstituteCtx {
  name: string;
  city?: string;
  state?: string;
  mode?: string;        // Offline / Online / Hybrid
  website?: string;
  established?: number | null;
  examFocus?: string[]; // ["CAT","XAT","GMAT",...]
}

interface CourseSeed {
  name: string;
  exam?: string;
  mode?: string;        // Offline / Online / Hybrid
  notes?: string;       // anything the admin wants to nudge the AI with
}

type Body =
  | { mode: "discover"; institute: InstituteCtx; max?: number; contentDateContext?: string }
  | { mode: "generate"; institute: InstituteCtx; courses: CourseSeed[]; contentDateContext?: string };

function freshness() {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const y = today.getFullYear();
  return {
    todayIso,
    currentYear: y,
    window: `${y - 1}-${y + 1}`,
    cycle: `${y}-${y + 1}`,
  };
}

const SCOPE_LOCK = `# SCOPE LOCK — MBA / MASTERS-IN-MANAGEMENT ENTRANCE COACHING ONLY (NON-NEGOTIABLE)
- Cover ONLY coaching for management-entrance exams: CAT, XAT, GMAT, GRE-for-MiM, NMAT, SNAP, CMAT, MAT, MAH-CET, IIFT, TISSNET, MICAT, KMAT, and downstream GD-PI-WAT / IIM interview prep, profile-building & SOP for MiM.
- DO NOT include JEE, NEET, GATE, UPSC, SSC, banking, CA/CS, coding bootcamps, or school-level tuition. If the institute also runs non-MBA verticals, IGNORE them entirely.
- Every course you return must be MBA-entrance / Masters-in-Management coaching.`;

// ---------------- DISCOVER ----------------

async function discover(body: Extract<Body, { mode: "discover" }>, apiKey: string) {
  const f = freshness();
  const max = Math.max(1, Math.min(50, body.max ?? 25));
  const exams = (body.institute.examFocus || []).filter(Boolean);
  const dateCtx =
    body.contentDateContext?.trim() ||
    `Use the latest published batch lineup (active cycle ${f.cycle}, freshness window ${f.window}). Today is ${f.todayIso}.`;

  const system = `You are an MBA-coaching catalog researcher for India. Given an institute, list ONLY the MBA / Masters-in-Management entrance coaching courses that institute actually offers (or is well-known for offering). Never invent courses. If unsure of an exact name, return the canonical product family name (e.g. "CAT Classroom Program", "CAT Online Live", "XAT Crash Course", "GMAT Bootcamp", "GD-PI-WAT Prep", "Mock Test Series", "NMAT + SNAP Combo").
${SCOPE_LOCK}
ACCURACY RULES for famous brands:
- TIME -> AIMCAT mock series, CAT Classroom, CAT Online, GMAT, XAT/IIFT, GD-PI-WAT
- IMS -> SimCATs, CAT Classroom, CAT Live Online, GMAT, NMAT, GD-PI-WAT
- Career Launcher (CL) -> CAT Classroom, CAT Online, MBA-CET, NMAT/SNAP, GD-PI-WAT
- 2IIM -> CAT Online (Live + Recorded), CAT Crash, Quant Foundation
- iQuanta -> CAT Online Live, OMETs, GD-PI-WAT
- Bulls Eye / Hitbullseye -> CAT Classroom, OMETs, GD-PI
Stick to canonical, real product names.`;

  const user = `Institute: ${body.institute.name}${body.institute.city ? `, ${body.institute.city}` : ""}${body.institute.state ? `, ${body.institute.state}` : ""}
Mode: ${body.institute.mode || "Hybrid"}
Exam focus (if known): ${exams.length ? exams.join(", ") : "infer from brand"}

DATE CONTEXT: ${dateCtx}

Return UP TO ${max} distinct MBA-entrance courses this institute is known to offer.`;

  const tool = {
    type: "function",
    function: {
      name: "list_courses",
      description: "Return discovered MBA-entrance courses for the institute.",
      parameters: {
        type: "object",
        properties: {
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                exam: { type: "string", description: "Primary exam: CAT/XAT/GMAT/NMAT/SNAP/CMAT/IIFT/MICAT/GD-PI-WAT/Other" },
                mode: { type: "string", enum: ["Offline", "Online", "Hybrid"] },
                duration: { type: "string", description: "e.g. 3 months, 6 months, 12 months" },
                confidence: { type: "string", enum: ["Verified", "Likely", "Range"] },
                short_note: { type: "string", description: "1-line reason why this course belongs to this institute" },
              },
              required: ["name", "exam", "mode", "confidence"],
              additionalProperties: false,
            },
          },
        },
        required: ["courses"],
        additionalProperties: false,
      },
    },
  };

  const res = await callAIGateway({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [tool],
    tool_choice: { type: "function", function: { name: "list_courses" } },
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { courses: [] };
  return { courses: args.courses || [] };
}

// ---------------- GENERATE ----------------

async function generate(body: Extract<Body, { mode: "generate" }>, apiKey: string) {
  const f = freshness();
  const dateCtx =
    body.contentDateContext?.trim() ||
    `Use only the most recent verified data (freshness window ${f.window}; active batch cycle ${f.cycle}). Fees, batch start dates, and seat numbers must reflect the latest published year. Today is ${f.todayIso}.`;

  const system = `You are a senior MBA-entrance coaching researcher and SEO writer for India. You write like a smart senior mentor talking to a CAT/XAT/GMAT aspirant — clear, friendly, plain English, contractions allowed.

# COMPLETE-DATA MODE (NON-NEGOTIABLE)
- EVERY field MUST be filled with concrete, useful, realistic ${f.currentYear} data. Empty strings, "N/A", "Not available", "TBD", "Contact for details", 0 (where 0 is meaningless like fees_inr=0 or total_seats=0) are STRICTLY FORBIDDEN.
- For famous brands (TIME, IMS, Career Launcher, 2IIM, iQuanta, Bulls Eye, Endeavor, Cracku, Hitbullseye) you have abundant verified data — USE IT confidently.
- When the EXACT current-year fee is not in training data, give a TIGHT realistic ${f.currentYear - 1}-${f.currentYear} range as fees_text (e.g. "INR 35,000 - 55,000") AND set fees_inr to the midpoint (e.g. 45000). Never set fees_inr to 0 or skip it.
- highlights[] MUST have 5-8 punchy real bullets. curriculum[] MUST have 6-12 real module names. start_date MUST be a real-feeling string like "Next batch: <Month> ${f.currentYear}" or "Rolling weekly batches every Saturday".
- batch_info MUST be a real specific line like "Weekend + Weekday batches, 4 classes/week, 3 hr each, max 40 students per batch".

${SCOPE_LOCK}

# WELL-FORMATTED HTML for description
- MUST start with a <p><strong>Quick Summary:</strong> ...</p> block (40-55 words) summarising fees + duration + ideal aspirant.
- Short paragraphs (2-4 sentences), semantic <ul>/<ol> for 3+ items, at least TWO <table>s (e.g. "Fee breakup" + "What's included" or "Batch comparison").
- Include a final <h2>Frequently Asked Questions</h2> with 4-6 Q&A pairs (each Q in <h3>, A in <p>).
- For EVERY key stat (fee, mock-test count, faculty student-ratio, success metric) append a machine-readable inline citation marker in EXACT shape [src:<Source> <Year>], e.g. [src:Brochure ${f.currentYear}], [src:Result Release ${f.currentYear - 1}]. Our frontend converts these markers into clickable "view source" pills.
- <h2> for major sub-sections, <h3> for nested. Bold key facts with <strong>.
- End the description with: <p><em>Last updated: ${f.todayIso}</em></p>

ACCURACY RULES — for famous Indian MBA-prep brands (TIME, IMS, Career Launcher, 2IIM, iQuanta, Bulls Eye, Endeavor, Cracku, Hitbullseye, BYJU'S Exam Prep) the brand-specific flagship product names, mock-series names (AIMCAT / SimCAT / Mock CAT), founding era, and HQ city must be correct.

FRESHNESS: Today is ${f.todayIso}. Active batch cycle: ${f.cycle}. ${dateCtx}

Output uses HTML only inside the long description: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. Never include <html>, <head>, <body>, <h1>, or markdown fences. NO inline style="" / class="" / id="" attributes.`;

  const user = `Institute: ${body.institute.name}${body.institute.city ? `, ${body.institute.city}` : ""}
Mode: ${body.institute.mode || "Hybrid"}
${body.institute.established ? `Established: ${body.institute.established}` : ""}
Exam focus: ${(body.institute.examFocus || []).join(", ") || "MBA-entrance"}

Generate complete, accurate, ready-to-publish content for EACH of the following ${body.courses.length} course(s). Keep the order. Match each output index to the input index.

INPUT COURSES:
${body.courses
  .map(
    (c, i) =>
      `${i + 1}. ${c.name}${c.exam ? ` [${c.exam}]` : ""}${c.mode ? ` (${c.mode})` : ""}${c.notes ? ` — note: ${c.notes}` : ""}`
  )
  .join("\n")}

For EACH course return:
- name (cleaned canonical name)
- short_description (40-60 words, plain text, no HTML)
- description_html (rich, 250-450 words, with at least one <table>, ends with Last updated line)
- duration (e.g. "3 months", "6 months", "12 months")
- mode ("Offline" | "Online" | "Hybrid")
- start_date (e.g. "Rolling batches every month" or "Next batch: <Month Year>")
- eligibility (1 short line)
- fees_inr (NUMBER — typical published fee in INR; if unsure, midpoint of plausible range)
- fees_text (e.g. "INR 45,000" or "INR 35,000 - 55,000 depending on batch")
- discount_text (e.g. "Up to 20% early-bird off" or "" if unknown)
- total_seats (number; 0 if unknown)
- highlights (array of 5-8 punchy bullet phrases)
- curriculum (array of 6-12 syllabus / module names)
- batch_info (1 short line, e.g. "Weekend + Weekday batches, 4 classes/week, 3 hr each")
- exam (CAT/XAT/GMAT/NMAT/SNAP/CMAT/IIFT/MICAT/GD-PI-WAT/Other)
- meta_title (<= 60 chars, includes course + institute + city if helpful)
- meta_description (<= 160 chars, benefit-led)
- keywords (5-10 long-tail keywords)
- price_confidence ("Verified" | "Range" | "Unknown")
- accuracy_notes (1 short line — what you were sure about and what is a range)`;

  const tool = {
    type: "function",
    function: {
      name: "write_courses",
      description: "Return rich, accurate course content for each input course in order.",
      parameters: {
        type: "object",
        properties: {
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                short_description: { type: "string" },
                description_html: { type: "string" },
                duration: { type: "string" },
                mode: { type: "string", enum: ["Offline", "Online", "Hybrid"] },
                start_date: { type: "string" },
                eligibility: { type: "string" },
                fees_inr: { type: "number" },
                fees_text: { type: "string" },
                discount_text: { type: "string" },
                total_seats: { type: "number" },
                highlights: { type: "array", items: { type: "string" } },
                curriculum: { type: "array", items: { type: "string" } },
                batch_info: { type: "string" },
                exam: { type: "string" },
                meta_title: { type: "string" },
                meta_description: { type: "string" },
                keywords: { type: "array", items: { type: "string" } },
                price_confidence: { type: "string", enum: ["Verified", "Range", "Unknown"] },
                accuracy_notes: { type: "string" },
              },
              required: [
                "name",
                "short_description",
                "description_html",
                "duration",
                "mode",
                "fees_inr",
                "fees_text",
                "highlights",
                "curriculum",
                "exam",
                "meta_title",
                "meta_description",
                "price_confidence",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["courses"],
        additionalProperties: false,
      },
    },
  };

  const res = await callAIGateway({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [tool],
    tool_choice: { type: "function", function: { name: "write_courses" } },
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { courses: [] };
  return { courses: args.courses || [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const body = (await req.json()) as Body;
    if (!body || !body.mode) throw new Error("mode is required");
    if (!body.institute?.name) throw new Error("institute.name is required");

    if (body.mode === "discover") {
      const out = await discover(body, apiKey);
      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.mode === "generate") {
      if (!Array.isArray(body.courses) || body.courses.length === 0) {
        throw new Error("courses[] is required for generate mode");
      }
      const out = await generate(body, apiKey);
      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    throw new Error(`unknown mode: ${(body as any).mode}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ai-course-writer error:", msg);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
