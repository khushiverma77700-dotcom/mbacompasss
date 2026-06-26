// Shared rules appended to every long-form AI content generator
// (blogs, college pages, college sections, institute pages, course pages, news, refresh).
// Enforces: no AI buzzwords, mandatory "About MBA Compass" section, "Summary" not "Quick Summary".

export const MBA_COMPASS_SECTION_RULES = `

# MANDATORY — "About MBA Compass" SECTION (NON-NEGOTIABLE)
Every long-form output MUST include a dedicated H2 section near the conclusion titled exactly "About MBA Compass" (or "How MBA Compass Helps You").
- Place it AFTER the FAQs (if any) and BEFORE the final Conclusion / CTA.
- Length: 120-180 words. Tone: educational and value-driven, NOT promotional. Mentor voice — no hype words like "best", "ultimate", "must-have", "unbeatable", "world-class".
- Cover, naturally and briefly, ALL three points:
  1. What MBA Compass is — an MBA discovery and decision platform for Indian aspirants (a B School Buzz product) that brings colleges, exams, coaching, mocks and AI tools into one place.
  2. How it helps MBA aspirants — shortlist the right colleges, analyse their profile, compare programmes, prep with full-length mocks, plan the prep timeline, and weigh fees vs ROI vs expected packages before committing.
  3. Why students benefit — a single, data-driven place to make the biggest MBA decisions (where to apply, how to prep, what to expect financially) instead of stitching info from 10 different sites.
- End the section with 2-3 contextual internal links chosen from: /mba-compass, /college-shortlister, /profile-analyzer, /mba-roi-calculator, /compare, /mocks — pick the ones most relevant to THIS topic.
- This section is REQUIRED on every blog, college page, exam page, institute page, course page, guide and resource article. NEVER skip it.

# BANNED AI BUZZWORDS — ZERO TOLERANCE
Never use any of these phrases anywhere in the output. Output containing them will be rejected:
"unlock", "delve", "delve into", "landscape", "navigate", "navigating", "furthermore", "moreover", "in today's fast-paced world", "in the realm of", "embark on a journey", "ever-evolving", "it's worth noting", "look no further", "stay tuned", "dive into", "diving deep", "unleash", "harness the power", "game-changer", "cutting-edge", "world-class", "robust", "leverage", "synergy", "paradigm", "seamless", "holistic", "ecosystem" (unless quoting), "in conclusion", "to sum up", "as we all know", "needless to say", "tapestry", "testament", "in essence", "at the end of the day", "when it comes to", "plays a pivotal role", "plays a crucial role", "in the world of", "a myriad of", "plethora", "first and foremost", "it is important to note", "it is worth mentioning", "in summary", "to conclude", "remember that", "rest assured", "elevate", "transformative", "groundbreaking", "revolutionary", "best-in-class", "state-of-the-art", "unparalleled", "second to none", "in the ever-changing world", "the journey of", "a treasure trove", "stands as a", "serves as a", "speaks volumes".
Write simple, direct, human English. Plain words. No marketing fluff.

# TERMINOLOGY (STRICT)
- NEVER write "Quick Summary", "Quick summary", "TL;DR" or "TLDR". The only allowed label is "Summary" — e.g. <p><strong>Summary:</strong> …</p> or <h2>Summary</h2>.

# FACTUAL ACCURACY — ZERO HALLUCINATION (NON-NEGOTIABLE)
You are writing for real MBA aspirants who will make life decisions based on this. EVERY factual claim must be verifiable and correct. If you are not 100% sure of a specific number/date/fact, write a tight realistic range or omit it — NEVER fabricate.

## MBA Entrance — Accepted Exams (HARD FACTS, do not get wrong)
- **All 21 IIMs** (Ahmedabad, Bangalore, Calcutta, Lucknow, Indore, Kozhikode, Shillong, Rohtak, Ranchi, Raipur, Trichy, Udaipur, Kashipur, Amritsar, Bodh Gaya, Jammu, Nagpur, Sambalpur, Sirmaur, Visakhapatnam, Mumbai/NITIE) — accept **CAT only** for the flagship 2-year PGP/MBA. They do NOT accept XAT, NMAT, SNAP, CMAT or MAT for the flagship programme.
- **XLRI Jamshedpur** — accepts **XAT only** (its own exam) for BM and HRM. XLRI does **NOT** accept CAT. Never write "XLRI accepts CAT".
- **SPJIMR Mumbai** — accepts CAT, XAT and GMAT (not NMAT/SNAP).
- **MDI Gurgaon, IMT Ghaziabad, IMI Delhi, FORE, TAPMI, GIM, LIBA, Great Lakes PGPM 1-yr, IIFM, JBIMS, SIMSREE, DMS IIT Delhi/Bombay/Madras/Kanpur/Roorkee/Kharagpur, DoMS IISc, IIM Mumbai (ex-NITIE)** — accept **CAT** (a few also accept XAT/GMAT). Verify per institute.
- **NMIMS Mumbai (MBA)** — accepts **NMAT by GMAC only**. Does NOT accept CAT for flagship MBA.
- **Symbiosis (SIBM Pune, SCMHRD, SIIB, SIBM Bengaluru, etc.)** — accepts **SNAP only**.
- **ISB Hyderabad / Mohali (PGP)** — accepts **GMAT or GRE only** (no CAT/XAT/NMAT).
- **IIFT** — own **IIFT exam** for MBA-IB; GMAT for international applicants. Does not use CAT for the flagship.
- **MICA Ahmedabad** — accepts CAT, XAT, GMAT followed by MICAT.
- **CMAT (NTA)** — accepted by ~1,000 AICTE-approved B-schools (JBIMS, SIMSREE, KJ Somaiya, Welingkar, GIM, BIMTECH, etc.). IIMs / XLRI / ISB / SPJIMR do NOT accept CMAT.
- **MAT (AIMA)** — accepted by ~600 mid-tier private B-schools only. Top-10 schools do NOT accept MAT.

## Conducting bodies (do not mix up)
- **CAT** — conducted by IIMs on rotation (one IIM per year). Not NTA, not AICTE.
- **XAT** — conducted by **XLRI Jamshedpur** on behalf of XAMI.
- **NMAT** — conducted by **GMAC**.
- **SNAP** — conducted by **Symbiosis International (Deemed) University**.
- **CMAT and MAT** — CMAT by NTA, MAT by AIMA. **GMAT Focus Edition** (since late 2023, scored 205-805, 3 sections, 2h 15m) is the current GMAT — the old 800-scale 4-section GMAT is retired.

## Other recurring fact rules
- **IIM Mumbai** is the rebranded **NITIE** (since 2023) — not a separate new IIM.
- NIRF Management top 3 are typically IIM Ahmedabad, IIM Bangalore, IIM Calcutta; XLRI, IIM Kozhikode, IIM Lucknow, IIM Indore, IIT Delhi DMS, IIM Mumbai (ex-NITIE), MDI Gurgaon round out the top 10. If unsure of an exact rank, write "ranked among the top 10 in NIRF Management" — never invent a number.
- Realistic **average CTC** ranges for the most recent cycle: top IIMs (A/B/C) **INR 32-36 LPA**; XLRI **INR 32-35 LPA**; new IIMs **INR 14-22 LPA**; tier-2 private **INR 8-15 LPA**. Never claim "INR 1 crore average" — that is the highest international package, not an average.
- Never invent recruiter names, alumni quotes, or precise student counts. Prefer ranges like "around 480 students" over a fake exact figure.
- Use active cycle data only (current_year-1 to current_year). Do not publish placement/admission figures older than current_year - 2.
`;


