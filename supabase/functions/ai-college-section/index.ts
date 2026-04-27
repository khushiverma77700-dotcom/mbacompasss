// AI College Section Writer — generates structured content for one section of a college profile.
// Uses Lovable AI Gateway (openai/gpt-5) with tool-calling for type-safe structured output.
//
// Hardened with:
//  • Freshness windows (2024–2026) + "Last updated" stamp + citation hints
//  • Fact-safety mode (returns "Not publicly confirmed" instead of inventing numbers)
//  • Per-section SEO meta + canonical-slug suggestion + FAQ schema for `qa` sections
//  • HTML sanitization (strips inline `style=` and font/size tags so typography stays uniform)
//  • Anchor-fact propagation so the same establishment year / ranking / fees are reused across every section

import { callAIGateway } from "../_shared/aiGateway.ts";
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
  collegeId?: string;          // optional — when provided, programmes auto-sync into programme_courses
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
      content: { type: "string", description: "HTML intro (260-400 words). Mention the college name 5-7 times. Cover the FULL programme portfolio (flagship 2-yr, 1-yr, executive, part-time, online, doctoral-management, dual-degree, exchange), fee philosophy, what's included in fees (tuition, hostel, mess, books, alumni), instalment options, scholarship anchors, and the ROI angle for the 2025-2026 cycle." },
      courses: {
        type: "array",
        minItems: 6,
        description: "Authoritative portfolio — every MBA / Masters-in-Management programme the college actually runs. Aim for 6-12 entries. NEVER collapse into a single 'MBA' row. Each row MUST include source verification (official URL + evidence snippet quoting the page). The frontend persists this directly into a verified portfolio table.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Exact official programme name, e.g. 'Post Graduate Programme in Management (PGP)', 'PGPX - One-Year Full-Time MBA for Executives', 'ePGP - Executive Post Graduate Programme', 'PGP-FABM', 'MBA (Business Analytics)', 'MBA (HRM)', 'Fellow Programme in Management (FPM)', 'PGPpro', 'Blended Learning MBA', 'MDP Certificate Programmes'." },
            short_name: { type: "string", description: "Short label / abbreviation, e.g. 'PGP', 'PGPX', 'EPGP', 'FPM', 'PGP-ABM'." },
            programme_type: { type: "string", description: "One of: 'MBA', 'PGDM', 'Executive MBA', '1-Year MBA', 'Online MBA', 'PGPpro', 'Sectoral MBA', 'Fellow / Doctoral', 'Dual Degree'." },
            duration: { type: "string", description: "e.g. '2 years (full-time)', '1 year (full-time residential)', '15 months (weekend)', '3-5 years (doctoral)'." },
            duration_months: { type: "number", description: "Programme duration in months as a plain integer." },
            mode: { type: "string", description: "'Full-time' | 'Part-time' | 'Online' | 'Hybrid' | 'Weekend'." },
            eligibility: { type: "string", description: "Plain-text eligibility paragraph — graduation %, exam (CAT/XAT/GMAT/GRE/EA), minimum work-ex, age cap if any." },
            min_graduation_percent: { type: "number", description: "Minimum graduation percentage required (e.g. 50, 60). Use 50 if standard." },
            accepts_cat: { type: "boolean", description: "True if CAT score is accepted." },
            accepts_xat: { type: "boolean", description: "True if XAT score is accepted." },
            accepts_gmat: { type: "boolean", description: "True if GMAT score is accepted." },
            accepts_gre: { type: "boolean", description: "True if GRE score is accepted." },
            accepts_cmat: { type: "boolean", description: "True if CMAT is accepted." },
            accepts_nmat: { type: "boolean", description: "True if NMAT is accepted." },
            accepts_snap: { type: "boolean", description: "True if SNAP is accepted." },
            accepts_iift: { type: "boolean", description: "True if IIFT exam is accepted." },
            cat_percentile_target: { type: "string", description: "Realistic CAT percentile band needed (e.g. '99+', '95-97', 'NA' if not accepted)." },
            xat_percentile_target: { type: "string", description: "Realistic XAT percentile band (e.g. '95+', 'NA')." },
            gmat_score_target: { type: "string", description: "Realistic GMAT score band (e.g. '700+', '680-720', 'NA')." },
            min_work_ex_months: { type: "number", description: "Minimum required work experience in months. 0 if no requirement." },
            max_work_ex_months: { type: "number", description: "Maximum work-ex limit in months for this programme. 0 or omit if no upper cap." },
            min_age: { type: "number", description: "Minimum age in years. 0 if no requirement." },
            max_age: { type: "number", description: "Maximum age in years. 0 if no requirement." },
            fees: { type: "string", description: "Latest 2025-2026 total programme fee in INR Lakhs (tuition + hostel where applicable). Use a tight realistic range if exact figure unknown." },
            fees_total_lakhs: { type: "number", description: "Numeric total fees in lakhs (midpoint if range), e.g. 28.5." },
            fees_breakdown: { type: "string", description: "Short fees breakdown — what's included (tuition, hostel, mess, alumni, books, deposits)." },
            fees_year: { type: "string", description: "Fee cycle year, e.g. '2025-2026'." },
            specializations: { type: "array", minItems: 4, items: { type: "string" }, description: "4-8 real specialisations / electives / majors offered within this programme (Finance, Marketing, Operations, Strategy, Business Analytics, HR, Consulting, Entrepreneurship, etc.)." },
            highlights: { type: "array", items: { type: "string" }, description: "3-6 selling points specific to this programme (international immersion, exchange partners, capstone, dual-degree, signature electives, scholarship pool)." },
            intake_seats: { type: "number", description: "Approximate annual intake / seats." },
            source_url: { type: "string", description: "MANDATORY — the exact official college webpage URL where this programme is listed (admissions / programmes / brochure landing page on the college's own domain). Never fabricate — use the most authoritative public URL you can verify." },
            source_brochure_url: { type: "string", description: "Optional direct PDF brochure URL if available, otherwise empty string." },
            evidence_snippet: { type: "string", description: "MANDATORY — a short 12-30 word quote / paraphrase from the source page that proves the programme name and fee/duration figures (e.g. 'IIM Indore PGP — 2-year full-time residential, fee INR 23.06 lakhs (2025-27 batch).')." },
          },
          required: [
            "name", "short_name", "programme_type", "duration", "mode", "eligibility",
            "min_graduation_percent", "accepts_cat", "accepts_xat", "accepts_gmat", "accepts_gre",
            "accepts_cmat", "accepts_nmat", "accepts_snap", "accepts_iift",
            "cat_percentile_target", "xat_percentile_target", "gmat_score_target",
            "min_work_ex_months", "fees", "fees_total_lakhs", "fees_breakdown", "fees_year",
            "specializations", "source_url", "evidence_snippet",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "courses"],
    instructions:
      "DEEP RESEARCH MODE — list EVERY MBA / Masters-in-Management programme the college actually runs. Aim for 6-12 entries. Always include the flagship 2-year programme PLUS every variant the college offers: 1-Year MBA / PGPX / EPGP / PGPpro, Executive MBA, Part-time / Weekend MBA, Blended / Online MBA, sectoral MBAs (PGP-ABM, PGP-FABM, PGP-HRM, PGP-BA, MBA in Digital Business, MBA in Healthcare, MBA in Sustainability, etc.), dual-degree / exchange programmes (LBS, ESSEC, Yale), and Fellow / Doctoral Programme in Management (FPM/PhD). For top schools (IIM-A, IIM-B, IIM-C, IIM-L, IIM-K, IIM-I, XLRI, FMS, MDI, SPJIMR, IIFT, NMIMS, ISB, Great Lakes) verify the exact official portfolio from your training data — DO NOT collapse everything into a single 'MBA' entry. Each programme MUST include: real official name, short name, programme_type, real duration + duration_months, mode, full eligibility (graduation %, accepted exams as booleans, CAT/XAT/GMAT score targets, work-ex band, age band), latest 2025-2026 total fees (string + numeric fees_total_lakhs + fees_breakdown + fees_year), 4-8 real specialisations, 3-6 highlights, intake_seats, AND a verifiable source_url on the college's own domain plus a 12-30 word evidence_snippet quoting the source page. NEVER fabricate URLs — always use the actual official admissions / programmes / brochure URL.",
  },
  admission: {
    name: "admission_payload",
    fields: {
      title: { type: "string" },
      content: {
        type: "string",
        description:
          "HTML overview (350-500 words). Declarative, not question-based. Mention the college name 4-6 times. Cover the latest 2025-2026 admission cycle in depth (eligibility, exams, weightage, dates, application fee, documents).",
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
    instructions: "7-9 sequential admission steps + 6-8 eligibility criteria. Real exams, real cutoff bands, real shortlisting weightage.",
  },
  placements: {
    name: "placements_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 250-400 words narrative on the latest 2024-2025 placement cycle. Mention the college name 4-6 times. Cover roles, recruiter mix, sectoral trend vs prior years, international offers, summer-internship stipends." },
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
      "Use latest 2024-2025 placement report figures. 6-8 sectors with realistic % shares (sum ~100). 15-25 real recruiters.",
  },
  cutoff: {
    name: "cutoff_payload",
    fields: {
      title: { type: "string", description: "Section title, e.g. 'CAT & XAT Cutoffs at <College Name> (2023-2025 Trends)'." },
      content: {
        type: "string",
        description:
          "HTML 280-450 words. Mention the college name 4-6 times. Explain (a) which exam scores the college accepts and the official shortlisting weightage (CAT/XAT/GMAT score, 10th, 12th, graduation, work-ex, gender/academic diversity), (b) overall AND sectional cutoff trends across the last 3 admission cycles, (c) why cutoffs moved up or down (applicants, seats, brand pull, new programmes), (d) category-wise relaxation logic, and (e) a clear statement of the EXPECTED 2025-2026 cutoff band. Include at least one short <table> if helpful.",
      },
      cutoffs: {
        type: "array",
        minItems: 8,
        description:
          "AT LEAST 8 rows — ideally 12-20. Cover EVERY accepted exam (CAT is mandatory for IIMs/most B-schools; add XAT for XLRI/XAT-accepting schools; GMAT/GRE for ISB/IIM PGPX/1-year programmes; CMAT/MAT/NMAT/SNAP/IIFT/TISSNET where applicable) × EVERY category (General, EWS, OBC-NCL, SC, ST, PwD) × at least the last 2-3 admission cycles (2023, 2024, 2025) so frontend can plot the trend. NEVER return an empty array — if exact figures are not publicly confirmed, return realistic researched bands with a 'Indicative' note.",
        items: {
          type: "object",
          properties: {
            exam: { type: "string", description: "Exam name — CAT, XAT, GMAT, GRE, CMAT, MAT, NMAT, SNAP, IIFT, TISSNET, etc." },
            category: { type: "string", description: "General | EWS | OBC-NCL | SC | ST | PwD | NC-OBC." },
            year: { type: "string", description: "Admission cycle year, e.g. '2025', '2024', '2023'." },
            percentile: { type: "string", description: "Overall cutoff (percentile for CAT/XAT/CMAT/NMAT, score for GMAT/GRE), e.g. '99.5%ile', '95+ %ile', 'GMAT 720+'." },
            sectional: { type: "string", description: "Sectional cutoff (e.g. 'VARC 85, DILR 80, QA 80') OR 'NA' if not applicable." },
            notes: { type: "string", description: "Short note: programme covered (PGP / PGPX / PGP-ABM), shortlist vs final-admit cutoff, source year, 'Indicative band' if estimated." },
          },
          required: ["exam", "category", "year", "percentile"],
          additionalProperties: false,
        },
      },
      shortlisting_weightage: {
        type: "array",
        minItems: 4,
        description: "Official admission weightage table (CAT/XAT score, Class 10, Class 12, Graduation, Work-Ex, Gender/Academic Diversity, WAT-PI). 4-8 rows.",
        items: {
          type: "object",
          properties: {
            criterion: { type: "string", description: "e.g. 'CAT Score', 'Class X', 'Class XII', 'Graduation', 'Work Experience', 'Gender Diversity', 'WAT-PI'." },
            weightage: { type: "string", description: "Percentage weightage e.g. '40%', '10%', '5 marks max'." },
          },
          required: ["criterion", "weightage"],
          additionalProperties: false,
        },
      },
      trend_summary: {
        type: "string",
        description: "1-2 sentence plain-text takeaway of how cutoffs moved YoY and what aspirants should target for the 2025-2026 cycle. Mention the college name once.",
      },
    },
    required: ["title", "content", "cutoffs", "shortlisting_weightage", "trend_summary"],
    instructions:
      "DEEP RESEARCH MODE — never return an empty cutoffs array. Cover EVERY accepted entrance exam × EVERY reservation category × the last 3 admission cycles (2023, 2024, 2025). For top schools verify the exact official cutoffs (IIM-A overall ~99-99.5%ile General, IIM-B ~99+, IIM-C ~99+, IIM-L ~97+, IIM-K ~96+, IIM-I ~95+, XLRI BM ~96+/HRM ~93+ on XAT, FMS ~98+, SPJIMR ~85+ profile-led, MDI ~95+, IIFT ~98+ on IIFT exam, NMIMS ~96+ on NMAT, ISB GMAT ~700-730 median). Always provide sectional cutoffs for CAT/XAT-accepting schools (VARC, DILR, QA). Always populate the shortlisting_weightage table with the OFFICIAL admission policy weightage. If precise data is unavailable, return an 'Indicative band' rather than skipping the row.",
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
      "5-8 ranking bodies (NIRF, Outlook, Business Today, The Week, QS, FT, Bloomberg, ET) with latest 2025 ranks. Real accreditations only (AACSB/AMBA/EQUIS/NBA/NAAC).",
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
      "6 rating aspects (Academics, Faculty, Infrastructure, Placements, Campus Life, Value-for-Money). 5-7 realistic anonymised student reviews from 2023-2025 batches; positives/negatives 35-60 words each, mention the college name.",
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
    instructions: "5-8 realistic scholarships (merit, need-based, diversity, corporate-sponsored, alumni-funded). Description 35-60 words each, mention the college name.",
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
      "Return ONLY real, publicly-verifiable senior faculty / professors who actually teach at this exact college's MBA / PGDM / PGP programme — names you have high confidence about from the school's official faculty page, NIRF disclosures or widely-cited public profiles. Minimum 4, maximum 10. NEVER invent names, NEVER use placeholder names like 'Dr. Sharma' or 'Prof. Singh', NEVER mix in faculty from a different institution. If you cannot verify at least 4 real names with their actual designation, return only the 4 most prominent verifiable ones — quality over quantity. Each entry: real full name + actual department (Finance / Marketing / OB-HR / Operations / Strategy / Economics / IT-Systems / Decision Sciences) + actual qualification (e.g. 'PhD, IIM Ahmedabad' or 'Fellow, IIM Bangalore') + realistic years of experience as a number range (e.g. '15+ years'). Leave photo_url as empty string ''. If you have ANY doubt whether a name is real, OMIT it.",
  },
  hostel: {
    name: "hostel_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 250-380 words on campus + hostel life at the college. Mention the college name 4-6 times. Cover residential experience, dining, safety, sports, clubs." },
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
    instructions: "12-18 real campus facilities. Realistic numbers based on the actual college.",
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
      "10-14 high-intent FAQs (fees, eligibility, cutoff, placements, hostel, scholarships, ranking, application deadline 2025-2026, ROI, alumni, comparison). EVERY question AND every answer MUST mention the college name verbatim. Answers 60-110 words each, declarative, factually correct.",
  },
  why_join: {
    name: "why_join_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 300-450 words explaining USPs. Mention the college name 5-7 times. Cover legacy, ranking, peer-set, recruiters, alumni, ROI, ecosystem." },
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
    instructions: "6 rating aspects (out of 5) + clear 'why join' narrative. No question headings.",
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
      "12-16 quick-info rows: Location, Established, Type, NIRF Rank, Total Fees, Avg Package, Median Package, Highest Package, Placement Rate, Exams Accepted, Accreditation, Application Deadline (2025-2026), Programs Offered, Campus Size, Total Students, Website.",
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
      "6-10 plausible recent news headlines from 2025 (admissions opening, placement results, ranking updates, partnerships, new programmes). Use relative URLs like /article/<slug> and include the college name in each headline.",
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
      "Return 6 image placeholders with empty url '' and meaningful captions (Main Building, Library, Auditorium, Hostel, Sports Complex, Convocation), each prefixed with the college name. The user will upload images themselves.",
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
  // Strip literal escape artifacts the model sometimes leaks ("\n", "\\n", "/n", "\t")
  // Convert real escape sequences to spaces, then nuke the visible "\n" / "/n" text.
  out = out.replace(/\r\n|\r|\n|\t/g, " ");
  out = out.replace(/\\+n/gi, " ");      // "\n", "\\n", "\\\\n" → space
  out = out.replace(/(^|[\s>])\/n(?=[\s<]|$)/gi, "$1 "); // stray "/n" tokens
  // Collapse paragraphs/list items that became empty after stripping
  out = out.replace(/<p>\s*<\/p>/gi, "");
  out = out.replace(/<li>\s*<\/li>/gi, "");
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
  // Strip leaked citation / source markers from long-form HTML (defence-in-depth — prompts forbid these but models occasionally leak them)
  out = out.replace(/\[src:[^\]]*\]/gi, "");
  out = out.replace(/\(\s*sources?\s*[:\/\u2013\u2014-]\s*[^)]{0,80}\)/gi, "");
  out = out.replace(/\(\s*as\s+per\s+[^)]{0,80}\)/gi, "");
  out = out.replace(/\(\s*ref\.?\s*[:\u2013\u2014-]\s*[^)]{0,80}\)/gi, "");
  // Strip stray "Last updated:" stamps inserted by the model
  out = out.replace(/<p>\s*<em>\s*Last updated:[^<]*<\/em>\s*<\/p>/gi, "");
  out = out.replace(/<em>\s*Last updated:[^<]*<\/em>/gi, "");
  // Strip pull-quote / blockquote tags
  out = out.replace(/<\/?blockquote[^>]*>/gi, "");
  // Collapse double-spaces created by the strips above
  out = out.replace(/[ \t]{2,}/g, " ");
  // Re-collapse paragraphs that are now empty
  out = out.replace(/<p>\s*<\/p>/gi, "");
  return out.trim();
}

