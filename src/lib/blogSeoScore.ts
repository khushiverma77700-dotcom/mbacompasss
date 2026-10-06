// Deterministic (code-measured) parts of the blog SEO / quality analysis.

export interface BoundaryInput {
  mustInclude: string[];
  canInclude: string[];
  mustNotInclude: string[];
  allowedEntities: string[];
}

export const BANNED_PHRASES = [
  "in today's competitive landscape", "in today's fast-paced world", "it is important to note",
  "it's important to note", "it is worth noting", "let's dive in", "dive into", "deep dive", "delve",
  "in conclusion", "to sum up", "summary", "key", "quick snapshot", "snapshot", "key takeaways",
  "key highlights", "unlock", "comprehensive guide", "whether you are", "whether you're",
  "landscape", "navigate the", "game-changer", "cutting-edge", "world-class", "robust", "leverage",
  "seamless", "tapestry", "plays a pivotal role", "plays a crucial role", "a myriad of", "plethora",
  "moreover", "furthermore", "needless to say", "rest assured", "embark on", "ever-evolving",
];

// Institutions that commonly get padded into MBA articles.
const KNOWN_ENTITIES = [
  "XLRI", "SPJIMR", "MDI", "NMIMS", "IIFT", "SIBM", "FMS", "JBIMS", "IMT", "TAPMI", "Great Lakes",
  "IRMA", "ISB", "XIMB", "KJ Somaiya", "Welingkar", "IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta",
  "IIM Lucknow", "IIM Kozhikode", "IIM Indore", "IIM Shillong", "IIM Rohtak", "IIM Ranchi", "IIM Raipur",
  "IIM Trichy", "IIM Tiruchirappalli", "IIM Udaipur", "IIM Kashipur", "IIM Nagpur", "IIM Visakhapatnam",
  "IIM Bodh Gaya", "IIM Amritsar", "IIM Sambalpur", "IIM Sirmaur", "IIM Jammu", "IIM Mumbai",
  "CAT", "XAT", "NMAT", "SNAP", "CMAT", "MAT", "GMAT", "MICAT", "IIFT exam",
];

