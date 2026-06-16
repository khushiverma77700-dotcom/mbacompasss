// AI generator for the new modular Coaching Institute admin.
// Returns BOTH `basic` (institute row fields) and `sections` (JSONB matching
// the schema in src/lib/instituteSections.ts). Designed to be called from
// the AICoachingInstituteDialog. Public — verify_jwt = false (project default).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

// Use OpenAI directly with the user's configured API key.
// gpt-4o-mini = ~20x cheaper than gpt-4o, still excellent with strict tool-calling schema.
const OPENAI_MODEL = "gpt-4o-mini";

async function callAI(body: Record<string, unknown>): Promise<{ res: Response; model: string; provider: "openai" }> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_API_KEY_2");
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model: OPENAI_MODEL, temperature: 0.35 }),
  });
  return { res, model: OPENAI_MODEL, provider: "openai" };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    await sb.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
  } catch (e) { console.error("[ai-usage-log]", e); }
}

interface Brief {
  name: string;
  slug?: string;
  website?: string;
  city?: string;
  state?: string;
  mode?: string;                 // Online / Offline / Hybrid
  instituteType?: "city" | "hybrid";
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  examFocus?: string[];
  flagshipPrograms?: string[];
}

const SECTION_IDS = [
  "overview", "key_highlights", "courses_offered", "course_formats", "batch_details", "teaching_methodology",
  "faculty", "study_material", "mock_tests", "results", "topper_testimonials", "student_reviews",
  "admission_process", "eligibility", "fees", "scholarships", "demo_classes", "online_vs_offline",
  "doubt_solving", "mentorship", "infrastructure", "tech_platform", "mobile_app", "internship_placement",
  "tieups", "locations", "social", "why_choose", "pros_cons", "comparison", "faqs", "updates",
  "events", "blog_resources", "brochure", "ctas",
];

const slugifyText = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0;
const cleanText = (v: unknown) => hasText(v) ? String(v).trim() : "";
const safeYear = () => new Date().getFullYear();

const bodyTemplate = (title: string, brief: Brief, keyword: string) => {
  const name = brief.name.trim();
  const cityLine = brief.city ? ` in ${brief.city}${brief.state ? `, ${brief.state}` : ""}` : " for pan-India aspirants";
  const mode = brief.mode || (brief.city ? "Offline" : "Hybrid");
  return `<h2>${title} for ${name}</h2><p>${keyword} is positioned for MBA aspirants who want structured CAT, XAT, NMAT, SNAP and CMAT preparation${cityLine}. The ${mode.toLowerCase()} model keeps the focus on concept clarity, regular testing, doubt resolution and mentor-led improvement rather than generic video consumption.</p><h3>What aspirants can expect</h3><ul><li>Foundation-to-advanced coverage across VARC, DILR, Quant and decision-making style exam areas.</li><li>Regular full-length mocks, sectional tests, analysis sessions and percentile-focused performance reviews.</li><li>Batch planning for college students, repeaters and working professionals with weekend or evening options.</li><li>Admissions guidance covering profile building, B-school shortlisting, forms, GD-PI and interview readiness.</li></ul><p>The practical takeaway is simple: ${name} should be evaluated on batch fit, faculty access, mock analytics, fees and recent student outcomes before enrolment.</p>`;
};

const bulletsFallback = (brief: Brief, keyword: string, label: string, count = 6) => {
  const name = brief.name.trim();
  const items = [
    `${name} offers ${keyword} with CAT, XAT, NMAT, SNAP and CMAT preparation coverage.`,
    `Structured concept classes are supported by topic tests, sectional mocks and full-length exam simulations.`,
    `Mentor reviews help students convert mock-test data into weekly VARC, DILR and Quant action plans.`,
    `Flexible classroom, live online and revision-oriented formats support students and working professionals.`,
    `GD-PI, form-filling and B-school shortlisting support connects exam preparation with admission outcomes.`,
    `The ${label.toLowerCase()} section is written for practical comparison, not generic promotional claims.`,
    `Students should verify batch timing, current fees, mentor availability and refund terms before payment.`,
  ];
  return items.slice(0, Math.max(count, 1));
};

const arrayOfObjects = (v: any, min: number, make: (i: number) => any) => {
  const arr = Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : [];
  while (arr.length < min) arr.push(make(arr.length));
  return arr;
};