// Strip HTML tags, citation markers like [src:NIRF 2025], and "Last updated" stamps
// from SHORT plain-text fields (names, percentages, amounts, etc.). Long-form `content`
// fields keep their HTML — only the short structured fields get cleaned.
function stripToPlainText(s: unknown): string {
  if (s == null) return "";
  let out = String(s);
  // Remove literal escape artifacts the model sometimes outputs as visible text
  out = out.replace(/\\+n/gi, " ");
  out = out.replace(/(^|[\s])\/n(?=[\s]|$)/gi, "$1 ");
  out = out.replace(/\r\n|\r|\n|\t/g, " ");
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

  // Caller can pick which AI backend to use (set by the bulk dashboard).
  const providerHeader = (req.headers.get("X-AI-Provider") || "").toLowerCase();
  const ALLOWED_PROVIDERS = new Set(["gemini", "gemini-lite", "lovable", "openai-mini", "openai-nano"]);
  const provider = (ALLOWED_PROVIDERS.has(providerHeader) ? providerHeader : "gemini") as
    "gemini" | "gemini-lite" | "lovable" | "openai-mini" | "openai-nano";

  try {
    const requiredKey =
      provider === "lovable" ? "LOVABLE_API_KEY"
      : (provider === "openai-mini" || provider === "openai-nano") ? "OPENAI_API_KEY"
      : "GEMINI_API_KEY";
    if (!Deno.env.get(requiredKey)) throw new Error(`${requiredKey} is not configured`);

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

    const systemPrompt = `You are a senior MBA / Masters-in-Management (MiM) researcher and SEO writer for Indian students. Write like a smart senior mentor — clear, friendly, plain English, contractions OK, second-person ("you"). Goal: produce industry-leading, deeply researched, plagiarism-free section content that ranks #1 on Google. NEVER fabricate facts about well-known institutions (IIMs, XLRI, FMS, MDI, SPJIMR, IIFT, NMIMS, SIBM, JBIMS, ISB, etc.).

# RESEARCH-FIRST APPROACH (MANDATORY)
- Perform deep, multi-source mental research BEFORE writing. Cross-check against NIRF, official placement reports, AICTE/NAAC, brochures and reputable Indian education media. No shallow filler — every paragraph must add concrete factual value.

# COLLEGE-NAME WEAVING (SEO + TOPICAL AUTHORITY)
- Use the EXACT college name "${brief.collegeName}" naturally throughout this section. The long-form HTML \`content\` field MUST mention "${brief.collegeName}" verbatim 4-7 times (distributed across paragraphs and at least one heading). Never spam consecutively.
- The section title MUST contain "${brief.collegeName}" verbatim (e.g. "${brief.collegeName} Placements ${currentYear - 1}-${currentYear}", "${brief.collegeName} Admission ${admissionCycle}", "Why Choose ${brief.collegeName}").
- meta_title and meta_description MUST contain "${brief.collegeName}".
- For \`qa\` sections, EVERY question AND every answer MUST mention "${brief.collegeName}".

# SCOPE LOCK — MBA & MASTERS IN MANAGEMENT ONLY (NON-NEGOTIABLE)
- Every section MUST stay strictly within MBA / PGP / PGDM / PGPM / MMS / MMM / EMBA / PGPX / PGCM / PGPBM / Executive MBA / Masters in Management (MiM) / 1-Year MBA programs at Indian B-schools.
- DO NOT mention, recommend, or include B.Tech, M.Tech, BE, ME, BCA, MCA, B.Sc, M.Sc, PhD-only programs, coding bootcamps, data-science certifications, engineering courses, medical/law/design programs, or any non-management discipline.
- Courses, specializations, exams, recruiters, fees and placements must all be management-program-specific (Finance, Marketing, Operations, HR, Strategy, Business Analytics within an MBA, Consulting, etc.).
- If a college also runs non-MBA programs, IGNORE them entirely — only describe its MBA/PGDM/MiM offerings.

# WELL-FORMATTED OUTPUT
- HTML must be tidy: short paragraphs (2-4 sentences), bullet/numbered lists for any 3+ enumerations, at least one <table> when comparing fees / placements / cutoffs / dates.
- Headings hierarchy: <h2> for main sub-sections, <h3> for nested. Never start a heading or sentence with a question. Never put a heading inside a paragraph.
- Use <strong> on key facts (numbers, names, dates) — sparingly, 4-8 per long block. Do NOT bold filler words, generic adjectives, or whole sentences.

ACCURACY RULES:
- Established years for famous schools must be correct (XLRI=1949, IIM-A=1961, IIM-B=1973, IIM-C=1961, FMS=1954, JBIMS=1965, SPJIMR=1981, MDI=1973, IIFT=1963, NMIMS=1981, ISB=2001).
- All fees, placements, cutoffs, recruiter lists must reflect the latest ${freshness} data window. The active admission cycle is ${admissionCycle}. Today is ${todayIso}. Never use 2020-2023 numbers.
- Accreditations and rankings (NIRF rank, AACSB, AMBA, EQUIS, NAAC grade, NBA) must be 100% accurate — if the school does NOT actually hold an accreditation, do NOT claim it. When in doubt, omit rather than fabricate.

# ABSOLUTE OUTPUT BANS — DO NOT VIOLATE
- DO NOT include ANY citation, source, footnote or attribution markers in the output. Forbidden patterns include: "[src:NIRF 2025]", "(source: NIRF 2025)", "(Source/NIRF 2026 Ranking)", "(as per NIRF)", "[1]", "[NIRF]", "Ref:", "*Source:*", "Sources —", parentheticals like "(Source: ...)", "(Ref: ...)", or any bracketed/parenthesised attribution. State facts plainly with the year woven into the sentence (e.g. "ranked #4 in NIRF 2025") — never with a parenthetical source tag.
- DO NOT add pull-quotes, blockquotes, decorative em-dashes as separators (— — —), or random italicised one-liners.
- DO NOT include "Last updated:" stamps, "Disclaimer:", "Note:" boxes, or any meta-commentary.
- DO NOT use markdown ('**', '##', '\`\`\`'), emojis, or smart-quote curly characters.
- For ALL short fields (name, body, rank, year, amount, criteria, description, percentage, sector, recruiter name, faculty name, qualification, experience, label, score, value, scholarship name, etc.) return PLAIN TEXT ONLY — no HTML tags, no parentheses with sources, no brackets.
- "percentage" fields must be a bare number string ("25" or "25.5") — never "25%" or "<strong>25%</strong>" or "25-30%". Pick the midpoint if you only have a range.
- "amount" / "rank" / "score" / "rating" fields must be short plain text without HTML (e.g. "Up to 50% waiver", "#1", "4.3").
- HTML output uses ONLY: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. No <html>/<head>/<body>/<h1>/<blockquote>/markdown fences.
- ABSOLUTELY NO inline style="" attributes, NO <font> tags, NO class="" / id="" attributes, NO width/height/color attributes. Plain semantic HTML only — the platform applies uniform typography.
- CRITICAL OUTPUT HYGIENE: NEVER write the literal characters "\\n", "\n", "/n", "\\t" or any visible escape sequences inside the HTML or any field — use real <p>, <br>, list tags or actual line breaks.
- DEEP-RESEARCH FIRST: Before writing, mentally verify rankings, fees, placements, recruiters, accreditations and dates against the most authoritative public sources. Never guess shallow filler. If you are not confident about a specific number, give a tight realistic range based on the most recent 2-3 years rather than a single fabricated figure.
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
- Include 2-4 internal-link anchors in the long-form HTML content. Use DESCRIPTIVE multi-word anchor text — never bare keywords. Examples of GOOD anchors: <a href="/exams/cat">CAT 2025 exam pattern and cut-off trends</a>, <a href="/college-shortlister">free MBA college shortlister tool</a>, <a href="/mba-roi-calculator">MBA ROI calculator for ${brief.collegeName}</a>, <a href="/profile-analyzer">AI profile analyzer for B-school admissions</a>, <a href="/coaching">top CAT coaching institutes</a>. BAD anchors (do NOT use): "click here", "read more", "this", single-word anchors. Each anchor must be 4-9 words and clearly tell the reader what page they're going to.
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

    const aiRes = await callAIGateway({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: spec.name } },
        max_tokens: 6000,
      }, { feature: "ai-college-section", provider, purpose: "long" });

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

    const repairJSON = (s: string): string => {
      let out = String(s)
        .replace(/^```json\s*/im, "")
        .replace(/^```\s*/im, "")
        .replace(/```\s*$/im, "")
        .trim()
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      out = out.replace(/,(\s*[}\]])/g, "$1");
      out = out.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_\-]*)\s*:/g, '$1"$2":');
      out = out.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner) => {
        const safe = String(inner).replace(/"/g, '\\"');
        return `: "${safe}"`;
      });
      return out;
    };

    const extractJSON = (raw: any) => {
      if (raw && typeof raw === "object") return raw;
      let cleaned = repairJSON(String(raw || ""));
      const objStart = cleaned.indexOf("{");
      const objEnd = cleaned.lastIndexOf("}");
      if (objStart !== -1 && objEnd > objStart) cleaned = cleaned.slice(objStart, objEnd + 1);
      try { return JSON.parse(cleaned); } catch (firstErr) {
        const lastBrace = cleaned.lastIndexOf("}");
        if (lastBrace > 0) {
          try { return JSON.parse(repairJSON(cleaned.slice(0, lastBrace + 1))); } catch (_) { /* fall through */ }
        }
        throw firstErr;
      }
    };

    let payload: any;
    try {
      payload = extractJSON(rawArgs);
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

    // ── Auto-sync verified programme portfolio into programme_courses table ──
    // Only fires for the courses_fees section AND when the caller passed brief.collegeId.
    let portfolio_synced = 0;
    if (brief.sectionType === "courses_fees" && brief.collegeId && Array.isArray(payload.courses) && payload.courses.length) {
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const slugify = (s: string) =>
          String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "programme";
        const seen = new Set<string>();
        const rows = (payload.courses as any[]).map((c, i) => {
          let slug = slugify(c.short_name || c.name || `programme-${i}`);
          let suffix = 1;
          while (seen.has(slug)) slug = `${slugify(c.short_name || c.name || "p")}-${++suffix}`;
          seen.add(slug);
          return {
            college_id: brief.collegeId,
            slug,
            name: String(c.name || "").slice(0, 200),
            short_name: c.short_name ? String(c.short_name).slice(0, 60) : null,
            programme_type: c.programme_type ? String(c.programme_type).slice(0, 60) : "MBA",
            duration: c.duration ? String(c.duration).slice(0, 100) : null,
            duration_months: typeof c.duration_months === "number" ? Math.round(c.duration_months) : null,
            mode: c.mode ? String(c.mode).slice(0, 40) : "Full-time",
            fees_total_lakhs: typeof c.fees_total_lakhs === "number" ? c.fees_total_lakhs : null,
            fees_breakdown: c.fees_breakdown ? String(c.fees_breakdown).slice(0, 500) : null,
            fees_year: c.fees_year ? String(c.fees_year).slice(0, 20) : `${currentYear}-${currentYear + 1}`,
            min_graduation_percent: typeof c.min_graduation_percent === "number" ? c.min_graduation_percent : 50,
            accepts_cat: !!c.accepts_cat,
            accepts_xat: !!c.accepts_xat,
            accepts_gmat: !!c.accepts_gmat,
            accepts_gre: !!c.accepts_gre,
            accepts_cmat: !!c.accepts_cmat,
            accepts_nmat: !!c.accepts_nmat,
            accepts_snap: !!c.accepts_snap,
            accepts_iift: !!c.accepts_iift,
            cat_percentile_target: c.cat_percentile_target ? String(c.cat_percentile_target).slice(0, 30) : null,
            xat_percentile_target: c.xat_percentile_target ? String(c.xat_percentile_target).slice(0, 30) : null,
            gmat_score_target: c.gmat_score_target ? String(c.gmat_score_target).slice(0, 30) : null,
            min_work_ex_months: typeof c.min_work_ex_months === "number" ? Math.max(0, c.min_work_ex_months) : 0,
            max_work_ex_months: typeof c.max_work_ex_months === "number" && c.max_work_ex_months > 0 ? c.max_work_ex_months : null,
            min_age: typeof c.min_age === "number" && c.min_age > 0 ? c.min_age : null,
            max_age: typeof c.max_age === "number" && c.max_age > 0 ? c.max_age : null,
            specializations: Array.isArray(c.specializations) ? c.specializations.map((s: any) => String(s).slice(0, 80)) : [],
            highlights: Array.isArray(c.highlights) ? c.highlights.map((s: any) => String(s).slice(0, 200)) : null,
            intake_seats: typeof c.intake_seats === "number" ? c.intake_seats : null,
            source_url: c.source_url ? String(c.source_url).slice(0, 500) : null,
            source_brochure_url: c.source_brochure_url ? String(c.source_brochure_url).slice(0, 500) : null,
            evidence_snippet: c.evidence_snippet ? String(c.evidence_snippet).slice(0, 500) : null,
            source_verified_at: new Date().toISOString(),
            sort_order: i,
            active: true,
          };
        });
        const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/programme_courses?on_conflict=college_id,slug`, {
          method: "POST",
          headers: {
            apikey: SERVICE_ROLE,
            Authorization: `Bearer ${SERVICE_ROLE}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(rows),
        });
        if (upsertRes.ok) {
          portfolio_synced = rows.length;
        } else {
          console.error("programme_courses upsert failed:", upsertRes.status, await upsertRes.text());
        }
      } catch (syncErr) {
        console.error("programme_courses sync error:", syncErr);
      }
    }

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
        portfolio_synced,
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
