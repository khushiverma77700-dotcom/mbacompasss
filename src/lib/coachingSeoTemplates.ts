/**
 * Coaching SEO metadata templates.
 *
 * One source of truth for title / description / H1 / breadcrumbs / keywords
 * for every coaching hub URL:
 *   • /coaching                        → listing root
 *   • /coaching/exam/:slug             → exam hub (cat, xat, gmat, ...)
 *   • /coaching/mode/:slug             → mode hub (online, offline, weekend, ...)
 *   • /coaching/:region                → city / state hub
 *
 * Each template targets ONE primary keyword and (optionally) one secondary
 * keyword per the site-wide "one page, one primary keyword" SEO rule.
 */

export type Breadcrumb = { name: string; url: string };

export type CoachingSeoTemplate = {
  title: string;
  description: string;
  h1: string;
  primaryKeyword: string;
  secondaryKeyword?: string;
  keywords: string[];
  breadcrumbs: Breadcrumb[];
};

const YEAR = new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0); // roll to next season in H2

// ---------- Exam hubs ----------

type ExamMeta = {
  code: string;             // CAT
  full: string;             // Common Admission Test
  primary: string;          // "CAT coaching"
  secondary: string;        // "best CAT coaching in India"
  extras: string[];         // long-tail keyword pool
};

const EXAMS: Record<string, ExamMeta> = {
  cat: {
    code: "CAT",
    full: "Common Admission Test",
    primary: "CAT coaching",
    secondary: "best CAT coaching institutes in India",
    extras: [
      "CAT preparation classes",
      "CAT coaching fees",
      "CAT online coaching",
      "IIM CAT coaching",
      "CAT coaching near me",
      "top CAT coaching institutes",
    ],
  },
  xat: {
    code: "XAT",
    full: "Xavier Aptitude Test",
    primary: "XAT coaching",
    secondary: "best XAT coaching institutes",
    extras: [
      "XAT preparation classes",
      "XAT coaching fees",
      "XLRI XAT coaching",
      "XAT online coaching",
      "XAT decision making coaching",
    ],
  },
  gmat: {
    code: "GMAT",
    full: "Graduate Management Admission Test",
    primary: "GMAT coaching",
    secondary: "best GMAT coaching in India",
    extras: [
      "GMAT preparation classes",
      "GMAT online coaching",
      "GMAT Focus Edition coaching",
      "GMAT coaching fees",
      "GMAT verbal and quant coaching",
    ],
  },
  gre: {
    code: "GRE",
    full: "Graduate Record Examinations",
    primary: "GRE coaching",
    secondary: "best GRE coaching institutes in India",
    extras: [
      "GRE preparation classes",
      "GRE online coaching",
      "GRE verbal coaching",
      "GRE quant coaching",
      "GRE coaching fees",
    ],
  },
  snap: {
    code: "SNAP",
    full: "Symbiosis National Aptitude Test",
    primary: "SNAP coaching",
    secondary: "best SNAP coaching institutes",
    extras: [
      "SNAP preparation classes",
      "Symbiosis MBA coaching",
      "SNAP coaching fees",
      "SNAP online coaching",
    ],
  },
  nmat: {
    code: "NMAT",
    full: "NMIMS Management Aptitude Test",
    primary: "NMAT coaching",
    secondary: "best NMAT coaching institutes",
    extras: [
      "NMAT preparation classes",
      "NMIMS MBA coaching",
      "NMAT online coaching",
      "NMAT coaching fees",
    ],
  },
  cmat: {
    code: "CMAT",
    full: "Common Management Admission Test",
    primary: "CMAT coaching",
    secondary: "best CMAT coaching institutes",
    extras: [
      "CMAT preparation classes",
      "CMAT online coaching",
      "CMAT coaching fees",
      "AICTE CMAT coaching",
    ],
  },
  mat: {
    code: "MAT",
    full: "Management Aptitude Test",
    primary: "MAT coaching",
    secondary: "best MAT coaching institutes",
    extras: [
      "MAT preparation classes",
      "MAT online coaching",
      "MAT coaching fees",
      "AIMA MAT coaching",
    ],
  },
  iift: {
    code: "IIFT",
    full: "Indian Institute of Foreign Trade entrance exam",
    primary: "IIFT coaching",
    secondary: "best IIFT coaching institutes",
    extras: [
      "IIFT MBA IB coaching",
      "IIFT preparation classes",
      "IIFT online coaching",
      "IIFT coaching fees",
    ],
  },
  tissnet: {
    code: "TISSNET",
    full: "TISS National Entrance Test",
    primary: "TISSNET coaching",
    secondary: "best TISSNET coaching institutes",
    extras: [
      "TISS MBA coaching",
      "TISSNET preparation classes",
      "TISSNET online coaching",
      "TISSNET coaching fees",
    ],
  },
  mica: {
    code: "MICAT",
    full: "MICA Admission Test",
    primary: "MICAT coaching",
    secondary: "best MICAT coaching institutes",
    extras: [
      "MICA MBA coaching",
      "MICAT preparation classes",
      "MICAT online coaching",
      "MICAT coaching fees",
    ],
  },
  ipmat: {
    code: "IPMAT",
    full: "Integrated Programme in Management Aptitude Test",
    primary: "IPMAT coaching",
    secondary: "best IPMAT coaching for IIM Indore & Rohtak",
    extras: [
      "IPMAT preparation classes",
      "IIM Indore IPMAT coaching",
      "IPMAT online coaching",
      "IPMAT coaching fees",
    ],
  },
};