const plain = (html: string) => String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function analyzeBlogDeterministic(a: {
  title: string; h1?: string; slug?: string; metaTitle?: string; metaDescription?: string;
  keyword: string; intro: string; content: string; targetDensity: number; boundary: BoundaryInput | null;
}) {
  const html = `${a.intro}\n${a.content}`;
  const text = plain(html);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const kw = (a.keyword || "").trim().toLowerCase();
  const kwWords = Math.max(1, kw.split(/\s+/).length);
  const kwRe = kw ? new RegExp(`\\b${esc(kw).replace(/\s+/g, "\\s+")}s?\\b`, "gi") : null;
  const occurrences = kwRe ? (text.match(kwRe) || []).length : 0;
  const actual = wordCount ? Math.round(((occurrences * kwWords) / wordCount) * 10000) / 100 : 0;
  const target = a.targetDensity || 1;
  const densityStatus = actual < target * 0.6 ? "Too Low" : actual > Math.max(target * 1.4, 3) ? "Too High" : "Good";

  const h2 = (a.content.match(/<h2\b/gi) || []).length + (a.intro.match(/<h2\b/gi) || []).length;
  const h3 = (html.match(/<h3\b/gi) || []).length;
  const internalLinks = (html.match(/<a\s[^>]*href="\/[^"]*"/gi) || []).length;
  const tables = (html.match(/<table\b/gi) || []).length;
  const hasFaq = /<h2[^>]*>[^<]*(faq|frequently asked)/i.test(html);
  const lists = (html.match(/<(?:ul|ol)\b/gi) || []).length;
  const hasImportantPoints = /<h2[^>]*>[^<]*important\s+(?:points?|things?|facts?|details?)/i.test(html);
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgsNoAlt = imgs.filter((i) => !/\balt="[^"]+"/i.test(i)).length;
  const sourceMentions = (text.match(/\b(official|as per|according to|notification|placement report|NIRF)\b/gi) || []).length;
  const first100 = words.slice(0, 100).join(" ").toLowerCase();
  const has = (s?: string) => !!kw && (s || "").toLowerCase().includes(kw);
  const mt = (a.metaTitle || "").length;
  const md = (a.metaDescription || "").length;
  const slugWords = (a.slug || "").split("-").filter(Boolean).length;

  const lower = text.toLowerCase();
  const bannedFound = BANNED_PHRASES.filter((p) => new RegExp(`\\b${esc(p)}\\b`, "i").test(lower));

  // Repetition: identical sentences or sentence openers repeated.
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 30);
  const seen = new Map<string, number>();
  sentences.forEach((s) => seen.set(s, (seen.get(s) || 0) + 1));
  const repeated = [...seen.values()].filter((n) => n > 1).length;
  const openers = new Map<string, number>();
  sentences.forEach((s) => { const o = s.split(/\s+/).slice(0, 3).join(" "); openers.set(o, (openers.get(o) || 0) + 1); });
  const overusedOpeners = [...openers.entries()].filter(([, n]) => n >= 4).map(([o]) => o);

  // Off-topic entities: known names that appear but are not allowed by the boundary.
  let offTopicEntities: string[] = [];
  if (a.boundary) {
    const allowedBlob = `${a.boundary.allowedEntities.join(" ")} ${a.boundary.mustInclude.join(" ")} ${a.boundary.canInclude.join(" ")} ${a.title} ${a.keyword}`.toLowerCase();
    const banned = a.boundary.mustNotInclude.map((s) => s.toLowerCase());
    offTopicEntities = KNOWN_ENTITIES.filter((e) => {
      if (!new RegExp(`\\b${esc(e)}\\b`).test(text)) return false;
      const el = e.toLowerCase();
      if (banned.some((b) => b.includes(el))) return true;
      if (a.boundary!.allowedEntities.length === 0) return false;
      return !allowedBlob.includes(el);
    });
  }

  const sc = (ok: boolean, partial = false) => (ok ? 100 : partial ? 60 : 25);
  const seoParts = [
    { label: "Keyword optimization", score: sc(has(a.title) && first100.includes(kw) && has(a.metaTitle), has(a.title) || first100.includes(kw)) },
    { label: "Keyword density", score: densityStatus === "Good" ? 100 : 50 },
    { label: "Title optimization", score: sc(has(a.title) && a.title.length >= 30 && a.title.length <= 70, has(a.title)) },
    { label: "Meta title", score: sc(mt >= 30 && mt <= 60 && has(a.metaTitle), mt > 0 && mt <= 65) },
    { label: "Meta description", score: sc(md >= 140 && md <= 160 && has(a.metaDescription), md >= 110 && md <= 170) },
    { label: "Heading structure", score: sc(h2 >= 3 && !/<h1\b/i.test(html), h2 >= 2) },
    { label: "Content depth", score: sc(wordCount >= 600, wordCount >= 350) },
    { label: "Internal linking", score: sc(internalLinks >= 3, internalLinks >= 1) },
    { label: "External references", score: sc(sourceMentions >= 2, sourceMentions >= 1) },
    { label: "FAQ optimization", score: sc(hasFaq, true) },
    { label: "Image alt text", score: imgsNoAlt ? 40 : 100 },
    { label: "URL slug", score: sc(slugWords >= 2 && slugWords <= 6 && (a.slug || "").includes(kw.split(/\s+/)[0] || "~"), slugWords > 0) },
  ];

  type Issue = { id: string; title: string; detail: string; category: string; severity: string; safeToAutoFix: boolean };
  const issues: Issue[] = [];
  const add = (id: string, title: string, detail: string, category = "seo", severity = "medium", safe = true) =>
    issues.push({ id, title, detail, category, severity, safeToAutoFix: safe });
  if (densityStatus === "Too High") add("density-high", `Keyword density is ${actual}% (target ${target}%)`, `"${a.keyword}" appears ${occurrences} times. Replace some repeats with natural variations or pronouns.`, "seo", "high");
  if (densityStatus === "Too Low") add("density-low", `Keyword density is ${actual}% (target ${target}%)`, `Use "${a.keyword}" naturally in a heading and one or two more paragraphs — never forced.`);
  if (!first100.includes(kw)) add("kw-intro", "Primary keyword missing from the first 100 words", `Mention "${a.keyword}" naturally in the opening paragraph.`);
  if (mt > 60 || mt < 30) add("meta-title", `Meta title is ${mt} characters`, "Rewrite the meta title to 30-60 characters with the primary keyword near the start.");
  if (md > 160 || md < 140) add("meta-desc", `Meta description is ${md} characters`, "Rewrite the meta description to 140-160 characters with the primary keyword in the first 120 characters.");
  if (h2 < 3) add("headings", "Too few H2 sections", "Split the main content into clear H2 sections that follow the search intent.", "seo", "medium", false);
  if (tables < 1) add("table", "No useful table found", "Turn comparable facts into a concise table using only verified data.", "quality", "medium", false);
  if (lists < 1) add("pointers", "No pointer list found", "Add a focused bullet or numbered list where it improves scanning.", "quality", "medium", false);
  if (!hasImportantPoints) add("important-points", "Important Points section missing", "Add an Important Points section with concrete, source-supported decisions or facts.", "quality", "medium", false);
  if (!hasFaq) add("faq", "FAQ section missing", "Add genuine questions and direct answers for this exact topic.", "quality", "medium", false);
  if (internalLinks < 2) add("links", "Few internal links", "Use Internal Links to add relevant MBA Compass pages.", "seo", "low", false);
  if (imgsNoAlt) add("alt", `${imgsNoAlt} image(s) without alt text`, "Add a short description to every image.", "seo", "low");
  if (bannedFound.length) add("banned", "AI-sounding phrases found", `Remove or rephrase: ${bannedFound.slice(0, 10).join(", ")}.`, "humanization", "medium");
  if (repeated) add("repeat", `${repeated} sentence(s) repeated`, "Remove duplicated sentences.", "quality", "medium");
  if (overusedOpeners.length) add("openers", "Repetitive sentence openings", `Vary sentences that start with: ${overusedOpeners.slice(0, 5).join(" / ")}.`, "humanization", "low");
  if (offTopicEntities.length) add("offtopic", "Off-topic institutions mentioned", `Outside the topic boundary: ${offTopicEntities.join(", ")}. Remove these mentions.`, "quality", "high");
  if (/\b(xx|tbd|\[insert)/i.test(text)) add("placeholder", "Placeholder text found", "Replace placeholders with verified facts or remove them.", "accuracy", "high", false);
  if (/could not be written automatically/i.test(text)) add("fallback", "A section was not written", "One section could not be written from verified sources. Write it manually or add a reference link.", "quality", "high", false);

  const checklistBase = {
    keywordDensity: densityStatus === "Good",
    metaTitle: mt >= 30 && mt <= 60,
    metaDescription: md >= 140 && md <= 160,
    headings: h2 >= 2 && !/<h1\b/i.test(html),
    internalLinks: internalLinks >= 1,
    noRandomColleges: offTopicEntities.length === 0,
    noKeywordStuffing: densityStatus !== "Too High",
    noPlaceholders: !/\b(xx|tbd|\[insert)/i.test(text) && !/could not be written automatically/i.test(text),
    noAiPhrases: bannedFound.length === 0,
    faq: hasFaq,
    table: tables >= 1,
    pointers: lists >= 1,
    importantPoints: hasImportantPoints,
  };

  return {
    wordCount,
    density: { target, actual, occurrences, status: densityStatus },
    seoParts,
    issues,
    bannedFound,
    offTopicEntities,
    humanizationCap: bannedFound.length ? Math.max(40, 95 - bannedFound.length * 8) : 100,
    repetitionCap: repeated ? Math.max(40, 95 - repeated * 10) : 100,
    checklist: checklistBase,
    stats: { h2, h3, internalLinks, tables, lists, hasFaq, hasImportantPoints },
  };
}
