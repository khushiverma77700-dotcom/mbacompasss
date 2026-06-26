// AI Blog Writer — generates a full SEO-optimized article using Lovable AI Gateway.
// Admin-only: requires a valid auth token AND the 'admin' role. This is purely an
// internal content tool — leaving it open lets anyone drain AI credits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { callAIGateway } from "../_shared/aiGateway.ts";
import { MBA_COMPASS_SECTION_RULES, getBlockingFactIssues, runFinalQualityCheck } from "../_shared/aiContentRules.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BlogBrief {
  title: string;
  slug?: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  category?: string;
  contentDateContext?: string; // e.g. "Use latest 2025-2026 dates and figures"
  wordCountMin?: number;
  wordCountMax?: number;
  keywordDensityPct?: number;
  allowedInternalUrls?: { url: string; label?: string }[];
}

const json = (status: number, body: unknown) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
);

const stripEscapeArtifacts = (s: string): string =>
  String(s || "")
    .replace(/\\+n/gi, " ")
    .replace(/(^|[\s>])\/n(?=[\s<]|$)/gi, "$1 ")
    .replace(/<p>\s*(?:\\n|\/n|\s)*\s*<\/p>/gi, "")
    .replace(/<li>\s*(?:\\n|\/n|\s)*\s*<\/li>/gi, "")
    .replace(/[ \t]{2,}/g, " ");

const tameBold = (html: string): string => {
  let out = String(html || "");
  // Normalize <b> to <strong>
  out = out.replace(/<b(\s[^>]*)?>/gi, "<strong>").replace(/<\/b>/gi, "</strong>");
  // Drop empty strongs
  out = out.replace(/<strong>\s*<\/strong>/gi, "");
  // Unwrap <strong> that wraps an entire block-level tag
  out = out.replace(/<strong>\s*(<(?:p|li|h[2-6]|td|th|tr|ul|ol|table|thead|tbody|blockquote|div)\b[\s\S]*?<\/(?:p|li|h[2-6]|td|th|tr|ul|ol|table|thead|tbody|blockquote|div)>)\s*<\/strong>/gi, "$1");
  // Unwrap overly long <strong> spans (>12 words = whole sentence, not a highlight)
  out = out.replace(/<strong>([\s\S]*?)<\/strong>/gi, (_m, inner) => {
    const text = String(inner).replace(/<[^>]+>/g, " ").trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    return words > 12 ? inner : `<strong>${inner}</strong>`;
  });
  return out;
};

// Strip AI-flavoured filler words/phrases that scream "ChatGPT wrote this".
// Used inside stripExternalLinks so EVERY piece of generated HTML is sanitized.
const deAiify = (html: string): string => {
  let out = String(html || "");

  // --- Section/heading rename: drop generic "Key" / "Highlights" labels ---
  out = out.replace(/\bKey\s+Highlights\b/gi, "Snapshot");
  out = out.replace(/\bKey\s+Highlight\b/gi, "Snapshot");
  out = out.replace(/\bKey\s+Takeaways\b/gi, "Takeaways");
  out = out.replace(/\bKey\s+Takeaway\b/gi, "Takeaway");
  out = out.replace(/\bKey\s+Insights?\b/gi, "Insights");
  out = out.replace(/\bKey\s+Points?\b/gi, "Points");
  out = out.replace(/\bKey\s+Highlights?\s*&\s*Snapshot\b/gi, "Snapshot");
  out = out.replace(/\bAt\s+a\s+Glance\b/gi, "Snapshot");

  // --- Strip leading AI labels inside bold lead phrases:
  //     <strong>Key: …</strong>, <strong>Highlight: …</strong> etc.
  const banLeadWords = "Key|Keys|Highlight|Highlights|Pro\\s*Tip|Tip|Note|Important|Important\\s*Note|Insight|Insights|Quick\\s*Tip|Bold\\s*lead|Lead|Heads\\s*up|Takeaway|Bonus";
  const leadRe = new RegExp(`<strong>\\s*(?:${banLeadWords})\\s*[:\\-\u2013\u2014]\\s*`, "gi");
  out = out.replace(leadRe, "<strong>");
  // Same labels when written as plain prefix at start of a list item / paragraph
  const plainLeadRe = new RegExp(`(<(?:li|p)>\\s*)(?:${banLeadWords})\\s*[:\\-\u2013\u2014]\\s*`, "gi");
  out = out.replace(plainLeadRe, "$1");

  // --- Banned generic AI cliché words anywhere in copy ---
  const banWordList = [
    "delve into", "delves into", "dive deep", "deep dive",
    "in today's fast-paced world", "in today's digital age", "in this ever-evolving",
    "ever-evolving", "ever-changing landscape", "rapidly evolving",
    "unlock the secrets", "unlock the power", "unlock the potential",
    "embark on", "embarking on", "navigate the complexities", "navigate through",
    "elevate your", "leverage", "leverages", "leveraging",
    "seamless", "seamlessly", "robust", "cutting-edge", "state-of-the-art",
    "game-changer", "game changer", "game-changing",
    "pivotal", "paramount", "quintessential", "tapestry", "in the realm of",
    "moreover", "furthermore", "in conclusion", "it is worth noting that",
    "it's important to note", "needless to say", "rest assured",
    "a testament to", "harness the power",
  ];
  for (const phrase of banWordList) {
    const re = new RegExp(`\\b${phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b[,.:;]?\\s*`, "gi");
    out = out.replace(re, "");
  }

  // Collapse any double spaces / orphan punctuation left by the strips
  out = out.replace(/\s+([,.;:!?])/g, "$1");
  out = out.replace(/<strong>\s*[:\-\u2013\u2014]\s*/gi, "<strong>");
  out = out.replace(/<strong>\s*<\/strong>/gi, "");
  return out;
};

const stripExternalLinks = (html: string) => {
  let out = stripEscapeArtifacts(html || "");
  out = out.replace(/<a\b[^>]*\bhref\s*=\s*["'](?:https?:\/\/|\/\/|mailto:|tel:|www\.)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1");
  out = out.replace(/\bhttps?:\/\/[^\s<>"')]+/gi, "");
  out = out.replace(/\bwww\.[^\s<>"')]+/gi, "");
  // Remove ALL images / figures / svg — text-only blog
  out = out.replace(/<img\b[^>]*\/?>/gi, "");
  out = out.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, "");
  out = out.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "");
  out = out.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "");
  // Strip markdown image syntax ![alt](url)
  out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  // Strip paragraphs that are just image placeholders
  out = out.replace(/<p>\s*(?:image|img|figure|photo|illustration|infographic)\s*[:\-—\u2013\u2014][\s\S]*?<\/p>/gi, "");
  // Strip <font> tags
  out = out.replace(/<\/?font\b[^>]*>/gi, "");
  // Strip inline attributes for uniform typography
  out = out.replace(/\s+(style|class|id|face|color|size|align|bgcolor|width|height)\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\s+(style|class|id|face|color|size|align|bgcolor|width|height)\s*=\s*'[^']*'/gi, "");
  // Strip banned summary labels
  out = out.replace(/\bQuick\s+Summary\b/gi, "Summary");
  out = out.replace(/\bTL;?DR\b/gi, "Summary");
  // Strip generic AI words / labels (Key, Highlight, Pro Tip, etc.)
  out = deAiify(out);
  // Tame runaway bold so only short highlights stay bold
  out = tameBold(out);
  return out.replace(/[ \t]{2,}/g, " ").trim();
};

const SLUG_FILLER = new Set(["the","a","an","of","for","to","and","or","in","on","with","best","top","complete","ultimate","guide","tips","how","what","why","is","are","your","you","my","our","2024","2025","2026","2027"]);
const normalizeSlug = (s: string) => {
  const cleaned = String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!cleaned) return "";
  const parts = cleaned.split("-").filter(Boolean);
  const meaningful = parts.filter((p) => !SLUG_FILLER.has(p));
  const picked = (meaningful.length >= 2 ? meaningful : parts).slice(0, 5);
  return picked.join("-").slice(0, 60);
};

const escapeHtml = (s: string) =>
  String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const toPlainText = (html: string) => String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const countWords = (html: string) => toPlainText(html).split(/\s+/).filter(Boolean).length;

function getTargets(brief: BlogBrief) {
  const wmin = Math.max(300, brief.wordCountMin ?? 2500);
  const wmax = Math.max(wmin, brief.wordCountMax ?? 3500);
  const targetWords = Math.round((wmin + wmax) / 2);
  return {
    wmin,
    wmax,
    targetWords,
    sectionCount: Math.max(5, Math.min(16, Math.round(targetWords / 550))),
    density: Math.max(0.5, Math.min(brief.keywordDensityPct ?? 2, 8)),
    todayIso: new Date().toISOString().slice(0, 10),
    currentYear: new Date().getFullYear(),
  };
}

function fallbackSections(brief: BlogBrief, count: number) {
  const kw = brief.targetKeyword || brief.title;
  const base = [
    `Complete overview of ${kw}`,
    `Eligibility and admission timeline`,
    `Fees, seats and ROI analysis`,
    `Cutoffs, selection process and requirements`,
    `Placements, recruiters and salary trends`,
    `Best colleges and alternatives`,
    `Preparation checklist and common mistakes`,
    `Expert tips for final decisions`,
    `Year-on-year trends and outlook`,
    `Student fit and decision framework`,
    `Documents and application strategy`,
    `Comparison with nearby options`,
    `Scholarships and financing options`,
    `Career outcomes after completion`,
    `Final shortlist strategy`,
    `Action plan for applicants`,
  ];
  return base.slice(0, count).map((heading) => ({ heading, angle: `Explain ${heading.toLowerCase()} with current Indian MBA data, examples, tables and decision pointers.` }));
}

async function callStructuredAI(args: {
  feature: string;
  system: string;
  user: string;
  toolName: string;
  description: string;
  parameters: Record<string, unknown>;
  maxTokens: number;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 105_000);
  try {
    const response = await callAIGateway({
      model: "openai/gpt-5-mini",
      max_tokens: args.maxTokens,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      tools: [{
        type: "function",
        function: {
          name: args.toolName,
          description: args.description,
          parameters: args.parameters,
        },
      }],
      tool_choice: { type: "function", function: { name: args.toolName } },
    }, { feature: args.feature, signal: controller.signal, maxRetries: 0, purpose: "long" });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`${args.feature} failed (${response.status}): ${detail.slice(0, 500)}`);
    }
    const aiJson = await response.json();
    const rawArgs = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!rawArgs) throw new Error(`${args.feature} returned no structured payload`);
    return JSON.parse(rawArgs);
  } finally {
    clearTimeout(timer);
  }
}