export function getExamHubSeo(slug: string): CoachingSeoTemplate {
  const key = slug.toLowerCase();
  const meta = EXAMS[key];
  const pretty = key.toUpperCase();

  if (!meta) {
    // Unknown exam slug — safe generic template
    return {
      title: `${pretty} Coaching Institutes in India ${YEAR} — Fees, Reviews & Batches | MBA Compass`,
      description: `Compare the best ${pretty} coaching institutes in India. See fees, batches, faculty and student reviews. Enrol in top ${pretty} preparation programs.`,
      h1: `Best ${pretty} Coaching Institutes in India`,
      primaryKeyword: `${pretty} coaching`,
      secondaryKeyword: `best ${pretty} coaching in India`,
      keywords: [`${pretty} coaching`, `${pretty} preparation`, `${pretty} classes`],
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Coaching", url: "/coaching" },
        { name: "By Exam", url: "/coaching" },
        { name: pretty, url: `/coaching/exam/${key}` },
      ],
    };
  }

  return {
    title: `Best ${meta.code} Coaching Institutes in India ${YEAR} — Fees, Reviews & Batches | MBA Compass`,
    description: `Compare the top ${meta.code} coaching institutes in India for ${YEAR}. Verified fees, batch schedules, faculty and real student reviews to help you crack the ${meta.full}.`,
    h1: `Best ${meta.code} Coaching Institutes in India ${YEAR}`,
    primaryKeyword: meta.primary,
    secondaryKeyword: meta.secondary,
    keywords: [meta.primary, meta.secondary, ...meta.extras],
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Coaching", url: "/coaching" },
      { name: "By Exam", url: "/coaching" },
      { name: `${meta.code} Coaching`, url: `/coaching/exam/${key}` },
    ],
  };
}

// ---------- Mode hubs ----------

type ModeMeta = {
  label: string;             // "Online"
  primary: string;
  secondary: string;
  extras: string[];
};

const MODES: Record<string, ModeMeta> = {
  online: {
    label: "Online",
    primary: "online MBA coaching",
    secondary: "best online CAT coaching in India",
    extras: [
      "online CAT coaching",
      "live online MBA coaching classes",
      "recorded MBA coaching courses",
      "online coaching for MBA entrance exams",
      "online MBA coaching fees",
    ],
  },
  offline: {
    label: "Offline",
    primary: "offline MBA coaching",
    secondary: "best classroom MBA coaching institutes",
    extras: [
      "classroom CAT coaching",
      "offline MBA coaching near me",
      "in-person CAT coaching",
      "offline MBA coaching fees",
    ],
  },
  classroom: {
    label: "Classroom",
    primary: "classroom MBA coaching",
    secondary: "best classroom CAT coaching institutes",
    extras: [
      "classroom CAT coaching",
      "in-person MBA coaching",
      "classroom MBA coaching fees",
      "physical MBA coaching classes",
    ],
  },
  weekend: {
    label: "Weekend",
    primary: "weekend MBA coaching",
    secondary: "weekend CAT coaching for working professionals",
    extras: [
      "weekend CAT coaching",
      "weekend MBA coaching for working professionals",
      "Saturday Sunday CAT batches",
      "part-time MBA coaching",
    ],
  },
  "crash-course": {
    label: "Crash Course",
    primary: "CAT crash course",
    secondary: "best MBA entrance crash course",
    extras: [
      "CAT crash course",
      "MBA crash course coaching",
      "last-minute CAT preparation",
      "short-term MBA coaching",
    ],
  },
  "self-paced": {
    label: "Self-Paced",
    primary: "self-paced MBA coaching",
    secondary: "best self-paced CAT preparation course",
    extras: [
      "self-paced CAT coaching",
      "recorded MBA coaching",
      "on-demand CAT preparation",
      "self-study MBA coaching",
    ],
  },
  hybrid: {
    label: "Hybrid",
    primary: "hybrid MBA coaching",
    secondary: "best hybrid CAT coaching institutes",
    extras: [
      "hybrid CAT coaching",
      "online + offline MBA coaching",
      "blended MBA coaching",
    ],
  },
};