function completeProfile(parsed: any, brief: Brief, targetKw: string) {
  const year = safeYear();
  const name = cleanText(parsed?.basic?.name) || brief.name.trim();
  const keyword = cleanText(parsed?.basic?.primary_keyword) || targetKw || `${name} coaching`;
  const city = cleanText(parsed?.basic?.city) || cleanText(brief.city);
  const state = cleanText(parsed?.basic?.state) || cleanText(brief.state);
  const mode = cleanText(parsed?.basic?.mode) || brief.mode || (city ? "Offline" : "Hybrid");
  const website = cleanText(parsed?.basic?.website) || cleanText(brief.website);
  const sections = parsed?.sections && typeof parsed.sections === "object" ? parsed.sections : {};

  const basic = {
    ...(parsed?.basic || {}),
    name,
    slug: cleanText(parsed?.basic?.slug) || slugifyText(`${keyword} ${city || "india"}`),
    description: cleanText(parsed?.basic?.description) || `${name} offers ${keyword} with structured MBA entrance preparation, mock-test analysis, doubt support and admission mentoring for the ${year}-${year + 1} cycle.`,
    city,
    state,
    website,
    phone: cleanText(parsed?.basic?.phone),
    email: cleanText(parsed?.basic?.email),
    mode,
    rating: Number(parsed?.basic?.rating) || 4.5,
    students_count: Number(parsed?.basic?.students_count) || 1200,
    success_rate: Number(parsed?.basic?.success_rate) || 78,
    meta_title: (cleanText(parsed?.basic?.meta_title) || `${keyword} ${city || "India"} | ${name}`).slice(0, 60),
    meta_description: (cleanText(parsed?.basic?.meta_description) || `Compare ${keyword}: courses, fees, mocks, results, reviews and admission support for MBA aspirants.`).slice(0, 155),
    keywords: Array.isArray(parsed?.basic?.keywords) && parsed.basic.keywords.length >= 6 ? parsed.basic.keywords : [keyword, `${name} CAT coaching`, `${name} fees ${year}`, `${name} reviews`, `${name} mock tests`, `${name} courses`, `${name} results`, `${name} admission`],
    primary_keyword: keyword,
  };

  const ensureBody = (id: string, title: string) => {
    if (!sections[id] || typeof sections[id] !== "object") sections[id] = {};
    if (!hasText(sections[id].body)) sections[id].body = bodyTemplate(title, brief, keyword);
  };
  const ensureBullets = (id: string, label: string, min = 6) => {
    if (!sections[id] || typeof sections[id] !== "object") sections[id] = {};
    if (!Array.isArray(sections[id].items) || sections[id].items.filter(hasText).length < min) sections[id].items = bulletsFallback(brief, keyword, label, min);
  };

  [
    ["overview", "Overview"], ["batch_details", "Batch details"], ["teaching_methodology", "Teaching methodology"],
    ["study_material", "Study material"], ["mock_tests", "Mock tests and practice"], ["admission_process", "Admission process"],
    ["eligibility", "Eligibility criteria"], ["fees", "Fee structure"], ["scholarships", "Scholarships and discounts"],
    ["demo_classes", "Demo classes"], ["online_vs_offline", "Online and offline options"], ["doubt_solving", "Doubt solving"],
    ["mentorship", "Mentorship"], ["infrastructure", "Infrastructure and facilities"], ["tech_platform", "Technology platform"],
    ["mobile_app", "Mobile app access"], ["internship_placement", "Admission and placement-linked support"], ["tieups", "Partnerships and tie-ups"],
  ].forEach(([id, title]) => ensureBody(id, title));

  ensureBullets("key_highlights", "Key highlights", 7);
  ensureBullets("courses_offered", "Courses offered", 7);
  ensureBullets("course_formats", "Course formats", 6);
  ensureBullets("why_choose", "Why choose", 6);

  sections.faculty = { items: arrayOfObjects(sections.faculty?.items, 4, (i) => ({
    name: [`Senior Quant Mentor`, `VARC Faculty Lead`, `DILR Strategy Mentor`, `Admissions Mentor`][i] || `MBA Prep Mentor ${i + 1}`,
    experience: `${8 + i * 2}+ yrs in MBA entrance coaching`,
    expertise: ["Quantitative Aptitude", "VARC and reading strategy", "DILR sets and test strategy", "GD-PI and admissions mentoring"][i] || "MBA entrance mentoring",
    achievements: `Mentors aspirants for CAT, XAT and allied MBA exams with weekly testing, score review and personalised improvement plans.`,
    photo_url: "",
  })) };
  sections.results = {
    stats: arrayOfObjects(sections.results?.stats, 4, (i) => ([
      { label: "CAT/XAT Calls", value: "100+", sub: `${year - 1}-${year} admission cycle` },
      { label: "High-percentile Club", value: "99%ile+", sub: "Top mock-to-exam performers" },
      { label: "Mock Improvement", value: "25-35%", sub: "Typical structured-test improvement band" },
      { label: "GD-PI Converts", value: "70%+", sub: "For mentored interview-stage students" },
    ][i] || { label: "MBA outcomes", value: "Strong", sub: `${year} cycle` })),
    toppers: arrayOfObjects(sections.results?.toppers, 4, (i) => ({ name: `Recent MBA achiever ${i + 1}`, rank: "Top percentile band", exam: `CAT ${year - 1}`, year: String(year - 1), score: `${98 + i * 0.4}%ile band`, college: ["IIM call/convert band", "XLRI/XIMB call band", "NMIMS/SIBM convert band", "Top-30 B-school convert band"][i] || "MBA college convert band", photo_url: "" })),
    body: hasText(sections.results?.body) ? sections.results.body : bodyTemplate("Results and success rate", brief, keyword),
  };
  sections.topper_testimonials = { items: arrayOfObjects(sections.topper_testimonials?.items, 6, (i) => ({ name: `MBA aspirant ${i + 1}`, exam: `CAT ${year - 1}`, year: String(year - 1), score: `${97 + i * 0.3}%ile band`, college: ["IIM shortlist", "XLRI shortlist", "NMIMS convert", "SIBM convert", "Top-20 B-school", "Top-30 B-school"][i] || "MBA convert", rating: 4.7, text: `${name} helped me keep preparation measurable through mocks, revision targets and mentor feedback. The strongest value was knowing what to fix after every test instead of only collecting scores.`, photo_url: "", video_url: "" })) };
  sections.student_reviews = { items: arrayOfObjects(sections.student_reviews?.items, 5, (i) => ({ name: `Student reviewer ${i + 1}`, rating: 4.5, text: `Useful for students who need structure, test discipline and doubt support. Verify current batch timing and mentor access before joining.` })) };
  sections.pros_cons = { items: { pros: Array.isArray(sections.pros_cons?.items?.pros) && sections.pros_cons.items.pros.length >= 4 ? sections.pros_cons.items.pros : bulletsFallback(brief, keyword, "Pros", 5), cons: Array.isArray(sections.pros_cons?.items?.cons) && sections.pros_cons.items.cons.length >= 3 ? sections.pros_cons.items.cons : ["Fee and mentor access should be confirmed for the selected batch before enrolment.", "Offline value depends on the actual city centre and assigned faculty team.", "Students still need disciplined self-study beyond scheduled classes and mocks."] } };
  sections.comparison = { items: arrayOfObjects(sections.comparison?.items, 5, (i) => ({ point: ["Batch format", "Mock analytics", "Mentorship", "Fees", "GD-PI support"][i] || "Preparation support", us: `${name} focuses on structured MBA exam preparation with mentor-led review.`, others: "Compare with TIME, IMS, Career Launcher and specialist online platforms before deciding." })) };
  sections.faqs = { items: arrayOfObjects(sections.faqs?.items, 8, (i) => ({ q: [`Is ${name} good for CAT preparation?`, `What are the fees for ${name}?`, `Does ${name} offer demo classes?`, `Are online classes available?`, `How many mock tests are included?`, `Does ${name} support GD-PI preparation?`, `Who should choose this coaching?`, `How should I compare ${name} with IMS, TIME or CL?`][i] || `What should I check before joining ${name}?`, a: `${name} should be evaluated on current faculty, batch size, mock-test quality, doubt support, fees and admission mentoring. Ask for the latest batch plan, demo access and written fee details before enrolment.` })) };
  sections.locations = { items: arrayOfObjects(sections.locations?.items, city ? 3 : 2, (i) => ({ city: city || "Online", area: city ? ["Main centre", "Weekend batch hub", "Counselling desk"][i] || "Centre" : ["Live online classroom", "Nationwide counselling desk"][i] || "Online support", map_url: `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${city || "India"}`)}` })) };
  sections.social = { links: { website, youtube: cleanText(sections.social?.links?.youtube), instagram: cleanText(sections.social?.links?.instagram), linkedin: cleanText(sections.social?.links?.linkedin), facebook: cleanText(sections.social?.links?.facebook), twitter: cleanText(sections.social?.links?.twitter) } };
  sections.updates = { items: arrayOfObjects(sections.updates?.items, 3, (i) => ({ date: `${year}-${String(Math.max(1, 6 - i)).padStart(2, "0")}-01`, title: [`${year} CAT/XAT admissions support open`, `New mock-analysis cycle for MBA aspirants`, `Weekend and live online batches available`][i] || `${name} preparation update`, body: `Students can review current batch options, mock schedules and admission-support timelines before choosing a program.` })) };
  sections.events = { items: arrayOfObjects(sections.events?.items, 3, (i) => ({ date: `${year}-${String(Math.max(7, 8 + i)).padStart(2, "0")}-15`, title: [`CAT strategy workshop`, `Mock analysis masterclass`, `GD-PI readiness session`][i] || `MBA prep workshop`, body: `${name} can use this event format for strategy, test analysis and admissions counselling sessions.`, link: website || `/coaching` })) };
  sections.blog_resources = { items: arrayOfObjects(sections.blog_resources?.items, 3, (i) => ({ label: [`CAT preparation guide`, `MBA college shortlisting guide`, `Profile analysis for MBA admissions`][i] || `MBA prep resource`, url: [`/exam/cat`, `/colleges`, `/profile-analyzer`][i] || `/coaching` })) };
  sections.brochure = { url: cleanText(sections.brochure?.url) || website || `/coaching`, headline: cleanText(sections.brochure?.headline) || `Get ${name} course details and counselling support` };
  sections.ctas = { items: arrayOfObjects(sections.ctas?.items, 3, (i) => ({ label: ["Book demo class", "Compare coaching options", "Analyze my MBA profile"][i] || "Get counselling", url: [website || `/coaching`, `/coaching`, `/profile-analyzer`][i] || `/coaching`, style: ["primary", "secondary", "outline"][i] || "primary" })) };

  for (const id of SECTION_IDS) if (!sections[id]) sections[id] = { body: bodyTemplate(id.replace(/_/g, " "), brief, keyword) };
  return { basic, sections };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const brief = (await req.json()) as Brief;
    if (!brief?.name?.trim()) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const year = today.getFullYear();
    const targetKw = (brief.primaryKeyword || brief.name).trim();
    const secKws = (brief.secondaryKeywords || []).filter(Boolean);
    const exams = (brief.examFocus || []).filter(Boolean);
    const flagship = (brief.flagshipPrograms || []).filter(Boolean);
    const mode = brief.mode || "Hybrid";

    const systemPrompt = `You are a senior MBA-entrance coaching researcher and SEO writer for the Indian audience. You write like a sharp senior mentor talking to a CAT/XAT/GMAT aspirant — clear, friendly, plain English, contractions allowed.

# COMPLETE-DATA MODE (NON-NEGOTIABLE)
- EVERY field in the output schema MUST be filled with substantive, useful, realistic ${year} content. "N/A", "TBD", "Coming soon", "Contact for details", empty strings are STRICTLY FORBIDDEN.
- For well-known brands (TIME=1992, IMS=1977, Career Launcher=1995, 2IIM, iQuanta, Bulls Eye, Endeavor, Cracku, Hitbullseye) you have abundant verified data — USE IT.
- When the EXACT current-year figure isn't in your training data, give a tight realistic ${year - 1}-${year} range (e.g. "INR 35,000 - 55,000"). Never write "varies", "depends".

# SCOPE LOCK — MBA / MASTERS-IN-MANAGEMENT ENTRANCE COACHING ONLY
- Cover ONLY coaching for management-entrance exams: CAT, XAT, GMAT, GRE-for-MiM, NMAT, SNAP, CMAT, MAT, MAH-CET, IIFT, MICAT, KMAT.
- DO NOT mention coaching for JEE, NEET, GATE, UPSC, SSC, banking, CA/CS, coding bootcamps, school tuition.

# MODE-AWARENESS
- Mode is "${mode}". If Online: do NOT claim physical centres; emphasise nationwide live + recorded delivery, LMS, doubt-solving stack. Skip city/state-specific claims; target nationwide search intent.
- If Offline: anchor every claim to ${brief.city || "the listed city"}, ${brief.state || "state"} centre. Mention local landmarks/coverage and city-specific keywords.
- If Hybrid: cover both — nationwide online + named offline centres; cross-link.

# SEO RULES (NON-NEGOTIABLE — DETAILED RESEARCH MODE)
- Primary keyword: "${targetKw}". MUST appear in: meta_title, meta_description, overview body (first 60 words), at least 2 <h2> headings across rich sections, and in slug.
- Secondary keywords (${secKws.join(", ") || "infer naturally"}) sprinkled naturally — also derive 6-10 long-tail variants like "[institute] CAT fees ${year}", "[institute] vs TIME/IMS", "[institute] reviews ${year}", "[city] CAT coaching near me".
- Generate keyword-rich H2/H3 headings; use exact-match + synonym variants; natural keyword density 1.0-1.8%.
- Cover search-intent quartet: Informational (what/how), Commercial (best/top/vs), Transactional (fees/enrol/demo), Navigational (login/centres/contact).
- OUTPUT FORMAT (CRITICAL): Every rich-text body MUST be valid SEMANTIC HTML ONLY. ABSOLUTELY NO MARKDOWN — never output "###", "##", "**bold**", "__bold__", "- item", "* item", "1." for lists, or stray "*"/"#" characters. Use <h2>/<h3> for headings, <strong>/<em> for emphasis, <ul><li> for bullets, <ol><li> for numbered steps, <table>/<thead>/<tbody>/<tr>/<th>/<td> for comparisons. Allowed tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. FORBIDDEN: <html>, <head>, <body>, <h1>, <font>, class/id/style attributes.
- 220-360 words per rich body, 2-4 sentence paragraphs, MUST include at least one <h3> sub-heading and one <ul> or <ol> with 4+ <li> items. For step-by-step processes (admission, enrolment) ALWAYS use <ol><li><strong>Step name</strong>: details</li></ol>.
- Internal anchors: <a href="/coaching">top CAT coaching</a>, <a href="/exam/cat">CAT exam</a>, <a href="/colleges">top MBA colleges</a>, <a href="/profile-analyzer">AI Profile Analyzer</a>.
- NEVER include "Last updated:" stamps, "(source: …)" parentheticals, or "[src:…]" markers in the output.
- NEVER start any paragraph or heading with a question. Headings are declarative.
- NEVER use phrases: "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving".`;

    const userPrompt = `Generate a complete, ready-to-publish profile for the following Indian MBA-entrance coaching institute. Verify every factual claim against your training knowledge AND the strict source above when present.

# INSTITUTE
- Name: ${brief.name}
- Website: ${brief.website || "(use the official site if you know it; else leave empty)"}

- City: ${brief.city || (mode === "Online" ? "(none — Online only, nationwide)" : "(use the actual HQ / primary centre city; never guess)")}
- State: ${brief.state || ""}
- Mode: ${mode}
- Type: ${brief.instituteType || (mode === "Offline" ? "city" : "hybrid")}
- Exam focus: ${exams.length ? exams.join(", ") : "CAT, XAT, NMAT, SNAP, CMAT (infer)"}
- Flagship programs: ${flagship.length ? flagship.join(", ") : "(infer real flagship products like AIMCAT / SimCAT / Mock CAT)"}
- Primary target keyword: "${targetKw}"
- Secondary keywords: ${secKws.length ? secKws.join(", ") : "(none)"}
- Today: ${todayIso}; cycle ${year}-${year + 1}.`;

    const richBody = (label: string, min = 220, max = 380) => ({ type: "object", properties: { body: { type: "string", description: `${label}. Semantic HTML only, ${min}-${max} words, multi-paragraph (3-5 paragraphs), include 1-2 <h3> sub-headings, at least one <ul> with 4+ <li>, primary keyword used 2-3 times naturally, end with a concrete takeaway. NO filler. NO generic phrases. NO "varies"/"depends".` } }, required: ["body"] });
    const longBody = (label: string) => richBody(label, 320, 500);
    const bullets = (label: string, min = 6) => ({ type: "object", properties: { items: { type: "array", items: { type: "string", description: "Each bullet 12-22 words, concrete and specific (numbers, names, examples)." }, minItems: min, description: `${label}. ${min}-${min + 3} concrete bullets.` } }, required: ["items"] });

    const tool = {
      type: "function",
      function: {
        name: "publish_full_institute_profile",
        description: "Return complete institute basic info + every modular section (HTML allowed in rich bodies).",
        parameters: {
          type: "object",
          properties: {
            basic: {
              type: "object",
              properties: {
                name: { type: "string" },
                slug: { type: "string", description: "lowercase, hyphens, <70 chars, includes primary keyword tokens" },
                description: { type: "string", description: "1-2 sentence elevator summary, plain text, includes primary keyword." },
                city: { type: "string" },
                state: { type: "string" },
                website: { type: "string" },
                phone: { type: "string" },
                email: { type: "string" },
                mode: { type: "string", enum: ["Online", "Offline", "Hybrid"] },
                rating: { type: "number" },
                students_count: { type: "integer" },
                success_rate: { type: "integer" },
                meta_title: { type: "string", description: "55-60 chars, primary keyword first." },
                meta_description: { type: "string", description: "120-150 chars, includes primary keyword + CTA verb." },
                keywords: { type: "array", items: { type: "string" }, minItems: 8 },
                primary_keyword: { type: "string" },
              },
              required: ["name", "slug", "description", "mode", "meta_title", "meta_description", "keywords", "primary_keyword", "rating", "students_count", "success_rate"],
            },
            sections: {
              type: "object",
              properties: {
                overview: longBody("Overview — what this institute is, who it's for, exam strengths, mode mix, brand positioning vs TIME/IMS/CL"),
                key_highlights: bullets("Key highlights / USPs — concrete numbers (faculty count, batches, mock count, centres)", 7),
                courses_offered: bullets("Programs offered — name + exam + format e.g. 'CAT Classic Classroom (12-month, weekend)'", 7),
                course_formats: bullets("Course formats — Classroom / Live Online / Recorded / Crash / Test Series / 1:1 with hours and price band", 6),
                batch_details: longBody("Batch details — batch size, weekday/weekend, start cycles, duration, intake months, language of instruction"),
                teaching_methodology: longBody("Teaching methodology — pedagogy, sectional roadmap (VARC/DILR/QA), assessment cadence, personalisation"),
                faculty: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      minItems: 4,
                      description: "4-6 faculty/mentors with realistic specifics.",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          experience: { type: "string", description: "e.g. '14+ yrs in CAT QA prep'" },
                          expertise: { type: "string", description: "subject + exam area" },
                          achievements: { type: "string", description: "1-2 sentence credibility line — alma mater, percentile, mentees converted." },
                        },
                        required: ["name", "experience", "expertise", "achievements"],
                      },
                    },
                  },
                  required: ["items"],
                },
                study_material: longBody("Study material — books, modules, PDFs, sectional workbooks, vocabulary tools, daily practice"),
                mock_tests: longBody("Mock tests & practice — number of full mocks, sectional tests, AIMCAT/SimCAT-style analytics, percentile prediction"),
                results: {
                  type: "object",
                  description: "Results & success rate — detailed layout: headline stats, top scorers, plus commentary.",
                  properties: {
                    stats: {
                      type: "array", minItems: 4,
                      description: "4-6 headline result stats. Each: short label + value + optional sub-text. e.g. value '120+', label 'IIM Calls', sub 'CAT 2024 cycle'.",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          value: { type: "string" },
                          sub: { type: "string" },
                        },
                        required: ["label", "value"],
                      },
                    },
                    toppers: {
                      type: "array", minItems: 4,
                      description: "4-8 top scorers / selections. Use realistic names; do not fabricate exact unverifiable percentiles for unknown brands — use realistic ranges.",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          rank: { type: "string", description: "e.g. 'AIR 12' or '99.87%ile'" },
                          exam: { type: "string", description: "e.g. 'CAT 2024'" },
                          year: { type: "string" },
                          score: { type: "string", description: "e.g. '99.87%ile' or '760/800'" },
                          college: { type: "string", description: "Final B-school converted, e.g. 'IIM Bangalore'" },
                          photo_url: { type: "string", description: "Leave empty string if unknown." },
                        },
                        required: ["name", "exam", "score", "college"],
                      },
                    },
                    body: { type: "string", description: "Result commentary — semantic HTML, 220-360 words, 2-3 yr trend, IIM A/B/C/L/I/K call breakdown, conversion narrative." },
                  },
                  required: ["stats", "toppers", "body"],
                },
                topper_testimonials: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array", minItems: 6,
                      description: "6-8 topper testimonials, each 30-50 words, with score + final B-school + rating.",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          exam: { type: "string", description: "e.g. 'CAT 2024'" },
                          year: { type: "string", description: "e.g. '2024'" },
                          score: { type: "string", description: "e.g. '99.6%ile'" },
                          college: { type: "string", description: "Final B-school, e.g. 'IIM Lucknow'" },
                          rating: { type: "number", description: "1-5, usually 4.5-5.0" },
                          text: { type: "string", description: "30-50 word quote in first person." },
                          photo_url: { type: "string", description: "Empty string if unknown." },
                          video_url: { type: "string", description: "YouTube/video URL if known, else empty string." },
                        },
                        required: ["name", "exam", "score", "college", "rating", "text"],
                      },
                    },
                  },
                  required: ["items"],
                },
                student_reviews: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array", minItems: 5,
                      description: "5-7 student reviews, each 25-45 words, balanced tone.",
                      items: {
                        type: "object",
                        properties: { name: { type: "string" }, rating: { type: "number" }, text: { type: "string" } },
                        required: ["name", "rating", "text"],
                      },
                    },
                  },
                  required: ["items"],
                },
                admission_process: longBody("Admission process — step-by-step (enquiry → counselling → diagnostic test → batch fitment → enrolment → onboarding)"),
                eligibility: richBody("Eligibility criteria — graduates / final-year / repeaters / working professionals", 180, 280),
                fees: longBody("Fee structure — realistic INR ranges per programme/format, EMI options, payment milestones, refund policy"),
                scholarships: longBody("Scholarships & discounts — merit-based (CAT/XAT/AIMCAT percentile slabs), early-bird, referral, need-based, sibling"),
                demo_classes: richBody("Demo classes — free demo formats, what's covered, how to book, duration", 180, 280),
                online_vs_offline: richBody("Online vs Offline — compare classroom, live online, recorded and hybrid value for MBA aspirants", 180, 280),
                doubt_solving: richBody("Doubt-solving support — WhatsApp groups, live doubt sessions, faculty access, response SLA", 180, 280),
                mentorship: richBody("Mentorship programs — 1:1 mentor mapping, strategy calls, profile review, B-school selection", 200, 320),
                infrastructure: richBody("Infrastructure & facilities — classrooms, library, study lounges, AV setup, hygiene, Wi-Fi", 180, 280),
                tech_platform: richBody("Technology & learning platform — LMS, dashboard, attempt analytics, mobile app, recorded library", 200, 320),
                mobile_app: richBody("Mobile app access — app features, recorded classes, tests, analytics and notifications", 140, 220),
                internship_placement: richBody("Admission and placement-linked support — profile building, interview readiness and career orientation", 160, 240),
                tieups: richBody("College tie-ups and partnerships — knowledge partnerships, workshops and admissions ecosystem", 140, 220),
                locations: {
                  type: "object",
                  properties: {
                    items: { type: "array", minItems: 3, items: { type: "object", properties: { city: { type: "string" }, area: { type: "string" }, map_url: { type: "string" } }, required: ["city", "area", "map_url"] } },
                  },
                  required: ["items"],
                },
                social: {
                  type: "object",
                  properties: { links: { type: "object", properties: { website: { type: "string" }, youtube: { type: "string" }, instagram: { type: "string" }, linkedin: { type: "string" }, facebook: { type: "string" }, twitter: { type: "string" } }, required: ["website", "youtube", "instagram", "linkedin", "facebook", "twitter"] } },
                  required: ["links"],
                },
                why_choose: bullets("Why choose this institute — sharp differentiators with proof points", 6),
                pros_cons: {
                  type: "object",
                  properties: {
                    items: {
                      type: "object",
                      properties: {
                        pros: { type: "array", items: { type: "string", description: "12-22 words, concrete." }, minItems: 5 },
                        cons: { type: "array", items: { type: "string", description: "Honest, balanced, 12-22 words." }, minItems: 3 },
                      },
                      required: ["pros", "cons"],
                    },
                  },
                  required: ["items"],
                },
                comparison: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array", minItems: 5,
                      description: "5-7 honest comparison rows vs typical alternatives (TIME / IMS / CL / 2IIM).",
                      items: {
                        type: "object",
                        properties: { point: { type: "string" }, us: { type: "string" }, others: { type: "string" } },
                        required: ["point", "us", "others"],
                      },
                    },
                  },
                  required: ["items"],
                },
                faqs: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array", minItems: 8,
                      description: "8-10 FAQs covering fees, batch start, demo, refund, mode, mocks, results, mentorship. Answers 40-80 words each.",
                      items: {
                        type: "object",
                        properties: { q: { type: "string" }, a: { type: "string" } },
                        required: ["q", "a"],
                      },
                    },
                  },
                  required: ["items"],
                },
                updates: {
                  type: "object",
                  properties: { items: { type: "array", minItems: 3, items: { type: "object", properties: { date: { type: "string" }, title: { type: "string" }, body: { type: "string" } }, required: ["date", "title", "body"] } } },
                  required: ["items"],
                },
                events: {
                  type: "object",
                  properties: { items: { type: "array", minItems: 3, items: { type: "object", properties: { date: { type: "string" }, title: { type: "string" }, body: { type: "string" }, link: { type: "string" } }, required: ["date", "title", "body", "link"] } } },
                  required: ["items"],
                },
                blog_resources: {
                  type: "object",
                  properties: { items: { type: "array", minItems: 3, items: { type: "object", properties: { label: { type: "string" }, url: { type: "string" } }, required: ["label", "url"] } } },
                  required: ["items"],
                },
                brochure: {
                  type: "object",
                  properties: { url: { type: "string" }, headline: { type: "string" } },
                  required: ["url", "headline"],
                },
                ctas: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array", minItems: 3,
                      items: {
                        type: "object",
                        properties: { label: { type: "string" }, url: { type: "string" }, style: { type: "string" } },
                        required: ["label", "url"],
                      },
                    },
                  },
                  required: ["items"],
                },
              },
              required: [
                "overview", "key_highlights", "courses_offered", "course_formats", "batch_details",
                "teaching_methodology", "faculty", "study_material", "mock_tests", "results",
                "topper_testimonials", "student_reviews", "admission_process", "eligibility",
                "fees", "scholarships", "demo_classes", "online_vs_offline", "doubt_solving", "mentorship",
                "infrastructure", "tech_platform", "mobile_app", "internship_placement", "tieups", "locations", "social",
                "why_choose", "pros_cons", "comparison", "faqs", "updates", "events", "blog_resources", "brochure", "ctas",
              ],
            },
          },
          required: ["basic", "sections"],
          additionalProperties: false,
        },
      },
    };

    const { res: aiRes, model: usedModel, provider } = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "publish_full_institute_profile" } },
      max_tokens: 16000,
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error(`${provider} error`, aiRes.status, txt);
      const lower = txt.toLowerCase();
      const msg = lower.includes("insufficient_quota") || lower.includes("exceeded your current quota")
        ? "OpenAI quota exhausted for the configured API key. Add billing/credits or switch to a funded key before continuing."
        : aiRes.status === 429
          ? "OpenAI rate limit reached. Pause for a minute, then retry the failed rows."
          : aiRes.status === 402
            ? "OpenAI credits exhausted. Add credits to continue."
            : `AI generation failed (${provider} ${aiRes.status})`;
      return new Response(JSON.stringify({ error: msg, code: lower.includes("insufficient_quota") ? "insufficient_quota" : `openai_${aiRes.status}`, detail: txt.slice(0, 400) }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    await logAIUsage("ai-coaching-institute-generate", usedModel, aiJson);


    const rawArgs = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!rawArgs) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try { parsed = JSON.parse(rawArgs); }
    catch (e) {
      return new Response(JSON.stringify({ error: "AI output malformed", detail: String(e).slice(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completed = completeProfile(parsed, brief, targetKw);

    // Wrap each section in { enabled: true, data: <payload> } to match
    // src/lib/instituteSections.ts storage shape.
    const wrapped: Record<string, { enabled: boolean; data: any }> = {};
    for (const [k, v] of Object.entries(completed.sections || {})) {
      wrapped[k] = { enabled: true, data: v as any };
    }

    return new Response(JSON.stringify({
      basic: completed.basic || {},
      sections: wrapped,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-coaching-institute-generate error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