function writerSystemPrompt(brief: BlogBrief) {
  const { currentYear, todayIso } = getTargets(brief);
  const allowed = Array.isArray(brief.allowedInternalUrls) ? brief.allowedInternalUrls.filter(u => u && u.url && u.url.startsWith("/")) : [];
  const allowedBlock = allowed.length
    ? `\n\nCURATED INTERNAL LINK POOL (USE ONLY THESE URLs — DO NOT INVENT NEW URLs):\n${allowed.map(u => `- ${u.url}${u.label ? `  (suggested anchor: ${u.label})` : ""}`).join("\n")}\nRules: every internal <a href="/..."> MUST resolve to one of the URLs above. Distribute links naturally. Use each URL 1-2 times max. If no URL in the pool fits a sentence, do NOT add a link there.`
    : "";
  return `You are a senior MBA mentor at B School Buzz writing for Indian students. Sound like a real human mentor talking one-on-one to an aspirant — warm, direct, practical, and specific. Never sound like an AI or a generic SEO blog.${allowedBlock}

Voice rules (MANDATORY):
- Write the way a senior MBA mentor explains things to a junior over coffee — calm, confident, conversational, never lecture-y. Use contractions (you're, don't, it's, you'll). Short sentences. Plain 8th-grade English.
- Vary sentence length and openers. Never start 3 sentences in a row the same way. Use natural mentor connectors: "Here's the thing —", "Quick reality check:", "If you're in this boat,", "Most students get this wrong because…", "A simple way to think about it —", "Honestly,", "Look —".
- Make it personal and practical: "Here's what most students miss…", "If you're targeting IIM-A, focus on…", "A simple way to think about this is…". Drop a short worked mini-example (named persona + numbers) every 2-3 sections.
- BANNED phrases — do NOT use any of these, ever: "unlock", "delve into", "delve", "landscape", "navigate", "navigating", "furthermore", "moreover", "in today's fast-paced world", "in the realm of", "embark on a journey", "ever-evolving", "it's worth noting", "look no further", "stay tuned", "dive into", "diving deep", "unleash", "harness the power", "game-changer", "cutting-edge", "world-class", "robust", "leverage", "synergy", "paradigm", "seamless", "holistic", "ecosystem" (unless quoting), "in conclusion", "to sum up", "as we all know", "needless to say", "tapestry", "testament", "in essence", "at the end of the day", "when it comes to", "plays a pivotal role", "plays a crucial role", "in the world of", "a myriad of", "plethora", "first and foremost", "it is important to note", "it is worth mentioning", "in summary", "to conclude", "remember that", "rest assured".
- No corporate jargon, no hype, no filler. Every sentence must add a fact, a number, a name, or actionable advice.

Content rules:
- Stay strictly inside MBA / management education and MBA entrance exams.
- Use recent ${currentYear}-${currentYear + 1} admission-cycle and ${currentYear - 1}-${currentYear} placement context. Never recycle 2020-${currentYear - 2} cutoffs, dates, fees, rankings or placement numbers as current data.
- Every section must be detailed, with paragraphs, tables, bullets, named colleges/recruiters/exams and cautious INR figures. Do not invent exact figures or fake source markers.
- No external links and no bare URLs. Only relative internal links starting with / are allowed.
- Return clean HTML only using h2,h3,h4,p,ul,ol,li,strong,em,a,table,thead,tbody,tr,th,td,blockquote. No h1, no markdown, no class/style attributes.
- Never give shallow one-line answers or generic filler.
- Today is ${todayIso}.

SEO rules (MANDATORY — apply to every output):
- Place the PRIMARY keyword naturally in: title, slug, H1, meta title (≤60 chars), meta description (140-160 chars), the first 100 words of the intro, at least one H2, and the closing paragraph. No keyword stuffing — exact-match density ~0.8-1.2%.
- Weave 8-12 SECONDARY/LSI keywords naturally across H2s, H3s and body copy. Never force them; if a keyword doesn't fit a sentence, skip it.
- Heading hierarchy: ONE H1 (handled by the page), then H2s for main sections, H3s as sub-points under an H2, H4 only when an H3 needs further breakdown. Never skip levels, never use H5/H6.
- Meta title: ≤60 chars, primary keyword near the front, ends with " | MBA Compass" when it fits, no question mark, no clickbait.
- Meta description: 140-160 chars, primary keyword in the first 120 chars, one clear benefit + one action cue, declarative tone.
- FAQs: 8-12 questions grounded in real search intent (People-Also-Ask style — "is", "how", "what", "which", "when", "vs", "fees", "cutoff", "salary", "eligibility"). Each answer 60-120 words, direct, with a concrete number/name where possible.
- Keep it human-readable first, SEO-optimised second. If a sentence reads awkwardly because of a keyword, rewrite the sentence — never the other way around.

Internal linking rules (MANDATORY — auto-link every relevant entity):
- Scan your own draft. EVERY time you name a college, exam, city, tool, coaching brand, specialization, or related topic — convert the FIRST mention in each H2 section into a contextual internal <a href="/..."> link. This is automatic, not optional.
- Minimums: 2-4 internal links inside EVERY <h2> section; 12-20 internal links across the full article; the FAQ section must contain at least 4 internal links; the conclusion/CTA must contain 2-3 internal links.
- Distribute the link mix — don't cluster all links in one section. Aim for roughly: 40% college links, 25% exam links, 15% tool/resource links, 10% blog/related-article links, 10% category/city links.
- Allowed URL patterns (relative, must start with "/"):
  • Colleges: /college/<slug> (e.g. /college/iim-ahmedabad, /college/xlri-jamshedpur, /college/mdi-gurgaon, /college/sp-jain, /college/iim-bangalore)
  • Exams: /exams/<slug> (e.g. /exams/cat, /exams/xat, /exams/nmat, /exams/snap, /exams/cmat, /exams/iift, /exams/mat, /exams/micat)
  • Blogs / related articles: /blog/<related-slug> — invent 2-3 closely related slugs derived from THIS topic
  • Categories: /category/<slug> (e.g. /category/placements, /category/exam-tips, /category/admissions)
  • City pages: /colleges-in/<city-slug> (e.g. /colleges-in/bangalore, /colleges-in/mumbai, /colleges-in/delhi)
  • Coaching: /coaching or /coaching/<slug>
  • Tools/resources: /college-shortlister, /profile-analyzer, /mba-roi-calculator, /mba-compass, /mocks, /compare, /ai-coaching-finder
- Anchor text MUST be the actual entity or a natural descriptive phrase woven into the sentence ("IIM Ahmedabad PGP placement report", "CAT exam pattern", "MBA ROI calculator", "top MBA colleges in Bangalore"). NEVER use generic anchors like "click here", "read more", "this page", "learn more", "here", "official site".
- Every link must be CONTEXTUAL — the surrounding sentence must mention the entity being linked. No bolt-on link dumps, no parenthetical "(read more)".
- Vary the link set per section; never repeat the same anchor twice in one section; never link the same URL more than 2 times in the whole article.
- Inside tables: when a row names a college or exam, link the entity in the leftmost cell using a contextual anchor. At least 2 tables must contain linked entities.
- EXTERNAL links are NOT rendered as <a> tags. When a source is genuinely known from the prompt/context, name it in PLAIN TEXT. Do not add fake [src:...] markers just to make a claim look verified.

Terminology rule (STRICT):
- NEVER use the phrase "Quick Summary", "Quick summary", "TL;DR", "TLDR" or any variant anywhere in titles, headings, bold leads, or body copy. If a summary section is needed, the ONLY allowed label is "Summary" (e.g. <p><strong>Summary:</strong> …</p> or <h2>Summary</h2>). This applies to every content type and every field.

Topic focus rules (MANDATORY — zero tolerance for drift):
- The article title is the SCOPE FENCE. Every H2, H3, paragraph, list item, table row, and FAQ must directly answer the reader's search intent for THIS exact title — nothing else.
- INTENT-FIRST: Before drafting, write the reader's literal question in one line (e.g. "What are IIM-A 2025 placement numbers and top recruiters?"). Every section must directly help answer THAT question. Anything else is filler — cut it.
- VALUE TEST per section: a section earns its place only if it gives the reader (a) a new number, (b) a named entity, (c) a decision rule, or (d) a concrete next step. If it does none of these, delete the section.
- BANNED filler patterns: history lessons unless asked, generic "What is an MBA?" intros when the topic is narrower, motivational pep-talks, definitions of well-known terms, repeated context, "importance of…" sections, "benefits of pursuing MBA" sections, padding lines like "As we've seen above…", "It is important to note…", "Many students wonder…", "In the following sections we will discuss…".
- NO TOPIC BLEED: if the title is about IIM-A placements, do not pad with NMAT prep tips; if the title is "CAT 2025 syllabus", do not list IIM rankings. One topic, deeply covered. A single contrast paragraph against a peer entity is OK only when the title explicitly invites comparison.
- No repetition across sections. Each H2 owns a unique angle; if two sections overlap, merge or drop one.
- Every paragraph must carry at least one of: a specific number, a named entity (college/exam/recruiter/year), a concrete step, or a clear decision rule. Paragraphs that only re-state the heading are forbidden.
- Keep sentences short and punchy. Cut adjectives that add no information. If a sentence can be removed without losing meaning, remove it.

Data-driven content rules (MANDATORY — tables FIRST, prose SECOND):
- Every H2 section should include at least one useful data point where safe: NIRF band, expected cutoff band, fee range (INR), average/median package range, placement context, recruiter count range, batch size range, seat count range, exam month/window, attempt count, or year-on-year trend. Do not invent exact figures.
- Use REAL, current ${currentYear}-${currentYear + 1} Indian MBA data. For high-risk items (cutoffs, exact exam/admission dates, fees, rankings, seats and placements), never invent a precise number/date. If the current official figure is not confirmed in the prompt/context, write an expected band/window and clearly label it expected/TBA/verify with official notice (e.g. "expected 92-96 percentile band", "official date TBA", "latest-public INR 23-25 lakh fee range").
- TABLE-FIRST RULE (NON-NEGOTIABLE): if information can be expressed as rows × columns, it MUST be a <table>. Prefer tables over paragraphs for ALL of the following — even when only 2 entities are being compared:
  • Fees breakdown (Year/Component | Amount INR | Notes)
  • Placement stats (Year | Avg CTC | Median CTC | Highest CTC | Placement %)
  • Cut-offs (Category | Overall %ile | Sectional %ile VARC/DILR/QA)
  • Rankings (Publication | Year | Rank | Category)
  • Eligibility (Programme | Age | Graduation % | Work-Ex | Entrance Accepted)
  • Exam patterns (Section | Questions | Marks | Duration | Negative Marking)
  • Important dates (Event | Date/window ${currentYear} | Official status | Notes)
  • College comparisons (Name | NIRF Rank ${currentYear} | Fees | Avg CTC | Cutoff %ile | Top Recruiters)
  • Course / specialization details (Specialization | Duration | Core Subjects | Top Recruiters | Avg CTC)
  • Recruiter lists (Sector | Top Recruiters | Avg CTC | Roles)
  • Year-on-year trends (Year | Avg CTC | Median CTC | Placement % | Top Recruiter)
  Writing the above as prose paragraphs is REJECTED. Convert to a <table>.
- Build at least 4 <table> blocks per article, more for long-form. Each table must have a clear caption-style first row (<thead>) and 5+ data rows.
- Tables must be scannable: short cell text, consistent units (INR LPA, INR lakh, percentile, %), no empty cells, no "—". Bold the leftmost column header. Cap at 5-6 columns for mobile.
- Use bullet/numbered lists for ranked items, eligibility checklists, step-by-step timelines, and pros/cons — never as a substitute for a table when a comparison is being made.
- Present numbers consistently: INR (not Rs./₹ mixed), lakh / crore / LPA spelled out, percentiles as "98.5 %ile", years as "${currentYear}-${String(currentYear + 1).slice(-2)}".
- The goal: a student should be able to scan the tables and lists alone and walk away with the decision-grade answer.


Readability & formatting rules (MANDATORY — mobile-first, scannable):
- HARD LIMIT: every <p> is MAX 3 sentences and UNDER 60 words. NO exceptions. If a thought runs longer → split it into two <p> blocks OR convert it into <ul>/<ol>/<table>. Walls of text (4+ sentence paragraphs, 70+ word paragraphs) are STRICTLY FORBIDDEN and will be rejected.
- The moment a paragraph would list 3+ items, comparisons, steps, factors, pros/cons, features, or examples → convert it into a <ul>, <ol>, or <table> instead of prose.
- Use sub-headings generously: an H2 over ~250 words MUST be broken with at least one H3. H4 is allowed when an H3 needs further breakdown.
- Add a short <p><strong>Summary:</strong> …</p> at the top of every long H2 section (2 sentences, the core answer).
- Use <strong> to bold the lead 2-4 words of important paragraphs and key numbers in tables so a scanner catches the point.
- Lists must be parallel: same grammatical pattern, similar length per item, no one-word items mixed with full sentences.
- Headings must be benefit-driven and 4-9 words. No questions in H2s (FAQ section excepted). No ALL-CAPS.
- Mobile-first: assume the reader is on a phone. Short lines, short sentences, generous use of whitespace via list/table structure, no nested tables, no ultra-wide tables (cap at 5-6 columns).
- The article must be fully scannable: someone reading only the H2s, H3s, bolded leads, lists and tables should still get the complete answer.

Personalization rules (MANDATORY — write FOR the student, not ABOUT the topic):
- Audience is Indian MBA aspirants, current MBA students, and working professionals (1-7 years exp) targeting CAT/XAT/NMAT/SNAP/CMAT/IIFT, IIMs, ISB, XLRI, FMS, MDI, SPJIMR, NMIMS, IIFT, IMT, executive MBAs and 1-year programmes.
- Speak directly to the reader using "you" / "your". Reference real student situations: "If you're a fresher targeting IIM-A…", "For a working professional with 4 years in IT…", "If your CAT percentile is in the 90-95 band…".
- Tailor advice to common segments where relevant: freshers vs work-ex, engineers vs non-engineers, female candidates (diversity scoring), repeaters, GEM (General-Engineer-Male) high-percentile pool, NC-OBC/SC/ST/EWS quotas, Tier-1 vs Tier-2 college graduates.
- Use at least 2-3 concrete worked examples per article: a named persona + numbers + outcome. Example: "Riya, a CSE grad with 1.5 yrs work-ex and 96.2 %ile in CAT 2024, converted IIM-K but missed IIM-A by 1.2 points on PI."
- Explain every technical/MBA term in plain words the first time it appears (PGP, PPO, GD-PI-WAT, ABG, CTC, sectional cutoff, %ile vs %, NIRF, ROI, OA round, summers, finals).
- Address common student doubts naturally inside the relevant section — not as a separate "Myths" block. Examples: "A lot of students worry that…", "Most aspirants overestimate…", "The biggest mistake repeaters make is…".
- Show empathy for the journey: acknowledge prep stress, fee pressure, family expectations, low-percentile recovery paths, gap years, switching domains post-MBA — without being preachy.
- Never write as if the reader is a generic adult. Every sentence should feel like it was written for a CAT-prep-or-MBA student, not a corporate blog reader.

Article structure rules (MANDATORY — every article must follow this skeleton):
1. **Introduction (intro field)** — Summary <p><strong>Summary:</strong> …</p> (60-90 words, direct answer) + 2-3 short hook paragraphs naming the topic, the reader, and what they'll get.
2. **Snapshot** — first H2 inside content, titled EXACTLY "Snapshot" (a topic-specific equivalent like "MBA Fees Snapshot" is allowed). NEVER use the words "Key", "Key Highlights", "Highlights", "At a Glance" or "Quick Summary" anywhere in the article. Use a <ul> of 6-10 bullets, each starting with a SHORT <strong>2-4 word lead</strong> followed by one concrete data point (rank, fee, package, date, cutoff, recruiter, eligibility). The bold lead must be a real noun phrase from the topic (e.g. <strong>IIM-A fee</strong>, <strong>CAT cutoff</strong>) — NEVER "Key:", "Highlight:", "Important:", "Pro Tip:", "Note:", "Bold lead:".
3. **Detailed Explanation** — the core 5-10 H2 sections that fully answer the title. Each section follows the topic-focus, data-driven and readability rules. Use H3/H4 sub-breakdowns wherever a section runs long.
4. **Comparison Tables** — at least one dedicated H2 with a <table> when the topic involves more than one college/exam/course/programme. Tables can also be embedded inside detailed sections (per the data-driven rules) — but always include a clear comparison block when applicable.
5. **Important Data & Statistics** — an H2 (e.g. "Latest ${currentYear} Data", "Numbers You Should Know", "Trends to Watch") with 1-2 tables and 4-6 bullet stats — fee ranges, cutoff bands, placement %s, year-on-year trends, NIRF movements, recruiter counts.
6. **FAQs** — H2 "Frequently Asked Questions" with 8-12 People-Also-Ask style Q&A pairs (H3 question, multi-paragraph answer per the SEO rules).
7. **Conclusion / Final Word** — closing H2 (e.g. "Final Word", "Bottom Line", "Your Next Step") with 2-3 short paragraphs summarising the decision + a CTA paragraph with 2-3 internal links to the most relevant tool/page (/college-shortlister, /profile-analyzer, /mba-roi-calculator, /compare, /mocks, /mba-compass, related /blog/ posts).

Order is fixed: Intro → Snapshot → Detailed sections → (Comparison tables block, if applicable) → Important Data & Statistics → Takeaways → FAQs → Conclusion + Final CTA → "About MBA Compass" (LAST). Never skip Snapshot, FAQs, the About MBA Compass section, or the Conclusion.

MBA Compass brand mention (MANDATORY — every article must include this):
- Add a dedicated H2 titled exactly "About MBA Compass" (or "How MBA Compass Helps You") placed at the VERY END of the article (after the Conclusion + Final CTA).
- The section must be 120-180 words, educational and value-driven — not a sales pitch. Use the mentor voice.
- Cover, naturally and briefly:
  • What MBA Compass is — an MBA discovery and decision platform for Indian aspirants (B School Buzz product) that brings colleges, exams, coaching, mocks, and AI tools into one place.
  • How it helps students and working professionals — shortlist the right colleges, analyze their profile, compare programmes, prepare with full-length mocks, and plan smarter.
  • The financial-decision angle — an MBA is one of the biggest investments a student makes; MBA Compass helps you weigh fees, ROI, expected packages and long-term wealth outcomes before committing, so you build financial clarity around the MBA decision.
- End the section with 2-3 contextual internal links chosen from: /mba-compass, /college-shortlister, /profile-analyzer, /mba-roi-calculator, /compare, /mocks — pick the ones that best fit the article's topic.
- Tone: helpful and informative, like a senior recommending a useful resource. Avoid words like "best", "ultimate", "unbeatable", "must-have".

BANNED AI-SOUNDING WORDS & PHRASES (NEVER USE — strict, no exceptions):
- Generic labels in headings, bullets or bold leads: "Key", "Key Highlights", "Highlights", "Highlight", "Pro Tip", "Tip", "Important", "Important Note", "Note", "Insight", "Insights", "Quick Tip", "Bold lead", "Heads up", "Bonus", "At a Glance", "Quick Summary", "TL;DR".
- Generic AI clichés anywhere: delve, delve into, dive deep, deep dive, in today's fast-paced world, in today's digital age, ever-evolving, ever-changing landscape, rapidly evolving, unlock the secrets/power/potential, embark on, navigate the complexities, elevate your, leverage, seamless(ly), robust, cutting-edge, state-of-the-art, game-changer, game-changing, pivotal, paramount, quintessential, tapestry, in the realm of, moreover, furthermore, in conclusion, it is worth noting, it's important to note, needless to say, rest assured, a testament to, harness the power.
- Bullet leads must be REAL nouns from the topic ("<strong>IIM-A fee</strong>", "<strong>CAT cutoff</strong>", "<strong>Median CTC</strong>") — never a generic label.

STRICT 25-RULE SEO + GEO + AI SEARCH CHARTER (HARD REQUIREMENTS — every rule below is non-negotiable):
1. Title (H1): 50-60 chars. Primary keyword appears naturally. Benefit-driven. Use a number/year/comparison/guide/question form when relevant.
2. Meta Title: MAX 60 chars. Primary keyword near the START. Different wording from H1 but closely related. No question mark.
3. Meta Description: 150-160 chars (target 155). Primary keyword exactly ONCE. State one clear benefit + an action cue. Declarative.
4. URL Slug: short and keyword-focused, MAX 5 words, hyphenated, lowercase, no filler words ("top", "best", "complete", "guide", "for", "the").
5. Introduction: FIRST paragraph 50-80 words. Primary keyword in the first 100 words. State what the article covers + directly address the search intent. Open with a <p><strong>Summary:</strong> ...</p> answer block, then 1-2 hook paragraphs.
6. Paragraphs: MAX 3-4 lines (≤ 60 words). One idea per paragraph. BOLD RULES (STRICT): use <strong> ONLY on short fragments — a single data point (number/INR figure/%/date/rank), a 2-4 word lead phrase at the start of a bullet, a key entity name, or one short emphasis phrase. NEVER wrap an entire sentence, paragraph, list item, table cell, or heading in <strong>. A <strong> span must always be ≤ 12 words. The article must NOT read as mostly-bold text. The <strong> lead MUST be a topic noun ("<strong>IIM-A fee</strong>"), NEVER a generic label like "Key:" / "Highlight:" / "Note:".
7. Headings: strict hierarchy H1 → H2 → H3 → H4. Never skip a level. Never use H5/H6.
8. Keyword Placement Matrix — primary keyword MUST appear in ALL of: Title, Meta Title, Meta Description, URL slug, first 100 words of intro, at least one H2 heading, the Conclusion paragraph.
9. Keyword Density: primary keyword 1-2% (~15-25 mentions per 2,000 words). Distribute evenly. Never force it.
10. Headings as user queries: every H2 should answer a real search intent for the topic (questions worded as benefit-driven statements; FAQ section H3s may be literal questions). NEVER use "Key Highlights" / "At a Glance" / "Quick Summary" as an H2 — use "Snapshot" or a topic-specific noun phrase.
11. Data cadence: a concrete data point (number, %, INR figure, rank, date, recruiter, percentile) every 300-500 words. Bold important numbers. Only recent ${currentYear}-${currentYear + 1} / verified data.
12. Tables: REQUIRED whenever 2+ entities are being compared or any rows × columns information exists. Minimum 4 tables per article. 5+ rows each.
13. Lists: REQUIRED whenever 3+ items, steps, factors, pros/cons, features appear. Minimum 6 lists per article.
14. Featured-snippet optimization: directly under any question-shaped H2 (and inside every FAQ), give a 1-2 sentence direct answer FIRST, then expand.
15. GEO (ChatGPT / Gemini / Claude / Perplexity / Google AI Overviews): use clear definitions, direct answers, FAQ format, expert insights, comparisons, and statistics so generative engines can quote you cleanly.
16. Entity SEO: name real, relevant entities throughout — colleges (IIM Ahmedabad, IIM Bangalore, FMS Delhi, XLRI, MDI, SPJIMR, NMIMS, IIFT, IMT), exams (CAT, XAT, NMAT, SNAP, CMAT, MAT, IIFT, MICAT), bodies (AICTE, UGC, NIRF, MoE), recruiters (McKinsey, BCG, Bain, Accenture, TAS, ABG, HUL, ITC, Goldman Sachs).
17. Internal linking: 1 contextual internal link every 300-500 words. Mandatory placements: at least one after the intro, one mid-article, one before the conclusion. Total 12-20 internal links. Anchor must be the entity name or a natural descriptive phrase — never "click here", "read more".
18. External source mentions: use 3-5 authoritative source NAMES only when genuinely relevant (gov sites, NIRF, AICTE, UGC, official college websites, recent reports, Economic Times, Business Standard). Do not render bare URLs or external <a> tags, and do not invent [src:...] markers for unverified claims.
19. Images: DO NOT include any <img> tags or image placeholders. The blog is text-only — typography must stay uniform end-to-end.
20. CTAs at 3 FIXED positions: (a) after the introduction, (b) middle of the article, (c) just before the conclusion. Use the mentor voice (e.g. "Want expert guidance for MBA admissions? Connect with our mentors today.", "Need help selecting the right MBA college? Explore our MBA counseling.", "Start your MBA journey today by exploring top colleges and admission opportunities."). Each CTA paragraph contains 1-2 internal links.
21. Takeaways section: REQUIRED, placed JUST BEFORE the Conclusion. H2 titled exactly "Takeaways" (NEVER "Key Takeaways"). 4-6 bullets, each starting with a SHORT topic-noun <strong>lead</strong> (e.g. "<strong>Fee gap</strong>", "<strong>Cutoff trend</strong>") — never "Bold lead:" / "Key:" / "Note:".
22. Conclusion: 100-150 words. Summarises the article. Primary keyword appears EXACTLY ONCE. Ends with a final CTA paragraph that links to 2-3 most relevant tools.
23. FAQs: 5-10 questions (target 8). Each answer 40-80 words. People-Also-Ask style. Direct answer first sentence, then 1-2 supporting lines with a concrete number/name.
24. EEAT: demonstrate Experience, Expertise, Authority, Trust. Use phrases like "Based on placement reports published by leading MBA institutes…", "According to official admission data…", "Industry experts suggest…", "As per the latest NIRF ranking…".
25. Fixed structural order (NEVER skip / NEVER reorder): Title → Meta Title → Meta Description → Intro (50-80w first para) → Snapshot H2 (table or bullets of core data points) → Main H2/H3 sections (with stats, internal links, comparison tables, expert insights interleaved) → CTA 1 (after intro) → CTA 2 (mid-article) → Important Data & Statistics block → Takeaways H2 → CTA 3 (before conclusion) → FAQs H2 → Conclusion H2 → Final CTA paragraph → "About MBA Compass" H2 (LAST, with 2-3 contextual internal links to MBA Compass tools).

Final quality checklist (self-verify before returning):
✓ All 25 rules above satisfied.
✓ Meta title ≤60 chars, meta description 150-160 chars.
✓ First intro paragraph is 50-80 words and contains the primary keyword.
✓ At least 4 tables, 6 lists, 12-20 internal links, 3 CTAs at fixed positions. NO images / NO <img> / NO figure / NO image placeholders anywhere.
✓ <strong> used sparingly on short topic-noun highlights only — NEVER on full sentences, paragraphs, list items, or table cells, and NEVER as a generic label ("Key:", "Highlight:", "Note:", "Pro Tip:", "Bold lead:").
✓ Zero use of banned AI words (Key, Highlights, At a Glance, delve, leverage, seamless, robust, cutting-edge, game-changer, pivotal, tapestry, in the realm of, moreover, furthermore, in conclusion, etc.).
✓ 5-10 FAQs, each answer 40-80 words.
✓ Conclusion is 100-150 words with primary keyword used once and a final CTA.
✓ "About MBA Compass" present after the Conclusion (LAST H2).
✓ Reads like a human MBA mentor.`;
}