export function getModeHubSeo(slug: string): CoachingSeoTemplate {
  const key = slug.toLowerCase();
  const meta = MODES[key];
  const pretty = key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (!meta) {
    return {
      title: `${pretty} MBA Coaching Institutes in India ${YEAR} | MBA Compass`,
      description: `Explore the best ${pretty.toLowerCase()} MBA coaching institutes in India. Compare fees, faculty, schedules and reviews.`,
      h1: `Best ${pretty} MBA Coaching Institutes in India`,
      primaryKeyword: `${pretty.toLowerCase()} MBA coaching`,
      keywords: [`${pretty.toLowerCase()} MBA coaching`, `${pretty.toLowerCase()} CAT coaching`],
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Coaching", url: "/coaching" },
        { name: "By Mode", url: "/coaching" },
        { name: pretty, url: `/coaching/mode/${key}` },
      ],
    };
  }

  return {
    title: `Best ${meta.label} MBA Coaching Institutes in India ${YEAR} — Fees & Reviews | MBA Compass`,
    description: `Compare the top ${meta.label.toLowerCase()} MBA coaching institutes in India for ${YEAR}. Verified fees, batch schedules, faculty and real student reviews for ${meta.primary}.`,
    h1: `Best ${meta.label} MBA Coaching Institutes in India ${YEAR}`,
    primaryKeyword: meta.primary,
    secondaryKeyword: meta.secondary,
    keywords: [meta.primary, meta.secondary, ...meta.extras],
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Coaching", url: "/coaching" },
      { name: "By Mode", url: "/coaching" },
      { name: `${meta.label} Coaching`, url: `/coaching/mode/${key}` },
    ],
  };
}

// ---------- City / region hub ----------

// Long-tail extras for a small set of high-intent MBA coaching metros.
const CITY_EXTRAS: Record<string, string[]> = {
  delhi: ["CAT coaching in Delhi", "MBA coaching in Delhi NCR", "best CAT coaching in Delhi"],
  mumbai: ["CAT coaching in Mumbai", "MBA coaching in Mumbai", "best CAT coaching in Mumbai"],
  bangalore: ["CAT coaching in Bangalore", "MBA coaching in Bengaluru", "best CAT coaching in Bengaluru"],
  bengaluru: ["CAT coaching in Bengaluru", "MBA coaching in Bengaluru", "best CAT coaching in Bengaluru"],
  hyderabad: ["CAT coaching in Hyderabad", "MBA coaching in Hyderabad"],
  chennai: ["CAT coaching in Chennai", "MBA coaching in Chennai"],
  pune: ["CAT coaching in Pune", "MBA coaching in Pune"],
  kolkata: ["CAT coaching in Kolkata", "MBA coaching in Kolkata"],
  ahmedabad: ["CAT coaching in Ahmedabad", "MBA coaching in Ahmedabad"],
  jaipur: ["CAT coaching in Jaipur", "MBA coaching in Jaipur"],
  lucknow: ["CAT coaching in Lucknow", "MBA coaching in Lucknow"],
  chandigarh: ["CAT coaching in Chandigarh", "MBA coaching in Chandigarh"],
  indore: ["CAT coaching in Indore", "IPMAT coaching in Indore"],
  noida: ["CAT coaching in Noida", "MBA coaching in Noida"],
  gurgaon: ["CAT coaching in Gurgaon", "MBA coaching in Gurugram"],
};

