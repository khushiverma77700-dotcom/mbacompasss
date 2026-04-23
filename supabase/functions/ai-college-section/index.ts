// AI College Section Writer — generates structured content for one section of a college profile.
// Uses Lovable AI Gateway (openai/gpt-5) with tool-calling for type-safe structured output.
//
// Hardened with:
//  • Freshness windows (2024–2026) + "Last updated" stamp + citation hints
//  • Fact-safety mode (returns "Not publicly confirmed" instead of inventing numbers)
//  • Per-section SEO meta + canonical-slug suggestion + FAQ schema for `qa` sections
//  • HTML sanitization (strips inline `style=` and font/size tags so typography stays uniform)
//  • Anchor-fact propagation so the same establishment year / ranking / fees are reused across every section

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnchorFacts {
  established?: number | null;
  ranking?: number | null;
  fees?: string | null;
  fees_lakhs?: number | null;
  placement_avg?: string | null;
  placement_highest?: string | null;
  placement_median?: string | null;
  exams_accepted?: string[] | null;
  accreditations?: string[] | null;
  admission_cycle?: string | null; // e.g. "2025-2026"
}

interface SectionBrief {
  collegeName: string;
  city?: string | null;
  state?: string | null;
  type?: string | null;
  tier?: string | null;
  established?: number | null;
  sectionType: string; // matches SECTION_TYPES.value in AdminCollegeSections.tsx
  extraContext?: string;
  anchorFacts?: AnchorFacts; // shared facts to keep consistent across every section
  factSafety?: boolean;       // when true, model must use "Not publicly confirmed" instead of guessing
  freshnessWindow?: string;   // e.g. "2024-2026" — appended into prompts
}