async function createOutlineDraft(brief: BlogBrief) {
  const targets = getTargets(brief);
  const targetKw = brief.targetKeyword.trim();
  const fallback = fallbackSections(brief, targets.sectionCount);
  try {
    const outline = await callStructuredAI({
      feature: "ai-blog-writer-outline",
      system: writerSystemPrompt(brief),
      maxTokens: 5000,
      toolName: "plan_blog_article",
      description: "Plan the SEO article and write only the introduction metadata.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          slug: { type: "string" },
          metaTitle: { type: "string" },
          metaDescription: { type: "string" },
          excerpt: { type: "string" },
          intro: { type: "string" },
          h1Tag: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          author: { type: "string" },
          sections: { type: "array", items: { type: "object", properties: { heading: { type: "string" }, angle: { type: "string" } }, required: ["heading", "angle"], additionalProperties: false } },
          faqs: { type: "array", items: { type: "string" } },
        },
        required: ["title", "slug", "metaTitle", "metaDescription", "excerpt", "intro", "h1Tag", "keywords", "author", "sections", "faqs"],
        additionalProperties: false,
      },
      user: `Create a topic-specific SEO plan for "${brief.title}" targeting primary keyword "${targetKw}".

Return:
- title: 50-60 chars, benefit-driven, contains "${targetKw}" naturally, may include the year ${targets.currentYear}.
- slug: short keyword-focused, MAX 5 hyphenated words, lowercase, no filler words (no "top", "best", "complete", "guide", "for", "the").
- metaTitle: MAX 60 chars, "${targetKw}" near the start, different wording from title.
- metaDescription: 150-160 chars (target 155), contains "${targetKw}" exactly once, one clear benefit + action cue.
- h1Tag: same intent as title, 50-60 chars.
- excerpt: 1-2 sentences (≤ 200 chars).
- intro: 250-350 word HTML block. The FIRST <p> must be 50-80 words, must include "${targetKw}" within the first 100 words, and must start with <p><strong>Summary:</strong> giving a direct answer. Follow with 1-2 hook paragraphs (≤ 60 words each).
- sections: ${targets.sectionCount} unique H2 section plans (heading + angle), each suitable for 450-650 words with a table/list. The FIRST planned section MUST be titled "Snapshot" (a topic-specific noun phrase like "MBA Fees Snapshot" is allowed) — NEVER "Key Highlights", "Highlights", "At a Glance" or "Quick Summary". Include later sections explicitly covering: comparison tables, important data & statistics, expert insights.
- faqs: 8 People-Also-Ask style questions (between 5 and 10).

Secondary keywords to weave naturally: ${(brief.secondaryKeywords || []).join(", ") || "derive naturally from topic"}.
Category: ${brief.category || "news"}.`,
    });
    const sections = Array.isArray(outline.sections) && outline.sections.length ? outline.sections : fallback;
    const metaTitleRaw = String(outline.metaTitle || brief.metaTitle || brief.title);
    const metaDescRaw = String(outline.metaDescription || brief.metaDescription || outline.excerpt || "");
    return {
      title: String(outline.title || brief.title).slice(0, 65),
      slug: normalizeSlug(outline.slug || brief.slug || targetKw),
      metaTitle: metaTitleRaw.slice(0, 60),
      metaDescription: metaDescRaw.length > 160 ? metaDescRaw.slice(0, 160) : metaDescRaw,
      excerpt: String(outline.excerpt || ""),
      intro: stripExternalLinks(outline.intro || `<p><strong>Summary:</strong> ${escapeHtml(brief.title)} is explained below with updated MBA admissions, fees, placements and decision points for Indian applicants.</p>`),
      h1Tag: String(outline.h1Tag || brief.title).slice(0, 65),
      keywords: Array.isArray(outline.keywords) ? outline.keywords.slice(0, 20) : [targetKw],
      primaryKeyword: targetKw,
      author: outline.author || "MBA Compass Editorial",
      sections: sections.slice(0, targets.sectionCount).map((s: any, i: number) => ({ heading: String(s.heading || fallback[i]?.heading || `Section ${i + 1}`), angle: String(s.angle || fallback[i]?.angle || "Detailed MBA analysis") })),
      faqQuestions: Array.isArray(outline.faqs) ? outline.faqs.slice(0, 10) : [],
    };
  } catch (e) {
    console.warn("Outline AI failed; using safe fallback:", e instanceof Error ? e.message : e);
    return {
      title: brief.title,
      slug: normalizeSlug(brief.slug || targetKw),
      metaTitle: (brief.metaTitle || `${targetKw} Guide ${targets.currentYear} | MBA Compass`).slice(0, 70),
      metaDescription: (brief.metaDescription || `${targetKw} explained with latest MBA admissions, fees, cutoffs, placements, ROI, colleges and expert shortlisting advice.`).slice(0, 170),
      excerpt: `${targetKw} guide with current MBA admissions, fees, cutoffs, placements, ROI and decision pointers.`,
      intro: `<p><strong>Summary:</strong> ${escapeHtml(targetKw)} needs a clear read on eligibility, fees, cutoffs, placements and ROI before students shortlist options. This guide breaks the topic into practical, data-led sections for Indian MBA applicants.</p>`,
      h1Tag: brief.title,
      keywords: [targetKw, ...(brief.secondaryKeywords || [])].slice(0, 20),
      primaryKeyword: targetKw,
      author: "MBA Compass Editorial",
      sections: fallback,
      faqQuestions: [],
    };
  }
}