export function getRegionHubSeo(regionSlug: string, kind: "city" | "state" = "city"): CoachingSeoTemplate {
  const key = regionSlug.toLowerCase();
  const pretty = key.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const primary = `MBA coaching in ${pretty}`;
  const secondary = `best CAT coaching in ${pretty}`;
  const extras = CITY_EXTRAS[key] || [
    `CAT coaching in ${pretty}`,
    `MBA coaching institutes in ${pretty}`,
    `top MBA coaching in ${pretty}`,
    `MBA coaching fees in ${pretty}`,
  ];

  return {
    title: `Best MBA & CAT Coaching Institutes in ${pretty} ${YEAR} — Fees, Reviews & Batches | MBA Compass`,
    description: `Find the top MBA and CAT coaching institutes in ${pretty} for ${YEAR}. Compare fees, faculty, batch schedules and verified student reviews for coaching centres in ${pretty}.`,
    h1: `Best MBA Coaching Institutes in ${pretty} ${YEAR}`,
    primaryKeyword: primary,
    secondaryKeyword: secondary,
    keywords: [primary, secondary, ...extras],
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Coaching", url: "/coaching" },
      { name: kind === "state" ? "By State" : "By City", url: "/coaching" },
      { name: pretty, url: `/coaching/${key}` },
    ],
  };
}

// ---------- Coaching listing root (dynamic filters) ----------

export type ListingContext = {
  city?: string;        // "all" → treat as none
  state?: string;
  mode?: string;        // "all" | "Online" | ...
  categoryName?: string; // e.g. "IIM", "Non-IIM"
  examSlug?: string;    // e.g. "cat"
  resultCount?: number;
};

export function getCoachingListingSeo(ctx: ListingContext = {}): CoachingSeoTemplate {
  const location =
    ctx.city && ctx.city !== "all"
      ? ctx.city
      : ctx.state && ctx.state !== "all"
      ? ctx.state
      : "India";

  const catPrefix =
    ctx.categoryName && ctx.categoryName !== "all" ? `${ctx.categoryName} ` : "";
  const modeSuffix = ctx.mode && ctx.mode !== "all" ? ` (${ctx.mode})` : "";
  const examMeta = ctx.examSlug ? EXAMS[ctx.examSlug.toLowerCase()] : undefined;
  const examToken = examMeta ? examMeta.code : "MBA";

  const primaryKeyword = examMeta
    ? `${examMeta.code} coaching in ${location}`
    : `MBA coaching in ${location}`;
  const secondaryKeyword = examMeta
    ? examMeta.secondary
    : `best CAT coaching in ${location}`;

  const h1 = `Best ${catPrefix}${examToken} Coaching Institutes in ${location}`;

  const title = `Best ${catPrefix}${examToken} Coaching Institutes in ${location}${modeSuffix} ${YEAR} | MBA Compass`;

  const description = ctx.resultCount
    ? `Compare ${ctx.resultCount}+ ${catPrefix}${examToken} coaching institutes in ${location}. Verified fees, ratings, success rates and real student reviews for ${YEAR}.`
    : `Compare the top ${catPrefix}${examToken} coaching institutes in ${location}. Verified fees, ratings, success rates and real student reviews for ${YEAR}.`;

  const keywords = [
    primaryKeyword,
    secondaryKeyword,
    ...(examMeta ? examMeta.extras : ["CAT coaching", "MBA preparation", "online MBA coaching"]),
    `${examToken} coaching fees in ${location}`,
    `top ${examToken} coaching institutes in ${location}`,
  ];

  const breadcrumbs: Breadcrumb[] = [
    { name: "Home", url: "/" },
    { name: "Coaching", url: "/coaching" },
  ];
  if (ctx.state && ctx.state !== "all") {
    breadcrumbs.push({ name: ctx.state, url: `/coaching?state=${encodeURIComponent(ctx.state)}` });
  }
  if (ctx.city && ctx.city !== "all") {
    breadcrumbs.push({ name: ctx.city, url: `/coaching?city=${encodeURIComponent(ctx.city)}` });
  }
  if (examMeta) {
    breadcrumbs.push({ name: `${examMeta.code} Coaching`, url: `/coaching/exam/${ctx.examSlug}` });
  }

  return {
    title,
    description,
    h1,
    primaryKeyword,
    secondaryKeyword,
    keywords,
    breadcrumbs,
  };
}

export const KNOWN_EXAM_SLUGS = Object.keys(EXAMS);
export const KNOWN_MODE_SLUGS = Object.keys(MODES);