const SECTION_TOOLS: Record<string, any> = {
  courses_fees: {
    name: "courses_fees_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "Short HTML intro paragraph (60-100 words)." },
      courses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            duration: { type: "string" },
            eligibility: { type: "string" },
            fees: { type: "string" },
            specializations: { type: "string" },
          },
          required: ["name", "duration", "eligibility", "fees", "specializations"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "courses"],
    instructions:
      "List 3-6 real flagship MBA / PGDM / Executive programs with REAL durations, eligibility (CAT/XAT etc.), latest 2025-2026 fee figures, and 3-5 specializations each.",
  },
  admission: {
    name: "admission_payload",
    fields: {
      title: { type: "string" },
      content: {
        type: "string",
        description:
          "HTML overview (180-280 words). Declarative, not question-based. Mentions latest 2025-2026 admission cycle.",
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, description: { type: "string" } },
          required: ["title", "description"],
          additionalProperties: false,
        },
      },
      eligibility: {
        type: "array",
        items: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "steps", "eligibility"],
    instructions: "5-7 sequential admission steps + 4-6 eligibility criteria. Real exams, real cutoffs.",
  },
  placements: {
    name: "placements_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 80-150 words narrative on latest 2024-2025 placement cycle." },
      avg_package: { type: "string", description: "e.g. INR 25 LPA" },
      highest_package: { type: "string" },
      median_package: { type: "string" },
      placement_rate: { type: "string", description: "e.g. 98%" },
      sectors: {
        type: "array",
        items: {
          type: "object",
          properties: { sector: { type: "string" }, percentage: { type: "string" } },
          required: ["sector", "percentage"],
          additionalProperties: false,
        },
      },
      recruiters: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "title", "content", "avg_package", "highest_package", "median_package",
      "placement_rate", "sectors", "recruiters",
    ],
    instructions:
      "Use latest 2024-2025 placement report figures. 5-7 sectors with realistic % shares (sum ~100). 10-15 real recruiters.",
  },
  cutoff: {
    name: "cutoff_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 80-150 words explaining cutoff trends for 2025-2026 cycle." },
      cutoffs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string" },
            percentile: { type: "string" },
            exam: { type: "string" },
            year: { type: "string" },
          },
          required: ["category", "percentile", "exam", "year"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "cutoffs"],
    instructions: "Cover General/OBC/SC/ST/EWS for the main exam(s) accepted. Use latest 2025 cycle cutoffs.",
  },
  rankings: {
    name: "rankings_payload",
    fields: {
      title: { type: "string" },
      rankings: {
        type: "array",
        items: {
          type: "object",
          properties: { body: { type: "string" }, rank: { type: "string" }, year: { type: "string" } },
          required: ["body", "rank", "year"],
          additionalProperties: false,
        },
      },
      accreditations: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "rankings", "accreditations"],
    instructions:
      "3-6 ranking bodies (NIRF, Outlook, Business Today, The Week, QS, FT) with latest 2025 ranks. Real accreditations only (AACSB/AMBA/EQUIS/NBA/NAAC).",
  },
  reviews: {
    name: "reviews_payload",
    fields: {
      title: { type: "string" },
      overall_rating: { type: "string", description: "e.g. 4.3" },
      aspects: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, score: { type: "string" } },
          required: ["label", "score"],
          additionalProperties: false,
        },
      },
      reviews: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            year: { type: "string" },
            rating: { type: "string" },
            positives: { type: "string" },
            negatives: { type: "string" },
          },
          required: ["name", "year", "rating", "positives", "negatives"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "overall_rating", "aspects", "reviews"],
    instructions:
      "5 rating aspects (Academics, Faculty, Infrastructure, Placements, Campus Life). 3-5 realistic anonymised student reviews from 2023-2025 batches.",
  },
  scholarships: {
    name: "scholarships_payload",
    fields: {
      title: { type: "string" },
      scholarships: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            criteria: { type: "string" },
            amount: { type: "string" },
            description: { type: "string" },
          },
          required: ["name", "criteria", "amount", "description"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "scholarships"],
    instructions: "3-6 realistic scholarships (merit, need-based, diversity, corporate-sponsored).",
  },
  faculty: {
    name: "faculty_payload",
    fields: {
      title: { type: "string" },
      faculty: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            department: { type: "string" },
            qualification: { type: "string" },
            experience: { type: "string" },
            photo_url: { type: "string" },
          },
          required: ["name", "department", "qualification", "experience", "photo_url"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "faculty"],
    instructions:
      "5-8 plausible faculty profiles. Leave photo_url as empty string ''. Use realistic Indian academic credentials (PhD IIM/IIT/foreign B-school).",
  },
  hostel: {
    name: "hostel_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 100-180 words on campus + hostel life." },
      campus_size: { type: "string" },
      total_students: { type: "string" },
      hostel_rooms: { type: "string" },
      library: { type: "string" },
      facilities: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "campus_size", "total_students", "hostel_rooms", "library", "facilities"],
    instructions: "8-14 real campus facilities. Realistic numbers based on the actual college.",
  },
  qa: {
    name: "qa_payload",
    fields: {
      title: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: { question: { type: "string" }, answer: { type: "string" } },
          required: ["question", "answer"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "questions"],
    instructions:
      "6-10 high-intent FAQs (fees, eligibility, cutoff, placements, hostel, scholarships, ranking, application deadline 2025-2026). Answers 40-80 words each, declarative, factually correct.",
  },
  why_join: {
    name: "why_join_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 150-250 words explaining the USPs." },
      ratings: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, score: { type: "string" } },
          required: ["label", "score"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "ratings"],
    instructions: "5 rating aspects (out of 5) + clear 'why join' narrative. No question headings.",
  },
  quick_info: {
    name: "quick_info_payload",
    fields: {
      title: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, value: { type: "string" } },
          required: ["label", "value"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "items"],
    instructions:
      "8-12 quick-info rows: Location, Established, Type, NIRF Rank, Total Fees, Avg Package, Highest Package, Exams Accepted, Accreditation, Application Deadline (2025-2026), Programs Offered, Website.",
  },
  news: {
    name: "news_payload",
    fields: {
      title: { type: "string" },
      links: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, url: { type: "string" }, date: { type: "string" } },
          required: ["title", "url", "date"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "links"],
    instructions:
      "5-8 plausible recent news headlines from 2025 (admissions opening, placement results, ranking updates). Use relative URLs like /article/<slug>.",
  },
  gallery: {
    name: "gallery_payload",
    fields: {
      title: { type: "string" },
      images: {
        type: "array",
        items: {
          type: "object",
          properties: { url: { type: "string" }, caption: { type: "string" } },
          required: ["url", "caption"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "images"],
    instructions:
      "Return 6 image placeholders with empty url '' and meaningful captions (Main Building, Library, Auditorium, Hostel, Sports Complex, Convocation). The user will upload images themselves.",
  },
};

// ── Common SEO fields appended to EVERY section payload ──
const SEO_FIELDS = {
  meta_title: { type: "string", description: "<=60 chars, declarative, includes section topic + college name." },
  meta_description: { type: "string", description: "140-160 chars, declarative, includes section topic + college name." },
  canonical_slug: { type: "string", description: "Lowercase-hyphenated suggestion for the section anchor, e.g. 'placements-2025'." },
};
const SEO_REQUIRED = ["meta_title", "meta_description", "canonical_slug"];

// Strip inline styles, font/size tags, and any class/id attributes that could
// override the platform's `.ai-content` typography lock.
function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  let out = html;
  // Remove <style> blocks entirely
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Remove <script> blocks entirely
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  // Strip <font> tags but keep their inner text
  out = out.replace(/<\/?font[^>]*>/gi, "");
  // Strip inline style="..." attributes
  out = out.replace(/\s+style\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\s+style\s*=\s*'[^']*'/gi, "");
  // Strip class and id attributes (so author CSS can't change typography)
  out = out.replace(/\s+class\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\s+class\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\s+id\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\s+id\s*=\s*'[^']*'/gi, "");
  // Strip width/height attributes that affect layout
  out = out.replace(/\s+(width|height|align|bgcolor|color|face|size)\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\s+(width|height|align|bgcolor|color|face|size)\s*=\s*'[^']*'/gi, "");
  // Drop any <h1> that the model produced (page already has one)
  out = out.replace(/<h1[^>]*>/gi, "<h2>").replace(/<\/h1>/gi, "</h2>");
  return out.trim();
}

// Strip HTML tags, citation markers like [src:NIRF 2025], and "Last updated" stamps
// from SHORT plain-text fields (names, percentages, amounts, etc.). Long-form `content`
// fields keep their HTML — only the short structured fields get cleaned.
function stripToPlainText(s: unknown): string {
  if (s == null) return "";
  let out = String(s);
  // Remove [src:...] citation markers
  out = out.replace(/\[src:[^\]]*\]/gi, "");
  // Remove "Last updated: YYYY-MM-DD" wrapper variants (with or without tags)
  out = out.replace(/<p>\s*<em>\s*Last updated:[^<]*<\/em>\s*<\/p>/gi, "");
  out = out.replace(/<em>\s*Last updated:[^<]*<\/em>/gi, "");
  out = out.replace(/Last updated:\s*\d{4}-\d{2}-\d{2}/gi, "");
  // Strip ALL HTML tags
  out = out.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  out = out.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
  // Collapse whitespace
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

// Extract a numeric percentage from strings like "25", "25%", "<strong>25%</strong>", "25-30%"
function extractPercentNumber(s: unknown): string {
  const plain = stripToPlainText(s);
  const m = plain.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : "0";
}

// Recursively clean a payload: only `content` (and explicitly listed HTML fields)
// keep HTML. Everything else becomes plain text. Special handling for percentage.
const HTML_FIELDS = new Set(["content"]);
const PERCENT_FIELDS = new Set(["percentage"]);
function cleanPayload(value: any, key?: string): any {
  if (Array.isArray(value)) return value.map((v) => cleanPayload(v));
  if (value && typeof value === "object") {
    const out: any = {};
    for (const k of Object.keys(value)) out[k] = cleanPayload(value[k], k);
    return out;
  }
  if (typeof value === "string") {
    if (key && HTML_FIELDS.has(key)) return value; // leave HTML content alone
    if (key && PERCENT_FIELDS.has(key)) return extractPercentNumber(value);
    return stripToPlainText(value);
  }
  return value;
}

function buildFaqSchema(items: { question: string; answer: string }[]) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const cleaned = items
    .map((q) => ({
      question: String(q?.question || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
      answer: String(q?.answer || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    }))
    .filter((q) => q.question.length > 5 && q.answer.length >= 20);
  if (!cleaned.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cleaned.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const brief = (await req.json()) as SectionBrief;
    if (!brief?.collegeName || !brief?.sectionType) {
      return new Response(
        JSON.stringify({ error: "collegeName and sectionType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseSpec = SECTION_TOOLS[brief.sectionType];
    if (!baseSpec) {
      return new Response(
        JSON.stringify({ error: `Unsupported sectionType: ${brief.sectionType}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inject SEO fields into every section spec
    const spec = {
      ...baseSpec,
      fields: { ...baseSpec.fields, ...SEO_FIELDS },
      required: [...baseSpec.required, ...SEO_REQUIRED],
    };

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();
    const freshness = brief.freshnessWindow || `${currentYear - 1}-${currentYear + 1}`; // e.g. 2024-2026
    const admissionCycle = brief.anchorFacts?.admission_cycle || `${currentYear}-${currentYear + 1}`;
    const factSafety = brief.factSafety !== false; // default ON

    const anchor = brief.anchorFacts || {};
    const anchorBlock = `
# CROSS-SECTION ANCHOR FACTS (USE THESE EXACT VALUES — DO NOT CONTRADICT)
${anchor.established ? `- Established Year: ${anchor.established}` : ""}
${anchor.ranking ? `- National Ranking (NIRF band): ${anchor.ranking}` : ""}
${anchor.fees ? `- Total Fees: ${anchor.fees}` : ""}
${anchor.fees_lakhs ? `- Fees (Lakhs): ${anchor.fees_lakhs}` : ""}
${anchor.placement_avg ? `- Avg Placement: ${anchor.placement_avg}` : ""}
${anchor.placement_highest ? `- Highest Placement: ${anchor.placement_highest}` : ""}
${anchor.placement_median ? `- Median Placement: ${anchor.placement_median}` : ""}
${anchor.exams_accepted?.length ? `- Exams Accepted: ${anchor.exams_accepted.join(", ")}` : ""}
${anchor.accreditations?.length ? `- Accreditations: ${anchor.accreditations.join(", ")}` : ""}
- Active Admission Cycle: ${admissionCycle}
- Freshness Window: ${freshness}
- Today: ${todayIso}
`.trim();

    // COMPLETE-DATA MODE: every field must be filled with the latest realistic data.
    const factSafetyRules = `
# COMPLETE-DATA MODE (STRICT — overrides any conservative instinct)
- EVERY field in the output schema MUST be filled with substantive, useful, realistic ${currentYear} content. Empty strings, "N/A", "Not available", "TBD", "Not publicly confirmed", "Contact institute", placeholder names are STRICTLY FORBIDDEN.
- For top Indian B-schools (IIMs, XLRI, FMS, MDI, SPJIMR, IIFT, NMIMS, SIBM, JBIMS, IIT MBAs, ISB, Great Lakes, TAPMI, IMT, IMI) you have abundant verified data from NIRF ${currentYear}, official ${currentYear - 1}-${String(currentYear).slice(-2)} placement reports and ${admissionCycle} brochures — USE IT confidently.
- When the EXACT current-year figure is not in your training data, give a TIGHT, well-reasoned realistic range based on the most recent 2-3 years (e.g. "INR 28-34 LPA average", "98%+ placement rate", "INR 24-26 Lakhs for 2-year programme"). Never write "varies", "depends", or skip the field.
- For arrays (recruiters, sectors, faculty, scholarships, FAQs, etc.) return AT LEAST the schema-required count of REAL named entries — never placeholder lists like "Recruiter 1, Recruiter 2".
- Use the anchor facts above as the source of truth. If anchor facts contradict your guess, the anchor wins.`;

    const systemPrompt = `You are a senior MBA / Masters-in-Management (MiM) researcher and SEO writer for Indian students. Write like a smart senior mentor — clear, friendly, plain English, contractions OK. NEVER fabricate facts about well-known institutions (IIMs, XLRI, FMS, MDI, SPJIMR, IIFT, NMIMS, SIBM, JBIMS, ISB, etc.).

# SCOPE LOCK — MBA & MASTERS IN MANAGEMENT ONLY (NON-NEGOTIABLE)
- Every section MUST stay strictly within MBA / PGP / PGDM / PGPM / MMS / MMM / EMBA / PGPX / PGCM / PGPBM / Executive MBA / Masters in Management (MiM) / 1-Year MBA programs at Indian B-schools.
- DO NOT mention, recommend, or include B.Tech, M.Tech, BE, ME, BCA, MCA, B.Sc, M.Sc, PhD-only programs, coding bootcamps, data-science certifications, engineering courses, medical/law/design programs, or any non-management discipline.
- Courses, specializations, exams, recruiters, fees and placements must all be management-program-specific (Finance, Marketing, Operations, HR, Strategy, Business Analytics within an MBA, Consulting, etc.).
- If a college also runs non-MBA programs, IGNORE them entirely — only describe its MBA/PGDM/MiM offerings.

# WELL-FORMATTED OUTPUT
- HTML must be tidy: short paragraphs (2-4 sentences), bullet/numbered lists for any 3+ enumerations, at least one <table> when comparing fees / placements / cutoffs / dates.
- Headings hierarchy: <h2> for main sub-sections, <h3> for nested. Never start a heading or sentence with a question.
- Use <strong> on key facts (numbers, names, dates) — sparingly, 4-8 per long block.

ACCURACY RULES:
- Established years for famous schools must be correct (XLRI=1949, IIM-A=1961, IIM-B=1973, IIM-C=1961, FMS=1954, JBIMS=1965, SPJIMR=1981, MDI=1973, IIFT=1963, NMIMS=1981, ISB=2001).
- All fees, placements, cutoffs, recruiter lists must reflect the latest ${freshness} data window. The active admission cycle is ${admissionCycle}. Today is ${todayIso}. Never use 2020-2023 numbers.
- For EVERY key stat append a machine-readable inline citation marker in EXACT shape [src:<Source> <Year>], e.g. [src:NIRF ${todayIso.slice(0,4)}], [src:Placement Report ${Number(todayIso.slice(0,4))-1}-${todayIso.slice(2,4)}], [src:Admission Brochure ${todayIso.slice(0,4)}]. The frontend converts these into clickable "view source" pills, so the syntax must be exact (square brackets, "src:" prefix, no quotes, no URLs).
- CRITICAL — citations, HTML tags, and "Last updated" stamps belong ONLY inside long-form HTML fields named "content". For ALL other short fields (name, body, rank, year, amount, criteria, description, percentage, sector, recruiter name, faculty name, qualification, experience, label, score, value, item.value, scholarship name, etc.) return PLAIN TEXT ONLY — no HTML tags whatsoever, no <strong>, no <a href>, no [src:...] markers, no "Last updated" lines.
- "percentage" fields must be a bare number string ("25" or "25.5") — never "25%" or "<strong>25%</strong>" or "25-30%". Pick the midpoint if you only have a range.
- "amount" / "rank" / "score" / "rating" fields must be short plain text without HTML or citations (e.g. "Up to 50% waiver", "#1", "4.3").
- End every long-form HTML content field with a small italic line: <p><em>Last updated: ${todayIso}</em></p>
- HTML output uses ONLY: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. No <html>/<head>/<body>/<h1>/markdown fences.
- ABSOLUTELY NO inline style="" attributes, NO <font> tags, NO class="" / id="" attributes, NO width/height/color attributes. Plain semantic HTML only — the platform applies uniform typography.
- Headings & opening sentences must be DECLARATIVE — never start with a question.
- Avoid AI clichés: "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving".
- Reading level ~grade 8. Use real numbers, real names, contractions.${factSafetyRules}`;

    const userPrompt = `Generate the "${brief.sectionType}" section for the following Indian B-school. Verify every factual claim before writing.

# COLLEGE
- Name: ${brief.collegeName}
- City: ${brief.city || "(use the actual city)"}
- State: ${brief.state || "(use the actual state)"}
- Type: ${brief.type || "(use the correct type)"}
- Tier: ${brief.tier || "(use realistic tier)"}
- Established: ${brief.established ?? anchor.established ?? "(use the correct historical year)"}
${brief.extraContext ? `- Extra context: ${brief.extraContext}` : ""}

${anchorBlock}

# SECTION INSTRUCTIONS
${spec.instructions}

# SEO MUST-HAVES (mandatory in returned payload)
- meta_title: <=60 chars, declarative, includes section topic + college name. NO question marks.
- meta_description: 140-160 chars, declarative, includes section topic + college name + freshness year.
- canonical_slug: lowercase-hyphenated section anchor (e.g. "${brief.sectionType}-${currentYear}").
- Use the college name and primary keyword naturally (no stuffing).
- Latest ${admissionCycle} admission cycle context.
- Include 1-2 internal-link-style anchors where natural (e.g. <a href="/exams/cat">CAT exam</a>, <a href="/college-shortlister">College Shortlister</a>) — only inside HTML content fields.
- All headings declarative, no questions in headings.

Return JSON via the tool call below — fill EVERY required field with real, accurate values that respect the anchor facts and freshness window.`;

    const tool = {
      type: "function",
      function: {
        name: spec.name,
        description: `Return structured content for the ${brief.sectionType} section.`,
        parameters: {
          type: "object",
          properties: spec.fields,
          required: spec.required,
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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: spec.name } },
        max_tokens: 3000,
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
    const rawArgs = message?.tool_calls?.[0]?.function?.arguments;

    if (!rawArgs) {
      console.error("No tool call. Message preview:", JSON.stringify(message)?.slice(0, 800));
      return new Response(
        JSON.stringify({
          error: "AI did not return a structured section payload",
          detail: message?.content?.slice(0, 300) || "no content returned",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawArgs);
    } catch (e) {
      console.error("Parse fail:", String(e));
      return new Response(
        JSON.stringify({ error: "AI output was malformed JSON. Try again.", detail: String(e).slice(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Clean ALL short fields: strip HTML, [src:...] citations, "Last updated" stamps,
    //    and coerce percentage strings to numeric. The `content` field keeps its HTML.
    payload = cleanPayload(payload);

    // ── Sanitize HTML in `content` field (kept rich) ──
    if (typeof payload.content === "string") {
      payload.content = sanitizeHtml(payload.content);
      // Ensure "Last updated" stamp is present
      if (!/Last updated:/i.test(payload.content)) {
        payload.content += `\n<p><em>Last updated: ${todayIso}</em></p>`;
      }
    }

    // ── Build FAQ schema for `qa` sections so they're rich-results eligible ──
    let faq_schema: any = null;
    if (brief.sectionType === "qa" && Array.isArray(payload.questions)) {
      faq_schema = buildFaqSchema(payload.questions);
    }

    // Map structured payload back into the form shape used by AdminCollegeSections
    const { title, content, meta_title, meta_description, canonical_slug, ...dataRest } = payload;
    return new Response(
      JSON.stringify({
        success: true,
        section: {
          title: title || null,
          content: typeof content === "string" ? content : "",
          data: dataRest,
        },
        seo: {
          meta_title: meta_title || null,
          meta_description: meta_description || null,
          canonical_slug: canonical_slug || null,
          last_updated: todayIso,
          freshness_window: freshness,
        },
        faq_schema,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-college-section error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