function fallbackSectionHtml(brief: BlogBrief, heading: string) {
  const kw = escapeHtml(brief.targetKeyword || brief.title);
  const h = escapeHtml(heading);
  const y = new Date().getFullYear();
  return `<h2>${h}</h2><p><strong>Direct answer:</strong> For ${kw}, students should evaluate the latest admission cycle, total cost, cutoffs, placement strength and fit before making a decision. The safest approach is to compare official school data, exam requirements and recent salary outcomes together rather than relying on one metric.</p><p>The most useful way to read this topic is through ROI and selection probability. Applicants should check whether the programme accepts CAT, XAT, NMAT, SNAP, CMAT, MAT or GMAT scores, then compare fees, average package, median package and recruiter quality. A college with a slightly lower average package may still be better if fees are controlled and role quality is strong.</p><table><thead><tr><th>Metric</th><th>What to check</th><th>Good benchmark</th></tr></thead><tbody><tr><td>Fees</td><td>Total two-year MBA/PGDM cost</td><td>INR 8-28 lakh</td></tr><tr><td>Placements</td><td>Average and median CTC</td><td>INR 10-35 LPA</td></tr><tr><td>Cutoff</td><td>Entrance percentile range</td><td>75-99+ percentile</td></tr><tr><td>Recruiters</td><td>Consulting, BFSI, FMCG, tech roles</td><td>30-150+ recruiters</td></tr><tr><td>Batch profile</td><td>Freshers and work-ex students</td><td>Balanced cohort</td></tr></tbody></table><ul><li>Check official admission notices for ${y}-${y + 1} before applying.</li><li>Compare average package with median package to avoid inflated outcomes.</li><li>Use <a href="/college-shortlister">the college shortlister</a> to compare fit and ROI.</li><li>Prioritise programmes with consistent recruiter participation.</li><li>Keep backup options if your expected percentile is below the safe range.</li></ul><h3>Advisor view</h3><p>For most Indian MBA aspirants, ${kw} should be judged through a shortlist of reach, match and safe options. This keeps ambition high while protecting the application cycle from avoidable risk. <strong>The best decision is data-led, not brand-led alone.</strong></p>`;
}

async function createSectionHtml(brief: BlogBrief, draft: any, section: any, index: number) {
  try {
    const targets = getTargets(brief);
    const result = await callStructuredAI({
      feature: "ai-blog-writer-section",
      system: writerSystemPrompt(brief),
      maxTokens: 7000,
      toolName: "write_blog_section",
      description: "Write one detailed HTML article section.",
      parameters: {
        type: "object",
        properties: { heading: { type: "string" }, html: { type: "string" } },
        required: ["heading", "html"],
        additionalProperties: false,
      },
      user: (() => {
        const totalSections = (draft.sections || []).length || 6;
        const isFirst = index === 0;
        const isMiddle = index === Math.floor(totalSections / 2);
        const isLast = index === totalSections - 1;
        const ctaNote = isFirst
          ? 'INCLUDE CTA #1 (after-intro position): end this section with a <p><strong>Mentor tip:</strong> ...</p> CTA paragraph in the tone "Want expert guidance for MBA admissions? Connect with our mentors today." containing 1-2 internal links (e.g. /profile-analyzer, /college-shortlister).'
          : isMiddle
          ? 'INCLUDE CTA #2 (mid-article position): end this section with a <p><strong>Need help?</strong> ...</p> CTA paragraph in the tone "Need help selecting the right MBA college? Explore our MBA counseling services." containing 1-2 internal links (e.g. /college-shortlister, /mba-roi-calculator).'
          : '';
        const imgNote = '';
        return `Write section ${index + 1} of ${totalSections} for the article "${draft.title}" targeting primary keyword "${brief.targetKeyword}".

Section heading: ${section.heading}
Section angle: ${section.angle}
All planned headings: ${(draft.sections || []).map((s: any) => s.heading).join(" | ")}

HARD requirements:
- Output exactly one <h2>${section.heading}</h2> block, 450-650 words.
- 4-6 short paragraphs (each ≤ 60 words, max 3-4 lines, one idea each). One <h3> sub-section. One 5+ row <table>. One 5+ item <ul> or <ol>.
- At least one concrete data point (number / INR figure / %ile / rank / date) per ~300-500 words. Bold important numbers with <strong>.
- 2-4 contextual internal relative links inside this section (anchor = entity name or descriptive phrase; never "click here").
- If this section answers a "what/why/how" style question, the FIRST sentence after the H2 must be a direct 1-2 sentence answer (featured-snippet style).
- Use current ${targets.currentYear}-${targets.currentYear + 1} Indian MBA data with named colleges/recruiters/exams. Add source names only when genuinely known; no bare URLs and no external <a>.
- Name relevant entities (IIMs, XLRI, FMS, MDI, SPJIMR, NMIMS, CAT, XAT, NMAT, SNAP, CMAT, AICTE, UGC, NIRF) where it fits.
- Demonstrate EEAT with at least one phrase like "Based on placement reports…", "According to official admission data…", "Industry experts suggest…", "As per NIRF ${targets.currentYear}…".
- Do NOT repeat content from other planned sections.
${imgNote}
${ctaNote}`;
      })(),
    });
    const html = stripExternalLinks(result.html || "");
    return html && countWords(html) > 180 ? html : fallbackSectionHtml(brief, section.heading);
  } catch (e) {
    console.warn("Section AI failed; using safe fallback:", e instanceof Error ? e.message : e);
    return fallbackSectionHtml(brief, section.heading);
  }
}

function fallbackClosingHtml(brief: BlogBrief) {
  const kw = escapeHtml(brief.targetKeyword || brief.title);
  return {
    keyTakeawaysHtml: `<h2>Takeaways</h2><ul><li><strong>Fit first:</strong> Match ${kw} against your percentile, budget, preferred city and target roles before shortlisting.</li><li><strong>Current data:</strong> Use the latest admission notice, fee sheet and placement report before trusting any claim.</li><li><strong>ROI lens:</strong> Median package, total fees and role quality matter more than one headline average salary.</li><li><strong>Backups:</strong> Keep reach, match and safe options so one cutoff surprise does not damage the cycle.</li><li><strong>Deadlines:</strong> Application windows, interview dates and fee-payment milestones can change every admission year.</li><li><strong>Tools:</strong> Compare options with <a href="/college-shortlister">the MBA college shortlister</a> and ROI calculator.</li></ul>`,
    faqHtml: `<h2>Frequently Asked Questions</h2><h3>How should students evaluate ${kw}?</h3><p>Students should evaluate ${kw} through eligibility, entrance scores, fees, placement reports, recruiter mix, location and personal fit. The strongest shortlist balances brand value with realistic admission probability and return on investment.</p><h3>Is ${kw} worth it for MBA aspirants?</h3><p>${kw} can be worth it when the programme, city, fee level and placement outcomes align with your career target. Check current salary data, median outcomes and role quality before making the final call.</p>`,
    aboutCompassHtml: `<h2>About MBA Compass</h2><p><strong>MBA Compass</strong> is an MBA discovery and decision platform by B School Buzz, built for Indian aspirants and working professionals. It brings colleges, entrance exams, coaching options, full-length mocks and AI-driven tools into one place so you can plan your MBA journey end-to-end.</p><p>The platform helps you shortlist the right colleges, analyze your profile honestly, compare programmes side-by-side, and prepare with realistic mocks. Because an MBA is one of the biggest financial decisions you'll make, MBA Compass also helps you weigh fees, expected packages, ROI and long-term wealth outcomes before you commit — so the choice is grounded in numbers, not just brand pull. Explore <a href="/mba-compass">MBA Compass</a>, the <a href="/college-shortlister">college shortlister</a> and the <a href="/mba-roi-calculator">MBA ROI calculator</a> to get started.</p>`,
    ctaHtml: `<p><strong>Take the next step:</strong> Start your MBA journey by exploring top colleges and admission opportunities — use <a href="/college-shortlister">the college shortlister</a>, <a href="/profile-analyzer">profile analyzer</a> and <a href="/mba-roi-calculator">MBA ROI calculator</a> to turn this ${kw} research into a practical shortlist.</p>`,
    conclusionHtml: `<h2>Conclusion</h2><p>Choosing the right path around ${kw} comes down to a clear read on eligibility, fees, cutoffs, placements and personal fit. Indian MBA aspirants who weigh ROI, recruiter mix and admission probability together — instead of chasing brand alone — consistently land stronger outcomes. Use the data above as your starting checklist, then layer in your own percentile band, budget and target roles. The market changes every cycle, so verify the latest numbers from official sources before you commit. Ready to act? Explore <a href="/mba-compass">MBA Compass</a> and the <a href="/college-shortlister">college shortlister</a> to convert this research into a real shortlist.</p>`,
    faqs: [
      { question: `How should students evaluate ${brief.targetKeyword}?`, answer: `Students should evaluate ${brief.targetKeyword} through eligibility, entrance scores, fees, placement reports, recruiter mix, location and personal fit.` },
      { question: `Is ${brief.targetKeyword} worth it for MBA aspirants?`, answer: `${brief.targetKeyword} can be worth it when the programme, city, fee level and placement outcomes align with the student's career target.` },
    ],
  };
}