// ===================================================================
// Final Quality Check — runs on every AI-generated long-form output
// before it is saved/displayed. Returns a sanitised version of the
// HTML plus a list of issues found. Cheap fixes are auto-applied;
// missing MBA Compass section is auto-injected from a fallback.
// ===================================================================

const BANNED_PHRASES: string[] = [
  "unlock", "delve into", "delve", "landscape", "navigating", "navigate",
  "furthermore", "moreover", "in today's fast-paced world", "in the realm of",
  "embark on a journey", "ever-evolving", "it's worth noting", "look no further",
  "stay tuned", "dive into", "diving deep", "unleash", "harness the power",
  "game-changer", "cutting-edge", "world-class", "robust", "leverage",
  "synergy", "paradigm", "seamless", "holistic", "in conclusion", "to sum up",
  "as we all know", "needless to say", "tapestry", "testament", "in essence",
  "at the end of the day", "when it comes to", "plays a pivotal role",
  "plays a crucial role", "in the world of", "a myriad of", "plethora",
  "first and foremost", "it is important to note", "it is worth mentioning",
  "in summary", "to conclude", "rest assured", "elevate", "transformative",
  "groundbreaking", "revolutionary", "best-in-class", "state-of-the-art",
  "unparalleled", "second to none", "in the ever-changing world",
  "a treasure trove", "stands as a", "serves as a", "speaks volumes",
];

const BUZZWORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bdelve into\b/gi, "look at"],
  [/\bdelve\b/gi, "look"],
  [/\bnavigate\b/gi, "handle"],
  [/\bnavigating\b/gi, "handling"],
  [/\bleverage\b/gi, "use"],
  [/\bharness the power of\b/gi, "use"],
  [/\bin today's fast-paced world\b/gi, "today"],
  [/\bin the realm of\b/gi, "in"],
  [/\bembark on a journey\b/gi, "start"],
  [/\bever-evolving\b/gi, "changing"],
  [/\bit's worth noting\b/gi, ""],
  [/\bit is worth mentioning\b/gi, ""],
  [/\bit is important to note\b/gi, ""],
  [/\blook no further\b/gi, ""],
  [/\bdive into\b/gi, "explore"],
  [/\bdiving deep\b/gi, "looking closely"],
  [/\bin conclusion\b/gi, ""],
  [/\bto sum up\b/gi, ""],
  [/\bto conclude\b/gi, ""],
  [/\bin summary\b/gi, ""],
  [/\bfirst and foremost\b/gi, "first"],
  [/\ba myriad of\b/gi, "many"],
  [/\bplethora of\b/gi, "many"],
  [/\bplethora\b/gi, "lots"],
  [/\bfurthermore\b/gi, "also"],
  [/\bmoreover\b/gi, "also"],
  [/\bgame-changer\b/gi, "big shift"],
  [/\bcutting-edge\b/gi, "modern"],
  [/\bworld-class\b/gi, "top-tier"],
  [/\bstate-of-the-art\b/gi, "modern"],
  [/\bbest-in-class\b/gi, "top-tier"],
  [/\bunparalleled\b/gi, "strong"],
  [/\bgroundbreaking\b/gi, "new"],
  [/\brevolutionary\b/gi, "new"],
  [/\btransformative\b/gi, "major"],
  [/\belevate\b/gi, "improve"],
  [/\bplays a pivotal role\b/gi, "matters"],
  [/\bplays a crucial role\b/gi, "matters"],
  [/\bstands as a\b/gi, "is a"],
  [/\bspeaks volumes\b/gi, "says a lot"],
  [/\ba treasure trove of\b/gi, "lots of"],
  [/\bwhen it comes to\b/gi, "for"],
  [/\bat the end of the day\b/gi, ""],
  [/\bin essence\b/gi, ""],
  [/\brest assured\b/gi, ""],
  [/\bneedless to say\b/gi, ""],
  [/\bas we all know\b/gi, ""],
  [/\bQuick Summary\b/gi, "Summary"],
  [/\bTL;?DR\b/gi, "Summary"],
];

const FALLBACK_MBA_COMPASS_HTML = `<h2>About MBA Compass</h2>
<p>MBA Compass is an MBA discovery and decision platform built for Indian aspirants by the team at B School Buzz. It pulls colleges, exams, coaching options, full-length mocks and AI tools into one place — so you don't have to stitch information from ten different sites.</p>
<p>If you're prepping for CAT, XAT, NMAT, SNAP or CMAT, MBA Compass helps you shortlist the right B-schools for your profile, compare programmes on fees, placements and ROI, and run a quick profile analysis to see where you stand. You can also take topic-wise and full-length mocks, then review your sectional weak spots in detail.</p>
<p>The goal is simple: give you one data-driven place to make the biggest MBA decisions — where to apply, how to prep, and what the numbers look like on the other side.</p>
<p>Useful tools to start with: <a href="/mba-compass">MBA Compass</a>, <a href="/college-shortlister">College Shortlister</a>, <a href="/profile-analyzer">Profile Analyzer</a>, <a href="/mba-roi-calculator">MBA ROI Calculator</a>, <a href="/mocks">Free Mocks</a>.</p>`;

export interface QualityIssue {
  code: string;
  message: string;
  severity: "warn" | "error";
}

export interface QualityCheckResult {
  ok: boolean;
  issues: QualityIssue[];
  html: string;
  changed: boolean;
}

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ===================================================================
// MBA FACT CHECKER — auto-detects and rewrites common factual errors
// that AI models keep making about the Indian MBA ecosystem.
// Each rule has a detection regex and a safe rewritten replacement.
// Hits are also reported as `error`-severity issues so callers can
// decide to regenerate.
// ===================================================================

type FactRule = {
  code: string;
  // Pattern run against plain text (lowercased) to detect the falsehood.
  detect: RegExp;
  // Pattern run against HTML to rewrite it in place. Use case-insensitive global flags.
  rewrite: { pattern: RegExp; replacement: string }[];
  message: string;
};

const MBA_FACT_RULES: FactRule[] = [
  {
    code: "xlri_accepts_cat",
    detect: /xlri[^.<]{0,80}\b(accepts?|takes?|considers?|uses?|admits?\s+through|admission\s+through)\b[^.<]{0,40}\bcat\b/i,
    rewrite: [
      { pattern: /\bxlri(\s+jamshedpur)?\s+(also\s+)?(accepts?|takes?|considers?|uses?)\s+(the\s+)?cat(\s+exam|\s+score|\s+scores)?\b/gi,
        replacement: "XLRI Jamshedpur accepts XAT only (not CAT)" },
      { pattern: /\b(admission|admissions|entry|selection)\s+to\s+xlri(\s+jamshedpur)?\s+(is\s+)?through\s+(the\s+)?cat\b/gi,
        replacement: "Admission to XLRI Jamshedpur is through XAT (XLRI does not accept CAT)" },
    ],
    message: "XLRI Jamshedpur accepts XAT only — never CAT. Auto-corrected.",
  },
  {
    code: "iim_accepts_xat_or_nmat",
    detect: /\biim\s+(ahmedabad|bangalore|calcutta|lucknow|indore|kozhikode|shillong|rohtak|ranchi|raipur|trichy|udaipur|kashipur|amritsar|jammu|nagpur|sambalpur|sirmaur|visakhapatnam|bodh\s*gaya|mumbai)[^.<]{0,80}\b(accepts?|takes?|considers?)\b[^.<]{0,30}\b(xat|nmat|snap|cmat|mat)\b/i,
    rewrite: [
      { pattern: /\b(iim\s+[a-z]+)\s+(also\s+)?(accepts?|takes?|considers?)\s+(the\s+)?(xat|nmat|snap|cmat|mat)(\s+exam|\s+score|\s+scores)?\b/gi,
        replacement: "$1 accepts CAT only for its flagship MBA/PGP" },
    ],
    message: "IIMs accept CAT only for the flagship PGP/MBA — not XAT/NMAT/SNAP/CMAT/MAT. Auto-corrected.",
  },
  {
    code: "isb_accepts_cat",
    detect: /\bisb\s+(hyderabad|mohali)?[^.<]{0,60}\b(accepts?|takes?)\b[^.<]{0,30}\b(cat|xat|nmat|snap|cmat|mat)\b/i,
    rewrite: [
      { pattern: /\bisb(\s+hyderabad|\s+mohali)?\s+(also\s+)?(accepts?|takes?)\s+(the\s+)?(cat|xat|nmat|snap|cmat|mat)(\s+exam|\s+score|\s+scores)?\b/gi,
        replacement: "ISB accepts GMAT or GRE only" },
    ],
    message: "ISB (Hyderabad/Mohali) accepts GMAT or GRE only — never CAT/XAT/NMAT/SNAP/CMAT/MAT. Auto-corrected.",
  },
  {
    code: "nmims_accepts_cat",
    detect: /\bnmims[^.<]{0,60}\b(accepts?|takes?)\b[^.<]{0,30}\bcat\b/i,
    rewrite: [
      { pattern: /\bnmims(\s+mumbai)?\s+(also\s+)?(accepts?|takes?)\s+(the\s+)?cat(\s+exam|\s+score|\s+scores)?\b/gi,
        replacement: "NMIMS Mumbai accepts NMAT by GMAC only for its flagship MBA" },
    ],
    message: "NMIMS Mumbai flagship MBA accepts NMAT only — not CAT. Auto-corrected.",
  },
  {
    code: "symbiosis_accepts_cat",
    detect: /\b(sibm|scmhrd|siib|symbiosis)[^.<]{0,60}\b(accepts?|takes?)\b[^.<]{0,30}\b(cat|xat|nmat)\b/i,
    rewrite: [
      { pattern: /\b(sibm\s+\w+|scmhrd|siib|symbiosis[^,.<]{0,40})\s+(also\s+)?(accepts?|takes?)\s+(the\s+)?(cat|xat|nmat)(\s+exam|\s+score|\s+scores)?\b/gi,
        replacement: "$1 accepts SNAP only" },
    ],
    message: "Symbiosis B-schools (SIBM/SCMHRD/SIIB) accept SNAP only. Auto-corrected.",
  },
  {
    code: "cat_conducting_body",
    detect: /\bcat\s+(exam\s+)?is\s+conducted\s+by\s+(nta|aicte|ugc|gmac|aima)\b/i,
    rewrite: [
      { pattern: /\bcat(\s+exam)?\s+is\s+conducted\s+by\s+(nta|aicte|ugc|gmac|aima)\b/gi,
        replacement: "CAT is conducted by the IIMs on rotation" },
    ],
    message: "CAT is conducted by the IIMs on rotation — not NTA/AICTE/UGC/GMAC/AIMA. Auto-corrected.",
  },
  {
    code: "nmat_conducting_body",
    detect: /\bnmat\s+is\s+conducted\s+by\s+(nta|aicte|nmims|symbiosis|iim|aima)\b/i,
    rewrite: [
      { pattern: /\bnmat\s+is\s+conducted\s+by\s+(nta|aicte|nmims|symbiosis|iim[a-z\s]*|aima)\b/gi,
        replacement: "NMAT is conducted by GMAC" },
    ],
    message: "NMAT is conducted by GMAC. Auto-corrected.",
  },
  {
    code: "xat_conducting_body",
    detect: /\bxat\s+is\s+conducted\s+by\s+(nta|aicte|iim|nmims|symbiosis|gmac|aima)\b/i,
    rewrite: [
      { pattern: /\bxat\s+is\s+conducted\s+by\s+(nta|aicte|iim[a-z\s]*|nmims|symbiosis|gmac|aima)\b/gi,
        replacement: "XAT is conducted by XLRI Jamshedpur" },
    ],
    message: "XAT is conducted by XLRI Jamshedpur. Auto-corrected.",
  },
  {
    code: "snap_conducting_body",
    detect: /\bsnap\s+is\s+conducted\s+by\s+(nta|aicte|nmims|gmac|iim|aima)\b/i,
    rewrite: [
      { pattern: /\bsnap\s+is\s+conducted\s+by\s+(nta|aicte|nmims|gmac|iim[a-z\s]*|aima)\b/gi,
        replacement: "SNAP is conducted by Symbiosis International (Deemed) University" },
    ],
    message: "SNAP is conducted by Symbiosis. Auto-corrected.",
  },
  {
    code: "implausible_average_ctc",
    detect: /\baverage\s+(ctc|package|salary)[^.<]{0,40}\b(1\s*crore|₹\s*1\s*cr|inr\s*1\s*cr|100\s*lpa|[7-9]\d\s*lpa)\b/i,
    rewrite: [], // Don't auto-rewrite — too risky. Flag only.
    message: "Implausible 'average CTC' figure (≥70 LPA). Top IIM averages are around INR 32-36 LPA — flagged for manual review.",
  },
  {
    code: "nitie_not_iim_mumbai",
    detect: /\bnitie\b[^.<]{0,60}\b(separate|different|not\s+(an\s+)?iim|distinct)\b/i,
    rewrite: [
      { pattern: /\bnitie\b/gi, replacement: "IIM Mumbai (formerly NITIE)" },
    ],
    message: "NITIE was rebranded to IIM Mumbai in 2023. Auto-corrected.",
  },
];

function runFactCheck(html: string): { html: string; issues: QualityIssue[]; changed: boolean } {
  const issues: QualityIssue[] = [];
  const text = stripTags(html);
  let out = html;
  const before = out;

  for (const rule of MBA_FACT_RULES) {
    if (rule.detect.test(text)) {
      for (const r of rule.rewrite) {
        out = out.replace(r.pattern, r.replacement);
      }
      // If detection still fires after rewrite (couldn't fix), flag as error.
      const stillBad = rule.detect.test(stripTags(out));
      issues.push({
        code: rule.code,
        message: rule.message,
        severity: stillBad ? "error" : "warn",
      });
    }
  }
  return { html: out, issues, changed: out !== before };
}



/**
 * Final quality + sanitisation pass for any AI-generated HTML content.
 * - Auto-fixes: buzzword swaps, "Quick Summary"→"Summary"
 * - Auto-injects: "About MBA Compass" H2 if missing (before final CTA)
 * - Reports: long paragraphs, missing internal links, banned phrases left over,
 *   missing tables, missing FAQ heading, off-topic risk (very short content)
 */
export function runFinalQualityCheck(rawHtml: string, opts?: {
  requireMbaCompass?: boolean;
  requireFaq?: boolean;
  requireTable?: boolean;
  minInternalLinks?: number;
}): QualityCheckResult {
  const cfg = {
    requireMbaCompass: opts?.requireMbaCompass ?? true,
    requireFaq: opts?.requireFaq ?? false,
    requireTable: opts?.requireTable ?? false,
    minInternalLinks: opts?.minInternalLinks ?? 4,
  };
  const issues: QualityIssue[] = [];
  let html = String(rawHtml || "");
  const before = html;

  // 1. Buzzword auto-replace
  for (const [re, sub] of BUZZWORD_REPLACEMENTS) {
    html = html.replace(re, sub);
  }
  // Clean any double spaces / orphan commas from removals
  html = html.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;:])/g, "$1");

  // 1b. MBA fact check — auto-rewrite known false claims (XLRI/CAT, IIM/XAT, ISB, NMIMS, Symbiosis, conducting bodies, etc.)
  const fact = runFactCheck(html);
  html = fact.html;
  issues.push(...fact.issues);


  // 2. Detect any banned phrases still present (worth flagging for prompt tightening)
  const text = stripTags(html).toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (text.includes(phrase.toLowerCase())) {
      issues.push({ code: "banned_phrase", message: `Contains banned AI phrase: "${phrase}"`, severity: "warn" });
    }
  }

  // 3. Mandatory "About MBA Compass" section
  if (cfg.requireMbaCompass) {
    const hasCompass = /<h2[^>]*>\s*(?:about\s+mba\s+compass|how\s+mba\s+compass\s+helps)/i.test(html);
    if (!hasCompass) {
      issues.push({ code: "missing_mba_compass", message: "About MBA Compass section was missing — fallback section injected.", severity: "warn" });
      // Inject before the final CTA/conclusion H2 if present, else append at end
      const ctaHeadingRe = /<h2[^>]*>\s*(?:final\s+word|bottom\s+line|conclusion|your\s+next\s+step|key\s+takeaways)/i;
      const m = html.match(ctaHeadingRe);
      if (m && typeof m.index === "number") {
        html = html.slice(0, m.index) + FALLBACK_MBA_COMPASS_HTML + "\n" + html.slice(m.index);
      } else {
        html = html + "\n" + FALLBACK_MBA_COMPASS_HTML;
      }
    }
  }

  // 4. Paragraph length check (≤ 60 words / ≤ 3 sentences per <p>)
  const longParas = (html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []).filter((p) => {
    const t = stripTags(p);
    const words = t.split(/\s+/).filter(Boolean).length;
    const sentences = (t.match(/[.!?](?:\s|$)/g) || []).length;
    return words > 70 || sentences > 4;
  });
  if (longParas.length > 2) {
    issues.push({ code: "long_paragraphs", message: `${longParas.length} paragraphs exceed the 60-word / 3-sentence limit.`, severity: "warn" });
  }

  // 5. Internal-linking check (relative /... hrefs)
  const internalLinks = (html.match(/<a\s+[^>]*href=["']\/[^"']+["']/gi) || []).length;
  if (internalLinks < cfg.minInternalLinks) {
    issues.push({ code: "few_internal_links", message: `Only ${internalLinks} internal links found (min ${cfg.minInternalLinks}).`, severity: "warn" });
  }

  // 6. Tables check
  if (cfg.requireTable && !/<table[\s>]/i.test(html)) {
    issues.push({ code: "missing_table", message: "No <table> found — comparison data should be tabular.", severity: "warn" });
  }

  // 7. FAQ check
  if (cfg.requireFaq && !/<h2[^>]*>[^<]*(?:faq|frequently asked|questions)/i.test(html)) {
    issues.push({ code: "missing_faq", message: "No FAQ heading found.", severity: "warn" });
  }

  // 8. Off-topic / too-thin guard
  const wordCount = stripTags(html).split(/\s+/).filter(Boolean).length;
  if (wordCount < 300) {
    issues.push({ code: "too_thin", message: `Content is only ${wordCount} words — may be off-topic or truncated.`, severity: "error" });
  }

  return {
    ok: issues.every((i) => i.severity !== "error"),
    issues,
    html,
    changed: html !== before,
  };
}