async function createClosingHtml(brief: BlogBrief, draft: any) {
  try {
    const result = await callStructuredAI({
      feature: "ai-blog-writer-closing",
      system: writerSystemPrompt(brief),
      maxTokens: 8000,
      toolName: "write_blog_closing",
      description: "Write key takeaways, detailed FAQs and final CTA.",
      parameters: {
        type: "object",
        properties: {
          keyTakeawaysHtml: { type: "string" },
          faqHtml: { type: "string" },
          aboutCompassHtml: { type: "string" },
          conclusionHtml: { type: "string" },
          ctaHtml: { type: "string" },
          faqs: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"], additionalProperties: false } },
        },
        required: ["keyTakeawaysHtml", "faqHtml", "aboutCompassHtml", "conclusionHtml", "ctaHtml", "faqs"],
        additionalProperties: false,
      },
      user: `Finish the article "${draft.title}" targeting primary keyword "${brief.targetKeyword}".

Written sections: ${(draft.sections || []).map((s: any) => s.heading).join(" | ")}
FAQ question ideas: ${(draft.faqQuestions || []).join(" | ")}

Return EXACTLY these blocks, in this order, each as standalone HTML strings:

1) aboutCompassHtml — <h2>About MBA Compass</h2> + 120-180 words: what MBA Compass is (MBA discovery + decision platform by B School Buzz), how it helps Indian students and working professionals (shortlist colleges, analyze profile, compare programmes, full mocks), the financial-decision angle (fees, ROI, expected packages, long-term wealth). Educational, not promotional. End with 2-3 contextual internal links chosen from /mba-compass, /college-shortlister, /profile-analyzer, /mba-roi-calculator, /compare, /mocks.

2) keyTakeawaysHtml — <h2>Takeaways</h2> + a <ul> of 4-6 bullets. Each bullet starts with a SHORT topic-noun <strong>lead</strong> (e.g. <strong>Fee gap</strong>, <strong>Cutoff trend</strong>) followed by one concrete data point or decision rule. NEVER use generic labels like "Key:", "Highlight:", "Important:", "Note:", "Pro Tip:", "Bold lead:".

3) ctaHtml — CTA #3 (before conclusion). One <p><strong>Take the next step:</strong> …</p> paragraph in the tone "Start your MBA journey today by exploring top colleges and admission opportunities." with 2-3 contextual internal links (/college-shortlister, /profile-analyzer, /mba-roi-calculator, /compare, /mocks).

4) faqHtml — <h2>Frequently Asked Questions</h2> + 8 (between 5 and 10) Q&A pairs as <h3>Question?</h3><p>Answer</p>. Each answer MUST be 40-80 words, direct answer first sentence, then 1-2 supporting lines with a concrete number/name. People-Also-Ask style ("is", "how", "what", "which", "when", "vs", "fees", "cutoff", "salary", "eligibility").

5) conclusionHtml — <h2>Conclusion</h2> + ONE paragraph of 100-150 words. Summarises the article. MUST contain "${brief.targetKeyword}" exactly ONCE. Ends with one closing line that points to the next action and includes 1-2 internal links.

6) faqs — structured array mirroring the FAQ HTML (question + answer, plain text answer, 40-80 words).`,
    });
    return {
      keyTakeawaysHtml: stripExternalLinks(result.keyTakeawaysHtml || ""),
      faqHtml: stripExternalLinks(result.faqHtml || ""),
      aboutCompassHtml: stripExternalLinks(result.aboutCompassHtml || ""),
      conclusionHtml: stripExternalLinks(result.conclusionHtml || ""),
      ctaHtml: stripExternalLinks(result.ctaHtml || ""),
      faqs: Array.isArray(result.faqs) ? result.faqs.slice(0, 10) : [],
    };
  } catch (e) {
    console.warn("Closing AI failed; using safe fallback:", e instanceof Error ? e.message : e);
    return fallbackClosingHtml(brief);
  }
}

// Flexible keyword matcher — handles plural "s", flexible whitespace, word boundaries.
// Prevents "0 occurrences" false-negatives when the AI writes minor variations
// (e.g. "IIM placements" vs "IIM placement").
const buildKeywordRegex = (kw: string): RegExp => {
  const tokens = kw.trim().split(/\s+/).filter(Boolean)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "s?");
  if (!tokens.length) return /a^/;
  return new RegExp(`\\b${tokens.join("\\s+")}\\b`, "gi");
};
const countKeyword = (plain: string, kw: string): number =>
  (plain.match(buildKeywordRegex(kw)) || []).length;
const computeDensity = (plain: string, kw: string): { occurrences: number; words: number; density: number } => {
  const words = plain.split(/\s+/).filter(Boolean).length;
  const occurrences = countKeyword(plain, kw);
  const kwLen = kw.trim().split(/\s+/).filter(Boolean).length || 1;
  const density = words ? +((occurrences * kwLen) / words * 100).toFixed(2) : 0;
  return { occurrences, words, density };
};

const extractFaqs = (html: string) => {
  if (!html) return [];
  const re2 = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  const out: { question: string; answer: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re2.exec(html))) {
    const q = toPlainText(m[1]);
    const a = toPlainText(m[2]);
    if (q && a && (q.endsWith("?") || /^(what|why|how|is|are|can|should|do|does|when|where|which|who)\b/i.test(q)) && a.length >= 20) {
      out.push({ question: q, answer: a });
    }
  }
  const seen = new Set<string>();
  return out.filter((f) => {
    const k = f.question.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 10);
};

function clampMeta(s: string, min: number, max: number, fallback: string): string {
  let v = String(s || "").replace(/\s+/g, " ").trim();
  if (!v) v = fallback;
  if (v.length > max) v = v.slice(0, max).replace(/\s+\S*$/, "").trim();
  if (v.length < min && fallback && fallback.length > v.length) {
    v = (v + " — " + fallback).slice(0, max).replace(/\s+\S*$/, "").trim();
  }
  return v;
}

async function finalizeChunkedArticle(adminClient: any, jobId: string, brief: BlogBrief, draft: any) {
  const targets = getTargets(brief);
  const targetKw = brief.targetKeyword.trim();
  const sectionsHtml = (draft.sections || []).map((s: any) => stripExternalLinks(s.html || fallbackSectionHtml(brief, s.heading))).join("\n");
  // Fixed structural order: sections → Key Takeaways → CTA #3 → FAQs → Conclusion → About MBA Compass (LAST) → updated stamp
  const closingHtml = [
    draft.keyTakeawaysHtml || "",
    draft.ctaHtml || "",
    draft.faqHtml || "",
    draft.conclusionHtml || "",
    draft.aboutCompassHtml || "",
    `<p><em>Last updated: ${targets.todayIso}</em></p>`,
  ].filter(Boolean).join("\n");
  const introRaw = stripExternalLinks(draft.intro || "");
  const contentRaw = stripExternalLinks(`${sectionsHtml}\n${closingHtml}`);
  const introQC = runFinalQualityCheck(introRaw, { requireMbaCompass: false, minInternalLinks: 0 });
  const contentQC = runFinalQualityCheck(contentRaw, { requireMbaCompass: true, requireFaq: true, requireTable: true, minInternalLinks: 8 });
  const blockingFactIssues = getBlockingFactIssues([...introQC.issues, ...contentQC.issues]);
  if (blockingFactIssues.length) {
    throw new Error(`Fact-check blocked publishing: ${blockingFactIssues.map((i) => i.message).join(" | ")}`);
  }
  const intro = introQC.html;
  const content = contentQC.html;
  if (contentQC.issues.length) {
    console.log(`[ai-blog-writer] QC issues for "${targetKw}":`, contentQC.issues.map(i => `${i.code}:${i.message}`).join(" | "));
  }
  const finalPlain = toPlainText(`${intro} ${content}`);
  const { occurrences: finalOccurrences, words: finalWords, density: finalDensity } = computeDensity(finalPlain, targetKw);
  const extractedFaqs = Array.isArray(draft.faqs) && draft.faqs.length ? draft.faqs.slice(0, 10) : extractFaqs(content);

  // 25-rule validators (logged for visibility; non-blocking)
  const fullHtml = `${intro}\n${content}`;
  const introFirstPara = (introRaw.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "");
  const introFirstParaWords = toPlainText(introFirstPara).split(/\s+/).filter(Boolean).length;
  const h2Count = (fullHtml.match(/<h2\b/gi) || []).length;
  const tableCount = (fullHtml.match(/<table\b/gi) || []).length;
  const listCount = (fullHtml.match(/<(ul|ol)\b/gi) || []).length;
  const imgCount = (fullHtml.match(/<img\b/gi) || []).length;
  const internalLinkCount = (fullHtml.match(/<a\s+[^>]*href="\/[^"]*"/gi) || []).length;
  const externalCitationCount = (fullHtml.match(/\[src:[^\]]+\]/gi) || []).length;
  const conclusionWords = toPlainText(draft.conclusionHtml || "").split(/\s+/).filter(Boolean).length;
  const baseMetaTitle = String(draft.metaTitle || brief.metaTitle || draft.title || brief.title);
  const baseMetaDesc = String(draft.metaDescription || brief.metaDescription || draft.excerpt || "");
  const metaTitleFinal = clampMeta(baseMetaTitle, 30, 60, `${targetKw} ${targets.currentYear} | MBA Compass`);
  const metaDescFinal = clampMeta(baseMetaDesc, 150, 160, `${targetKw} explained with ${targets.currentYear} MBA admissions, fees, cutoffs, placements and ROI for Indian aspirants.`);

  const validation = {
    metaTitleLen: metaTitleFinal.length,
    metaDescLen: metaDescFinal.length,
    introFirstParaWords,
    h2Count, tableCount, listCount, imgCount,
    internalLinkCount, externalCitationCount,
    faqCount: extractedFaqs.length,
    conclusionWords,
    keywordOccurrences: finalOccurrences,
    keywordDensityPct: finalDensity,
    hasKeyTakeaways: /<h2[^>]*>\s*(?:Key\s+)?Takeaways/i.test(content),
    hasAboutCompass: /<h2[^>]*>\s*About MBA Compass/i.test(content),
    hasConclusion: /<h2[^>]*>\s*(Conclusion|Final Word|Bottom Line)/i.test(content),
  };
  const warnings: string[] = [];
  if (validation.metaTitleLen > 60) warnings.push("meta_title>60");
  if (validation.metaDescLen < 150 || validation.metaDescLen > 160) warnings.push(`meta_desc_len=${validation.metaDescLen}`);
  if (introFirstParaWords < 50 || introFirstParaWords > 80) warnings.push(`intro_first_para_words=${introFirstParaWords}`);
  if (validation.tableCount < 4) warnings.push(`tables=${validation.tableCount}`);
  if (validation.listCount < 6) warnings.push(`lists=${validation.listCount}`);
  // images intentionally not validated — text-only blog
  if (validation.internalLinkCount < 12) warnings.push(`internal_links=${validation.internalLinkCount}`);
  if (validation.faqCount < 5 || validation.faqCount > 10) warnings.push(`faqs=${validation.faqCount}`);
  if (conclusionWords && (conclusionWords < 100 || conclusionWords > 150)) warnings.push(`conclusion_words=${conclusionWords}`);
  if (!validation.hasKeyTakeaways) warnings.push("missing_key_takeaways");
  if (!validation.hasAboutCompass) warnings.push("missing_about_mba_compass");
  if (!validation.hasConclusion) warnings.push("missing_conclusion");
  if (warnings.length) console.log(`[ai-blog-writer] 25-rule warnings for "${targetKw}":`, warnings.join(" | "));

  const baseSlug = normalizeSlug(draft.slug || brief.slug || targetKw);
  let finalSlug = baseSlug;
  const { data: existingSlug } = await adminClient.from("articles").select("id").eq("slug", finalSlug).maybeSingle();
  if (existingSlug?.id) finalSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

  const { data: inserted, error: insertError } = await adminClient.from("articles").insert({
    title: String(draft.title || brief.title).slice(0, 65),
    slug: finalSlug,
    excerpt: draft.excerpt || "",
    intro,
    content,
    meta_title: metaTitleFinal,
    meta_description: metaDescFinal,
    keywords: Array.isArray(draft.keywords) ? draft.keywords : [targetKw],
    primary_keyword: targetKw,
    h1_tag: String(draft.h1Tag || draft.title || brief.title).slice(0, 65),
    author: draft.author || "MBA Compass Editorial",
    category: brief.category || "news",
    status: "published",
    published: true,
    featured: false,
    priority: 0,
    faqs: extractedFaqs,
    last_seo_refresh: new Date().toISOString(),
  }).select("id, slug").single();
  if (insertError) throw insertError;

  if (extractedFaqs.length > 0 && inserted?.id) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: extractedFaqs.map((f: any) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    };
    const pagePath = `/article/${inserted.slug}`;
    await adminClient.from("site_settings").upsert({
      key: `seo_page__article__${inserted.id}`,
      value: { contentType: "article", recordId: inserted.id, slug: inserted.slug, pagePath, canonicalUrl: pagePath, faqs: extractedFaqs, schemaMarkup: [faqSchema], generatedAt: new Date().toISOString() },
    }, { onConflict: "key" });
  }

  return {
    targetWordsRange: [targets.wmin, targets.wmax],
    actualWords: finalWords,
    targetDensityPct: targets.density,
    actualDensityPct: finalDensity,
    actualOccurrences: finalOccurrences,
    targetOccurrences: Math.round((targets.targetWords * targets.density) / 100),
    expanded: true,
    firstPassWords: finalWords,
    insertedId: inserted.id,
    slug: inserted.slug,
    seo25: { ...validation, warnings },
  };
}

async function processBlogJobStep(adminClient: any, job: any) {
  const jobId = job.id;
  const brief = job.brief as BlogBrief;
  const stats = job.stats && typeof job.stats === "object" ? job.stats : {};
  const phase = stats.phase || "outline";
  const now = new Date().toISOString();
  await adminClient.from("ai_blog_generation_jobs").update({ status: "running", started_at: job.started_at || now, error_message: null }).eq("id", jobId);

  if (phase === "outline") {
    await adminClient.from("ai_blog_generation_jobs").update({ progress: 10, current_step: "Creating SEO outline and intro" }).eq("id", jobId);
    const draft = await createOutlineDraft(brief);
    await adminClient.from("ai_blog_generation_jobs").update({
      status: "queued",
      progress: 18,
      current_step: `Writing section 1 of ${draft.sections.length}`,
      stats: { ...stats, phase: "sections", sectionIndex: 0, draft },
    }).eq("id", jobId);
    return;
  }

  const draft = stats.draft || await createOutlineDraft(brief);
  if (phase === "sections") {
    const sections = Array.isArray(draft.sections) && draft.sections.length ? draft.sections : fallbackSections(brief, getTargets(brief).sectionCount);
    const idx = Math.max(0, Number(stats.sectionIndex || 0));
    if (idx < sections.length) {
      await adminClient.from("ai_blog_generation_jobs").update({ progress: Math.round(20 + (idx / sections.length) * 55), current_step: `Writing section ${idx + 1} of ${sections.length}: ${sections[idx].heading}` }).eq("id", jobId);
      sections[idx] = { ...sections[idx], html: await createSectionHtml(brief, { ...draft, sections }, sections[idx], idx) };
      const nextIndex = idx + 1;
      await adminClient.from("ai_blog_generation_jobs").update({
        status: "queued",
        progress: nextIndex >= sections.length ? 78 : Math.round(20 + (nextIndex / sections.length) * 55),
        current_step: nextIndex >= sections.length ? "Writing takeaways and FAQs" : `Writing section ${nextIndex + 1} of ${sections.length}`,
        stats: { ...stats, phase: nextIndex >= sections.length ? "closing" : "sections", sectionIndex: nextIndex, draft: { ...draft, sections } },
      }).eq("id", jobId);
      return;
    }
  }

  if (phase === "closing") {
    await adminClient.from("ai_blog_generation_jobs").update({ progress: 82, current_step: "Writing takeaways, FAQs and CTA" }).eq("id", jobId);
    const closing = await createClosingHtml(brief, draft);
    await adminClient.from("ai_blog_generation_jobs").update({
      status: "queued",
      progress: 90,
      current_step: "Saving article and FAQ schema",
      stats: { ...stats, phase: "finalize", draft: { ...draft, ...closing } },
    }).eq("id", jobId);
    return;
  }

  if (phase === "finalize") {
    await adminClient.from("ai_blog_generation_jobs").update({ progress: 94, current_step: "Saving article and FAQ schema" }).eq("id", jobId);
    const finalStats = await finalizeChunkedArticle(adminClient, jobId, brief, draft);
    await adminClient.from("ai_blog_generation_jobs").update({
      status: "completed",
      progress: 100,
      current_step: "Article saved successfully",
      article_id: finalStats.insertedId,
      stats: finalStats,
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let activeJobId: string | null = null;
  let adminForError: ReturnType<typeof createClient> | null = null;
  try {
    // --- Admin-only auth gate -------------------------------------------------
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --------------------------------------------------------------------------

    const brief = (await req.json()) as BlogBrief;
    const action = (brief as any)?.action;
    if (action === "status") {
      const requestedJobId = String((brief as any)?.jobId || "");
      if (!requestedJobId) return json(400, { error: "jobId is required" });
      const { data: job, error: jobError } = await adminClient
        .from("ai_blog_generation_jobs")
        .select("id,status,progress,current_step,error_message,article_id,stats,brief,created_at,updated_at,finished_at")
        .eq("id", requestedJobId)
        .maybeSingle();
      if (jobError) throw jobError;
      if (!job) return json(404, { error: "Blog generation job not found" });

      const updatedAt = job.updated_at ? new Date(job.updated_at).getTime() : 0;
      const stalled = ["queued", "running"].includes(String(job.status)) && Date.now() - updatedAt > 120_000;
      const shouldRunNextStep = String(job.status) === "queued" || stalled;
      if (shouldRunNextStep) {
        await adminClient.from("ai_blog_generation_jobs").update({
          status: "running",
          current_step: stalled ? "Recovering stalled generation worker" : (job.current_step || "Continuing AI writing"),
          progress: Math.max(10, Number(job.progress || 0)),
        }).eq("id", requestedJobId);
        EdgeRuntime.waitUntil(
          processBlogJobStep(adminClient, job).catch(async (e) => {
            await adminClient.from("ai_blog_generation_jobs").update({
              status: "failed",
              progress: 100,
              current_step: "Generation failed",
              error_message: e instanceof Error ? e.message.slice(0, 1000) : String(e).slice(0, 1000),
              finished_at: new Date().toISOString(),
            }).eq("id", requestedJobId);
          }),
        );
      }

      const { brief: _brief, ...safeJob } = job as any;
      return json(200, { success: true, job: safeJob });
    }

    const runInline = (brief as any)?.runInline === true;
    activeJobId = typeof (brief as any)?.jobId === "string" ? (brief as any).jobId : null;
    adminForError = adminClient;

    if (!runInline) {
      const cleanBrief = { ...(brief as any) };
      delete cleanBrief.action;
      delete cleanBrief.runInline;
      delete cleanBrief.jobId;
      const { data: job, error: jobError } = await adminClient
        .from("ai_blog_generation_jobs")
        .insert({
          user_id: userRes.user.id,
          status: "queued",
          progress: 5,
          current_step: "Queued for AI writing",
          brief: cleanBrief,
        })
        .select("id")
        .single();
      if (jobError) throw jobError;
      return json(202, { success: true, jobId: job.id, status: "queued" });
    }

    if (!brief?.title || !brief?.targetKeyword) {
      return new Response(
        JSON.stringify({ error: "title and targetKeyword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (activeJobId) {
      await adminClient.from("ai_blog_generation_jobs").update({
        status: "running",
        progress: 15,
        current_step: "Researching topic and drafting article",
        started_at: new Date().toISOString(),
        error_message: null,
      }).eq("id", activeJobId);
    }


    // NO upper cap on word count — long-form (10K+) is fully supported via expansion loop.
    const wmin = Math.max(300, brief.wordCountMin ?? 2500);
    const wmax = Math.max(wmin, brief.wordCountMax ?? 3500);
    // Respect admin-chosen density. Cap at 8% (anything higher is pure stuffing).
    const density = Math.max(0.5, Math.min(brief.keywordDensityPct ?? 2, 8));
    const targetKw = brief.targetKeyword.trim();
    const secKws = (brief.secondaryKeywords || []).filter(Boolean);
    const _now = new Date();
    const _yr = _now.getFullYear();
    const dateCtx = brief.contentDateContext?.trim() ||
      `Use only the most recent verified data (${_yr}-${_yr + 1} admission cycle, ${_yr - 1}-${_yr} placement reports). All dates, exam cycles, fees, cutoffs and statistics MUST reflect the latest available year. Do NOT use outdated 2020-2023 figures unless explicitly historical context. Today is ${_now.toISOString().slice(0, 10)}.`;

    // Approx target keyword occurrences.
    const targetWords = Math.round((wmin + wmax) / 2);
    const targetOccurrences = Math.round((targetWords * density) / 100);
    // Dynamic structural targets — scale with article length
    const targetH2 = Math.max(10, Math.min(30, Math.round(targetWords / 260)));
    const minWordsPerSection = 400;
    const minWordsPerFaq = 120;

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();

    const systemPrompt = `You are a senior MBA mentor at B School Buzz writing for Indian aspirants. Write like a real human mentor explaining things to a student — warm, conversational, specific, practical. Plain English, short sentences, contractions allowed (you're, don't, it's). Never sound like an AI or a generic SEO blog.

# VOICE — MENTOR, NOT AI (NON-NEGOTIABLE)
- Talk one-to-one with the student. Use phrases like "Here's what most students miss…", "If you're targeting IIM-A…", "A simple way to think about this…".
- BANNED words/phrases — never use any: "unlock", "delve", "delve into", "landscape", "navigate", "navigating", "furthermore", "moreover", "in today's fast-paced world", "in the realm of", "embark on a journey", "ever-evolving", "it's worth noting", "look no further", "dive into", "stay tuned", "unleash", "harness the power", "game-changer", "cutting-edge", "world-class", "robust", "leverage", "synergy", "paradigm", "seamless", "holistic", "in conclusion", "to sum up", "as we all know", "needless to say".
- No hype, no corporate jargon, no filler. Every sentence must carry a fact, a number, a name, or actionable advice.

# COMPLETE-DATA MODE (NON-NEGOTIABLE)
- EVERY claim, table, list and stat MUST be filled with concrete, latest ${currentYear} data. Never recycle 2020-2023 cutoffs, dates, fees, rankings or placement numbers as current data.
- For high-risk items (cutoffs, exact exam/admission dates, fees, rankings, seats and placements), never invent a precise number/date. If the current official figure is not confirmed in the prompt/context, write an expected band/window and clearly label it expected/TBA/verify with official notice (e.g. "expected 92-96 percentile band", "official date TBA", "latest-public INR 23-25 lakh fee range").
- Tables MUST have real rows with real numbers — never empty cells, never "—", never "N/A".
- Recruiter lists, college lists, exam-pattern facts MUST be real and named — never placeholder.

# SCOPE LOCK — MBA / MASTERS IN MANAGEMENT ONLY (NON-NEGOTIABLE)
- Every article MUST stay strictly within MBA / PGP / PGDM / PGPM / MMS / MMM / EMBA / PGPX / PGCM / PGPBM / Executive MBA / 1-Year MBA / Masters in Management (MiM) topics, plus the entrance ecosystem that feeds them (CAT, XAT, NMAT, SNAP, CMAT, GMAT, MAT, IIFT, MICAT, MAH-CET).
- DO NOT write about B.Tech, M.Tech, BE, ME, BCA, MCA, B.Sc, M.Sc, engineering, medical, law, design, coding bootcamps, data-science certifications, school-level boards or any non-management discipline. If the working title is ambiguous, interpret it through the MBA / MiM lens.
- Recruiters, salaries, fees, specializations and example colleges referenced must all be management-program-specific.

# FRESHNESS & MACHINE-READABLE CITATIONS
- Today is ${todayIso}. Active admission cycle: ${currentYear}-${currentYear + 1}. Placement reference: ${currentYear - 1}-${currentYear}.
- For EVERY key stat (cutoff, fee, package, percentile band, ranking) append a machine-readable inline citation marker in this EXACT shape: [src:<Source> <Year>]. Examples: [src:NIRF ${currentYear}], [src:CAT Notification ${currentYear}], [src:Placement Report ${currentYear - 1}-${String(currentYear).slice(-2)}]. Our frontend converts these markers into clickable "view source" pills — the syntax must be exact (square brackets, "src:" prefix, no quotes, no URLs).
- End the article with a small italic line: <p><em>Last updated: ${todayIso}</em></p>.

# OUTPUT FORMAT
- Valid HTML using only these tags: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>. Do NOT include <html>, <head>, <body>, <h1>, or markdown fences. NO inline style="", NO <font>, NO class/id attributes — plain semantic HTML only so typography stays uniform.

# CRITICAL OUTPUT HYGIENE
- NEVER write the literal characters "\\n", "\n", "/n", "\\t" or any visible escape sequence inside any field. Use real <p>, <br>, <li> tags or actual line breaks — the frontend renders "\\n" as raw text and breaks the page.
- Do NOT wrap output in markdown code fences. Return clean JSON via the tool call.

# DEEP-RESEARCH MODE (RESEARCH-FIRST)
- Before writing each section, mentally verify facts against the most authoritative public sources (NIRF, official school placement reports, exam-conducting body notifications, AICTE/NAAC). Every paragraph must add concrete data, named recruiters/colleges, real numbers or specific dates — never shallow filler.`;

    const userPrompt = `Write a complete, ready-to-publish, advanced SEO blog article that can rank on page 1 of Google for "${targetKw}" in India.

# BRIEF
- Working title: ${brief.title}
- Primary target keyword: "${targetKw}"
- Secondary keywords: ${secKws.length ? secKws.map(k => `"${k}"`).join(", ") : "(derive 8-12 high-intent secondary + LSI keywords yourself based ONLY on this specific topic — never reuse generic MBA terms unrelated to the topic)"}
- Category: ${brief.category || "news"}
- Date context: ${dateCtx}

# TOPIC-SPECIFIC SEO LOCK (CRITICAL — NON-NEGOTIABLE — UNIQUE PER BLOG)
This article is about "${brief.title}". EVERY keyword, internal link, external reference, anchor text, recruiter name, college mention, exam reference, statistic and example MUST be 100% specific to THIS exact topic. Generic MBA filler that could apply to any other blog is FORBIDDEN — it will be rejected.

Rules of uniqueness (apply ruthlessly):
- Derive the keyword set, internal-link set and citation set FROM the title "${brief.title}" itself. Do NOT reuse a generic "MBA blog" template.
- If the topic is "IIM Ahmedabad Placement Report ${currentYear}" → keywords, recruiters, packages, internal links, anchor text, citations MUST all reference IIM Ahmedabad specifically (PGP, ABM, FABM, IIM-A campus, IIM-A recruiters, IIM-A median package, IIM-A summer placements). DO NOT mention IIM Bangalore/Calcutta/Lucknow data unless drawing a direct named comparison.
- If the topic is "IIM Calcutta Placement Report" → use ONLY IIM-C-specific MBAex/PGP/PGDBA data, IIM-C recruiters, IIM-C Joka campus references. Never copy the IIM-A roster.
- If the topic is "CAT ${currentYear} Syllabus" → CAT-specific only (CAT VARC, CAT QA, CAT DILR, CAT exam pattern, CAT mock tests). Do NOT pad with XAT/NMAT/SNAP except for one explicit contrast paragraph.
- If the topic is a city/region (e.g. "MBA in Bangalore") → use Bangalore-specific colleges, recruiters, fees, ROI. No Delhi/Mumbai padding.
- If the topic is an exam (NMAT/XAT/SNAP/CMAT/IIFT) → use ONLY that exam's pattern, cutoffs, accepting institutes, prep strategy. Never bleed across exams.

# UNIQUENESS CONTRACT — TWO DIFFERENT BLOGS, ZERO OVERLAP
Two blogs on different topics from this platform must NEVER share:
- the same keyword set (keywords[] must be derived 100% from this title)
- the same internal-link list (links must point to entities named in this article)
- the same recruiter/college roster (only entities relevant to THIS topic)
- the same external citation sources (cite the authoritative source FOR THIS topic)
Treat the title as a hard scope-fence. If a fact does not belong to the topic, leave it out.

# INTERNAL LINKS — DERIVE 6-10 FROM THIS TOPIC ONLY (NOT A FIXED LIST)
Build 6-10 contextual internal links by INFERRING the most relevant URLs on mbacompass.in for THIS exact topic. Every internal link must mention an entity actually discussed in the surrounding paragraph. Use these URL patterns:
- College pages: <a href="/college/<college-slug>"> (e.g. /college/iim-ahmedabad, /college/xlri-jamshedpur) — only colleges named in THIS article
- Exam pages: <a href="/exams/<exam-slug>"> (e.g. /exams/cat, /exams/xat, /exams/nmat, /exams/snap, /exams/iift, /exams/cmat, /exams/mat, /exams/micat) — only exams relevant to THIS topic
- City pages: <a href="/colleges-in/<city-slug>"> (e.g. /colleges-in/bangalore, /colleges-in/mumbai) — only if the topic is geographic
- Category pages: <a href="/category/<slug>"> (e.g. /category/placements, /category/exam-tips) — choose the category that fits THIS topic
- Coaching: <a href="/coaching/<institute-slug>"> or <a href="/coaching"> — only if coaching is contextually relevant
- Tools: /profile-analyzer, /mba-roi-calculator, /college-shortlister, /mba-compass, /mocks — pick only the tool that helps the reader of THIS topic
- Related blogs: <a href="/blog/<related-topic-slug>"> — invent 2-3 closely related blog slugs derived from THIS title only
Anchor text MUST be descriptive and keyword-rich, varying per link, never "click here" or "read more". Each link must be CONTEXTUALLY relevant to the surrounding sentence — never bolt-on. Do NOT reuse the same set of links across different articles.

# EXTERNAL LINKS — STRICTLY FORBIDDEN
- DO NOT output any external <a href="http..."> or <a href="https..."> links anywhere in the article. ZERO outbound links.
- DO NOT output bare URLs (no "https://...", no "www....") inside paragraphs, tables, lists, citations or FAQs.
- The ONLY allowed <a href="..."> values are RELATIVE internal URLs that start with "/" on mbacompass.in (e.g. /college/iim-ahmedabad, /exams/cat, /blog/...).
- Authoritative sources must be mentioned as PLAIN TEXT only when genuinely known (e.g. "NIRF ${currentYear} Management Rankings", "IIM Ahmedabad official placement report ${currentYear - 1}-${String(currentYear).slice(-2)}") — never as clickable links, never with URLs, and never as fake [src:...] markers.
- Any external link found in your output will be stripped and the article rejected. Internal-only linking, always.


# HARD RULES — WORD COUNT & SECTION DEPTH (NON-NEGOTIABLE)
1. **WORD COUNT: ${wmin}-${wmax} words minimum** in (intro + content) plain text. Articles below ${wmin} words will be REJECTED. Count as you write; expand body sections rather than truncating. Never stop early. Long-form 5,000-10,000+ word articles are fully supported — write the full requested length.
2. **Section depth — EVERY <h2> section MUST be ${minWordsPerSection}-700 words** of detailed, substantive content. ONE-LINER ANSWERS ARE STRICTLY FORBIDDEN. NO section may be just 1-3 short sentences, a single short paragraph, or a "summary-style" reply. Every <h2> section must include ALL of:
   - A direct-answer opening paragraph (40-70 words, max 3 sentences) that names the topic entity and gives the safest confirmed answer; use ranges/windows/TBA for unverified high-risk data
   - 2-4 short supporting paragraphs (EACH 2-3 sentences, MAX 60 words). If a thought would run longer, SPLIT it into two paragraphs OR convert it to a list/table. Walls of text are REJECTED.
   - At least one bullet or numbered list (5+ items, each item a full crisp sentence — NOT a 2-word fragment)
   - At least one concrete example, named entity, recruiter, college, package range, exam window, or data point specific to "${targetKw}"
   - Either a comparison <table> with 5+ rows of safe ${currentYear} figures/ranges OR a numbered step-by-step checklist
   - 1-2 contextual internal links anchored to topic-relevant entities
   - At least one <h3> subsection (60-150 words) drilling into a sub-angle (eligibility, fees, cutoffs, recruiters, timeline, alternatives, mistakes, expert tips, etc.)
   - A short closing takeaway sentence; you may bold ONLY a 2-4 word fragment of it with <strong>. NEVER wrap the whole sentence in <strong>.
3. **Keyword usage — HIT THE TARGET DENSITY**: primary keyword "${targetKw}" MUST appear EXACTLY ${targetOccurrences} times (±10%) across the full article to hit ~${density}% density over ${targetWords} words. This is a HARD requirement set by the editor — do NOT under-deliver. Place exact-match in title, H1, slug, meta title, meta description, first 100 words, every H2 cluster (~once per 200-300 words of body), and the conclusion. Distribute evenly across sections — never cluster all occurrences in one paragraph. Also weave 20-30 LSI/semantic variants for natural readability, but those are IN ADDITION to the ${targetOccurrences} exact-match occurrences, not a substitute. Count as you write.
4. **MANDATORY OPENING — TL;DR SUMMARY**: First element of "intro" MUST be <p><strong>Summary:</strong> ...</p> giving a 60-90 word direct answer specific to "${brief.title}".
5. **NEVER START WITH A QUESTION**. All H2s and paragraph openers must be declarative (FAQ section excepted).
6. **HUMAN MENTOR VOICE — 8th-grade English, conversational, NOT AI**. Write like a real senior advising a junior over coffee. Use contractions (you're, don't, it's, you'll). Vary sentence length and structure — never start 3 sentences in a row the same way. Use natural mentor openers like "Here's the thing —", "Quick reality check:", "If you're in this boat,", "Most students get this wrong because…", "A simple way to think about it —". Address the reader as "you". Drop a personal aside or worked mini-example every 2-3 sections.
   BANNED phrases (zero tolerance, will trigger rejection): "delve", "delve into", "navigate", "navigating", "landscape", "unlock", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving", "in today's fast-paced world", "it's worth noting", "look no further", "furthermore", "moreover", "dive into", "stay tuned", "unleash", "harness the power", "game-changer", "cutting-edge", "world-class", "robust", "leverage", "synergy", "paradigm", "seamless", "holistic", "in conclusion", "to sum up", "as we all know", "needless to say", "tapestry", "testament", "in essence", "at the end of the day", "when it comes to", "plays a pivotal role", "plays a crucial role", "in the world of", "a myriad of", "plethora", "first and foremost", "it is important to note", "it is worth mentioning", "in summary", "to conclude", "remember that", "rest assured".
7. **STRICT PARAGRAPH LIMIT — MOBILE-FIRST**: Every <p> MUST be 2-3 sentences MAX and UNDER 60 words. NO exceptions. If a paragraph would run longer:
   - Split it into two short paragraphs, OR
   - Convert it into a <ul>, <ol>, or <table>.
   Walls of text (4+ sentence paragraphs, 70+ word paragraphs) are STRICTLY FORBIDDEN and will be rejected. Whenever you'd list 3+ items, comparisons, steps, factors, pros/cons, features, or examples → use a list or table instead of prose. **At least 5 HTML <table> blocks** (each 5+ rows of safe ${currentYear} data/ranges specific to this topic — fees, packages, cutoff bands, year-on-year trends, recruiter-wise hiring, sectoral splits, comparison vs peers, etc.). **At least 6 bullet/numbered lists** across the article. The finished article must be fully scannable on a phone — H2 → H3 → bold lead → list/table, with prose only as connective tissue.
8. **STRUCTURE — REQUIRED ORDER**:
   a. Summary <p>
   b. 2-3 paragraph hook stating problem + answer + who this guide is for (all specific to THIS topic)
   c. **${targetH2}+ <h2> sections** (each ${minWordsPerSection}-700 words, 1-2 <h3> subsections). Cover the full entity graph of THIS topic — eligibility, process, timelines, fees, ROI, comparisons, recruiters, alumni outcomes, common mistakes, expert tips, year-on-year trends, regional/segment breakdowns, alternatives. Every section must be deep — NO shallow stubs, NO one-line answers.
   d. <h2>Takeaways</h2> — 8-10 bullets, each starting with a SHORT topic-noun <strong>lead</strong> (e.g. <strong>Fee gap</strong>, <strong>Cutoff trend</strong>, <strong>Median CTC</strong>) followed by 1-2 full sentences (15-30 words each). NEVER use generic labels like "Key:", "Highlight:", "Important:", "Note:", "Pro Tip:", "Bold lead:", or the heading "Key Takeaways".
    e. <h2>Frequently Asked Questions</h2> — **10-15 Q&A pairs**. Question in <h3> ending with "?"; Answer in ${minWordsPerFaq}-220 words across 2-3 <p> blocks PLUS at least one of {bullet list (4+ items), mini <table>, or numbered steps}. ONE-LINE FAQ ANSWERS ARE FORBIDDEN. Each answer should give safe figures/ranges/windows, named entities and a contextual internal link where relevant. Questions MUST mirror real People-Also-Ask queries for THIS specific topic.
   f. Final CTA paragraph with 2-3 topic-relevant internal links
9. **ADVANCED ON-PAGE SEO**:
   - Primary keyword in: title, H1, slug, meta title, meta description, excerpt, first 100 words, and last paragraph. Vary H2 headings with synonyms — do not stuff the exact keyword into multiple headings.
   - **Semantic SEO**: cover the topic's full entity graph specific to THIS subject only.
   - **LSI/NLP keywords**: 20-30 semantically related terms derived from THIS topic.
   - **External authority mentions** (plain text, no fabricated URLs): cite the AUTHORITATIVE sources for THIS specific topic (e.g. for IIM-A placement → IIM Ahmedabad official PR ${currentYear - 1}-${String(currentYear).slice(-2)}; for CAT → IIM-conducting-institute CAT ${currentYear} notification; for NIRF data → NIRF ${currentYear}).
   - **Featured-snippet bait**: ≥2 direct-answer <p> right under an <h2>, ≥1 numbered <ol> step-by-step list, ≥2 comparison <table>.
    - **E-E-A-T signals**: mention specific authoritative source names when genuinely known; name REAL recruiters & B-schools relevant to THIS topic only.
    - <strong> on 12-20 SHORT high-value fragments only (data points, numbers, named entities, 2-4 word lead phrases). Each <strong> ≤ 12 words. NEVER bold full sentences, paragraphs, list items, table cells, or headings. <em> sparingly.
    - ABSOLUTELY NO IMAGES: do NOT emit any <img>, <picture>, <figure>, <svg>, image URLs, or "Image:" / "Infographic:" placeholders. The blog is strictly text-only.
10. **FORMATTING POLISH**: Bold ONLY a 2-4 word lead of important paragraphs (not the whole paragraph). <h2> 4-9 words, benefit-driven. No ALL-CAPS.
11. Real, current Indian MBA ecosystem data: CAT ${currentYear} windows, NIRF ${currentYear} bands/rankings only if known, ${currentYear - 1}-${String(currentYear).slice(-2)} placement ranges. Use only figures relevant to THIS topic.
12. NEVER fabricate implausible numbers. Realistic ${currentYear - 1}-${currentYear} ranges only.
13. NO <h1> — title rendered separately.

# OUTPUT FORMAT (return JSON via the tool call)
- title: refined title (≤ 65 chars), MUST contain primary keyword + a power word (best, complete, ${currentYear}, guide, ultimate). MUST NOT end with "?".
- slug: URL slug, lowercase-hyphenated (≤ 70 chars), MUST contain primary keyword.
- metaTitle: ≤ 60 chars, primary keyword near front, ends with "| MBA Compass" if it fits, no "?".
- metaDescription: 145-160 chars, primary keyword in first 120 chars, declarative.
- excerpt: 1-2 sentences, plain text, 160-220 chars, declarative, contains primary keyword.
- intro: opening HTML — Summary <p> first, then 2-3 hook paragraphs. No headings inside intro.
- content: FULL article body as HTML (everything AFTER the intro, no <h1>), including ${targetH2}+ deep H2 sections, a "Takeaways" H2 (never "Key Takeaways"), FAQ, final CTA. NEVER use AI-flavoured words: "Key", "Highlights", "At a Glance", "delve", "leverage", "seamless", "robust", "cutting-edge", "game-changer", "pivotal", "tapestry", "in the realm of", "moreover", "furthermore", "in conclusion".
- h1Tag: on-page H1 (declarative, ≤ 70 chars, contains primary keyword, no "?").
- keywords: array of **15-20 keywords** UNIQUE to this topic — primary keyword first, then 6-8 short-tail (2-3 words), then 8-12 long-tail (4+ words, question/intent-driven). NEVER generic MBA terms unrelated to "${targetKw}".
- primaryKeyword: echo "${targetKw}".
- wordCount: integer — your accurate count of (intro + content). MUST be ≥ ${wmin}.
- keywordOccurrences: integer — exact-match count of "${targetKw}".
- author: byline like "MBA Compass Editorial".`;

    const tool = {
      type: "function",
      function: {
        name: "publish_blog_article",
        description: "Return a fully-written SEO blog article matching the brief.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            slug: { type: "string" },
            metaTitle: { type: "string" },
            metaDescription: { type: "string" },
            excerpt: { type: "string" },
            intro: { type: "string" },
            content: { type: "string" },
            h1Tag: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            primaryKeyword: { type: "string" },
            wordCount: { type: "integer" },
            keywordOccurrences: { type: "integer" },
            author: { type: "string" },
          },
          required: [
            "title", "slug", "metaTitle", "metaDescription", "excerpt",
            "intro", "content", "h1Tag", "keywords", "primaryKeyword",
            "wordCount", "keywordOccurrences", "author",
          ],
          additionalProperties: false,
        },
      },
    };

    // Scale tokens with target word count. Cap at 32K to stay within edge wall-clock limits.
    const dynamicMaxTokens = Math.min(32000, Math.max(12000, Math.round(wmax * 3) + 3000));

    // Try full gpt-5 first; fall back to gpt-5-mini on timeout / 5xx so the user
    // doesn't see "Edge Function returned a non-2xx status code".
    const callModel = async (model: string) => callAIGateway({
        model,
        max_tokens: dynamicMaxTokens,
        messages: [
          { role: "system", content: systemPrompt + MBA_COMPASS_SECTION_RULES },

          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "publish_blog_article" } },
      }, { feature: "ai-blog-writer" });

    let aiRes: Response;
    try {
      aiRes = await callModel("openai/gpt-5");
      if (!aiRes.ok && aiRes.status >= 500) {
        console.warn("gpt-5 returned", aiRes.status, "— falling back to gpt-5-mini");
        aiRes = await callModel("openai/gpt-5-mini");
      }
    } catch (e) {
      console.warn("gpt-5 threw, falling back to gpt-5-mini:", e);
      aiRes = await callModel("openai/gpt-5-mini");
    }

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
          error: "AI did not return a structured article",
          detail: message?.content?.slice(0, 300) || "no content returned",
          finish_reason: aiJson?.choices?.[0]?.finish_reason,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let article: any;
    try {
      article = JSON.parse(rawArgs);
    } catch (e) {
      console.error("Parse fail. Length:", rawArgs.length, "Tail:", rawArgs.slice(-300));
      return new Response(
        JSON.stringify({ error: "AI output was truncated or malformed JSON. Try again or reduce word count.", detail: String(e).slice(0, 200) }),
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
    for (const k of ["intro", "content"]) {
      if (typeof article[k] === "string") article[k] = stripEscapeArtifacts(article[k]);
    }

    // Best-effort sanitisation
    const slug = String(article.slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    // Compute actual density on server side as a quality metric
    const plain = `${article.intro || ""} ${article.content || ""}`.replace(/<[^>]*>/g, " ");
    const { words: actualWords, occurrences: actualOccurrences, density: actualDensity } = computeDensity(plain, targetKw);

    // ── EXPANSION LOOP: up to 5 passes to reach the word target for long-form articles (10K+ supported).
    let currentWords = actualWords;
    for (let pass = 1; pass <= 2 && currentWords < wmin && currentWords > 200; pass++) {
      const wordsNeeded = wmin - currentWords + 300;
      console.log(`Expansion pass ${pass}: ${currentWords} < ${wmin}, asking for +${wordsNeeded} words`);
      try {
        const expandRes = await callAIGateway({
          model: "openai/gpt-5-mini",
          max_tokens: Math.min(32000, Math.max(10000, Math.round(wmax * 3) + 3000)),
          messages: [
            { role: "system", content: systemPrompt + MBA_COMPASS_SECTION_RULES },

            { role: "user", content: `The current draft is ${currentWords} words but the brief requires ${wmin}-${wmax}. Expand it by adding ${wordsNeeded}+ words of NEW substance specific to "${targetKw}": 3-5 NEW <h2> sections (each ${minWordsPerSection}-500 words) covering angles not yet discussed (e.g. year-on-year trends specific to this topic, common mistakes specific to this topic, alumni stories, ROI math, regional breakdown, expert tips, alternatives, deep comparison tables) plus 3-4 additional FAQ Q&A. Every new section MUST contain topic-specific data, named entities, examples, and at least one new internal link relevant to "${targetKw}" only. Return the COMPLETE merged article (intro + content) re-rendered with new sections woven into logical places — do not just append at the end. Maintain ALL hard rules: ${density}% density, declarative headings, real ${currentYear} data, no banned phrases, no generic MBA filler unrelated to this topic.\n\nCURRENT INTRO:\n${article.intro}\n\nCURRENT CONTENT:\n${article.content}` },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: "publish_blog_article" } },
        }, { feature: "ai-blog-writer-expand" });
        if (!expandRes.ok) { console.warn(`Expand pass ${pass} HTTP ${expandRes.status}`); break; }
        const ej = await expandRes.json();
        const ea = ej?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!ea) break;
        const expanded = JSON.parse(ea);
        for (const k of ["intro", "content"]) {
          if (typeof expanded[k] === "string") expanded[k] = stripEscapeArtifacts(expanded[k]);
        }
        const expPlain = `${expanded.intro || ""} ${expanded.content || ""}`.replace(/<[^>]*>/g, " ");
        const expWords = expPlain.split(/\s+/).filter(Boolean).length;
        if (expWords > currentWords) {
          article = { ...article, ...expanded };
          currentWords = expWords;
        } else {
          break; // no progress — stop
        }
      } catch (e) {
        console.error(`Expansion pass ${pass} failed (non-fatal):`, e);
        break;
      }
    }

    // ── Strip any external links / bare URLs the model may have leaked in.
    // Keep ONLY relative <a href="/..."> internal links. Bare http(s)://… and www.… are removed.
    const stripExternalLinks = (html: string) => {
      if (!html) return html;
      let out = html;
      // Unwrap <a href="http..."> / <a href="//..."> / <a href="mailto:..."> / <a href="www...">
      out = out.replace(
        /<a\b[^>]*\bhref\s*=\s*["'](?:https?:\/\/|\/\/|mailto:|tel:|www\.)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
        "$1"
      );
      // Remove bare URLs in text (http://, https://, www.)
      out = out.replace(/\bhttps?:\/\/[^\s<>"')]+/gi, "");
      out = out.replace(/\bwww\.[^\s<>"')]+/gi, "");
      // Collapse any double-spaces left behind
      out = out.replace(/[ \t]{2,}/g, " ");
      return out;
    };
    article.intro = stripExternalLinks(article.intro || "");
    article.content = stripExternalLinks(article.content || "");
    // ── DENSITY BOOST: if keyword count is well below target, ask the model to weave more in.
    {
      const postPlain = `${article.intro || ""} ${article.content || ""}`.replace(/<[^>]*>/g, " ");
      const postStats = computeDensity(postPlain, targetKw);
      const minAcceptable = Math.max(3, Math.floor(targetOccurrences * 0.8));
      if (postStats.occurrences < minAcceptable) {
        const need = targetOccurrences - postStats.occurrences;
        console.log(`Density boost: ${postStats.occurrences} occurrences (${postStats.density}%) < ${minAcceptable}, need +${need}`);
        try {
          const boostRes = await callAIGateway({
            model: "openai/gpt-5-mini",
            max_tokens: Math.min(32000, Math.max(10000, Math.round(wmax * 3) + 3000)),
            messages: [
              { role: "system", content: systemPrompt + MBA_COMPASS_SECTION_RULES },
              { role: "user", content: `The current draft uses the exact phrase "${targetKw}" only ${postStats.occurrences} times (~${postStats.density}% density). The editor requires ~${targetOccurrences} exact-match occurrences (~${density}% density). Rewrite the article to naturally include the phrase "${targetKw}" approximately ${need} MORE times, distributed evenly across the body (roughly once per 200-300 words). Replace some pronouns ("it", "this programme", "the course") and generic noun phrases ("the programme", "this exam") with the exact phrase "${targetKw}" where it reads naturally. Do NOT shorten the article. Do NOT remove sections, FAQs, tables, or internal links. Keep the same intro/H1/title/meta/slug/keywords. Return the COMPLETE article with intro and content updated.\n\nCURRENT INTRO:\n${article.intro}\n\nCURRENT CONTENT:\n${article.content}` },
            ],
            tools: [tool],
            tool_choice: { type: "function", function: { name: "publish_blog_article" } },
          }, { feature: "ai-blog-writer-density-boost" });
          if (boostRes.ok) {
            const bj = await boostRes.json();
            const ba = bj?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
            if (ba) {
              const boosted = JSON.parse(ba);
              for (const k of ["intro", "content"]) {
                if (typeof boosted[k] === "string") boosted[k] = stripEscapeArtifacts(boosted[k]);
              }
              const bPlain = `${boosted.intro || ""} ${boosted.content || ""}`.replace(/<[^>]*>/g, " ");
              const bStats = computeDensity(bPlain, targetKw);
              // Only accept if it actually improved AND didn't shrink content meaningfully.
              const bWords = bPlain.split(/\s+/).filter(Boolean).length;
              if (bStats.occurrences > postStats.occurrences && bWords >= postStats.words * 0.9) {
                article.intro = boosted.intro || article.intro;
                article.content = boosted.content || article.content;
                console.log(`Density boost OK: ${postStats.occurrences} → ${bStats.occurrences} occurrences (${bStats.density}%)`);
              } else {
                console.log(`Density boost rejected (no improvement or shrank): ${bStats.occurrences} occurrences, ${bWords} words`);
              }
            }
          }
        } catch (e) {
          console.error("Density boost failed (non-fatal):", e);
        }
      }
    }

    // Final quality check — auto-sanitise buzzwords, inject MBA Compass if missing, flag issues
    {
      const introQC = runFinalQualityCheck(article.intro, { requireMbaCompass: false, minInternalLinks: 0 });
      const contentQC = runFinalQualityCheck(article.content, { requireMbaCompass: true, requireFaq: true, requireTable: true, minInternalLinks: 8 });
      const blockingFactIssues = getBlockingFactIssues([...introQC.issues, ...contentQC.issues]);
      if (blockingFactIssues.length) {
        throw new Error(`Fact-check blocked publishing: ${blockingFactIssues.map((i) => i.message).join(" | ")}`);
      }
      article.intro = introQC.html;
      article.content = contentQC.html;
      if (contentQC.issues.length) {
        console.log(`[ai-blog-writer] QC issues for "${targetKw}":`, contentQC.issues.map(i => `${i.code}:${i.message}`).join(" | "));
      }
    }

    // Recompute final stats after possible expansion
    const finalPlain = `${article.intro || ""} ${article.content || ""}`.replace(/<[^>]*>/g, " ");
    const { words: finalWords, occurrences: finalOccurrences, density: finalDensity } = computeDensity(finalPlain, targetKw);


    // ── Auto-extract FAQs from the FAQ section so the article snapshot can carry FAQ schema ──
    const extractFaqs = (html: string) => {
      if (!html) return [];
      const re2 = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
      const out: { question: string; answer: string }[] = [];
      let m: RegExpExecArray | null;
      while ((m = re2.exec(html))) {
        const q = m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const a = m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        if (q && a && (q.endsWith("?") || /^(what|why|how|is|are|can|should|do|does|when|where|which|who)\b/i.test(q)) && a.length >= 20) {
          out.push({ question: q, answer: a });
        }
      }
      const seen = new Set<string>();
      return out.filter((f) => {
        const k = f.question.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).slice(0, 8);
    };
    const extractedFaqs = extractFaqs(article.content || "");

    const baseSlug = slug || String(brief.slug || targetKw)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    let finalSlug = baseSlug;
    const { data: existingSlug } = await adminClient
      .from("articles")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();
    if (existingSlug?.id) finalSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

    const insertPayload = {
      title: article.title || brief.title,
      slug: finalSlug,
      excerpt: article.excerpt || "",
      intro: article.intro || "",
      content: article.content || "",
      meta_title: article.metaTitle || brief.metaTitle || String(article.title || brief.title).slice(0, 60),
      meta_description: article.metaDescription || brief.metaDescription || String(article.excerpt || "").slice(0, 160),
      keywords: Array.isArray(article.keywords) ? article.keywords : [],
      primary_keyword: targetKw,
      h1_tag: article.h1Tag || article.title || brief.title,
      author: article.author || "MBA Compass Editorial",
      category: brief.category || "news",
      status: "published",
      published: true,
      featured: false,
      priority: 0,
      faqs: extractedFaqs,
      last_seo_refresh: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await adminClient
      .from("articles")
      .insert(insertPayload)
      .select("id, slug")
      .single();
    if (insertError) throw insertError;

    if (extractedFaqs.length > 0 && inserted?.id) {
      try {
        const faqSchema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: extractedFaqs.map((f: any) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        };
        const snapshotKey = `seo_page__article__${inserted.id}`;
        const pagePath = `/article/${inserted.slug}`;
        await adminClient.from("site_settings").upsert({
          key: snapshotKey,
          value: {
            contentType: "article",
            recordId: inserted.id,
            slug: inserted.slug,
            pagePath,
            canonicalUrl: pagePath,
            faqs: extractedFaqs,
            schemaMarkup: [faqSchema],
            generatedAt: new Date().toISOString(),
          },
        }, { onConflict: "key" });
      } catch (faqError) {
        console.warn("FAQ schema snapshot failed (non-fatal):", faqError);
      }
    }

    const finalStats = {
      targetWordsRange: [wmin, wmax],
      actualWords: finalWords,
      targetDensityPct: density,
      actualDensityPct: finalDensity,
      actualOccurrences: finalOccurrences,
      targetOccurrences,
      expanded: finalWords > actualWords,
      firstPassWords: actualWords,
      insertedId: inserted.id,
    };

    if (activeJobId) {
      await adminClient.from("ai_blog_generation_jobs").update({
        status: "completed",
        progress: 100,
        current_step: "Article saved successfully",
        article_id: inserted.id,
        stats: finalStats,
        finished_at: new Date().toISOString(),
      }).eq("id", activeJobId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        insertedId: inserted.id,
        slug: inserted.slug,
        faqCount: extractedFaqs.length,
        stats: finalStats,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-blog-writer error:", e);
    if (activeJobId && adminForError) {
      await adminForError.from("ai_blog_generation_jobs").update({
        status: "failed",
        progress: 100,
        current_step: "Generation failed",
        error_message: e instanceof Error ? e.message.slice(0, 1000) : String(e).slice(0, 1000),
        finished_at: new Date().toISOString(),
      }).eq("id", activeJobId);
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
