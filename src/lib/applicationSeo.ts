import {
  CATEGORY_LABEL,
  CATEGORY_SLUG,
  type CategoryKey,
  type TrackerFaq,
  type TrackerRow,
  deadlineInfo,
  formatDate,
  formatFee,
} from "@/lib/applicationTracker";
import { canonicalUrl } from "@/lib/canonical";

/**
 * Multi-level SEO for the MBA College & Exam Application system.
 *
 * One template family drives the listing page, the four category landing
 * pages and every college/exam page, so hundreds of records can be added from
 * the admin panel without touching frontend code. Every string is derived from
 * real database fields — nothing factual is invented here.
 */

export const APPLICATION_YEAR = "2027";
export const APPLICATION_BASE = "/mba-application";

export type PageMeta = {
  title: string;
  description: string;
  canonical: string;
  h1: string;
  noindex?: boolean;
};

const clampTitle = (value: string): string => (value.length <= 62 ? value : `${value.slice(0, 59).trimEnd()}…`);
const clampDescription = (value: string): string =>
  value.length <= 158 ? value : `${value.slice(0, 155).trimEnd()}…`;

/* ------------------------------------------------------------ main page */

export const mainPageMeta = (rows: TrackerRow[]): PageMeta => {
  const open = rows.filter((r) => deadlineInfo(r).isOpen).length;
  return {
    title: `MBA Application Form ${APPLICATION_YEAR}: College-Wise Deadlines, Fees & Applications`,
    description: clampDescription(
      `Apply online to ${rows.length || "top"} MBA colleges and entrance exams in one place — ${open || "live"} applications currently open with last dates, application fees, programme fees, CAT/XAT/GMAT acceptance, cutoffs and placements for IIMs, Tier 1 and Tier 2 B-schools.`,
    ),
    canonical: canonicalUrl(APPLICATION_BASE),
    h1: `MBA College & Exam Application ${APPLICATION_YEAR}`,
  };
};

/* -------------------------------------------------------- category page */

const CATEGORY_COPY: Record<
  Exclude<CategoryKey, "all">,
  { title: string; description: string; h1: string }
> = {
  exam: {
    title: `MBA Entrance Exam Application Forms ${APPLICATION_YEAR}: Dates & Fees`,
    description: `CAT, XAT, GMAT, NMAT, SNAP, CMAT, MAT and more — registration dates, MBA application last date, exam application fees and official apply online links for ${APPLICATION_YEAR} admission.`,
    h1: `MBA Entrance Exam Application Forms ${APPLICATION_YEAR}`,
  },
  iim: {
    title: `IIM Application Form ${APPLICATION_YEAR}: Deadlines, Fees & Admission`,
    description: `IIM MBA/PGP application forms for ${APPLICATION_YEAR} — application deadlines, application fees, programme fees, CAT cutoff notes, average package and apply online links for every IIM accepting applications.`,
    h1: `IIM MBA Application Forms ${APPLICATION_YEAR}`,
  },
  tier1: {
    title: `Top Non-IIM MBA College Application Forms ${APPLICATION_YEAR}`,
    description: `Best Tier 1 non-IIM MBA colleges accepting CAT, XAT and GMAT — application last dates, application fees, MBA fees, cutoffs, average package and apply online links for ${APPLICATION_YEAR} admission.`,
    h1: `Tier 1 Non-IIM MBA Application Forms ${APPLICATION_YEAR}`,
  },
  tier2: {
    title: `Tier 2 MBA College Application Forms ${APPLICATION_YEAR}: Fees & Dates`,
    description: `Tier 2 MBA colleges with low fees and strong placements — currently open application forms, deadlines, application fees, ROI notes and apply online links for ${APPLICATION_YEAR} admission.`,
    h1: `Tier 2 MBA College Application Forms ${APPLICATION_YEAR}`,
  },
  recommended: {
    title: `Recommended MBA Colleges to Apply in ${APPLICATION_YEAR}`,
    description: `MBA colleges our admissions team recommends applying to this season — hand-picked Tier 1 and Tier 2 B-schools with open application forms, deadlines, fees, cutoffs and ROI notes.`,
    h1: `Recommended MBA Applications ${APPLICATION_YEAR}`,
  },
};

export const categoryPageMeta = (category: Exclude<CategoryKey, "all">, rows: TrackerRow[]): PageMeta => {
  const copy = CATEGORY_COPY[category];
  const open = rows.filter((r) => deadlineInfo(r).isOpen).length;
  return {
    title: clampTitle(copy.title),
    description: clampDescription(
      open > 0 ? `${open} applications currently open. ${copy.description}` : copy.description,
    ),
    canonical: canonicalUrl(`${APPLICATION_BASE}/${CATEGORY_SLUG[category]}`),
    h1: copy.h1,
  };
};

/* ----------------------------------------------------------- college page */

const label = (row: TrackerRow) => row.short_name?.trim() || row.name;

export const collegePageMeta = (row: TrackerRow): PageMeta => {
  const name = label(row);
  const isExam = row.category === "exam";
  const fallbackTitle = isExam
    ? `${name} Application Form ${APPLICATION_YEAR}: Dates, Fees & Apply Online`
    : `${name} Application Form ${APPLICATION_YEAR}: Fees, Last Date, Cutoff & Admission`;

  const bits: string[] = [];
  if (row.application_deadline) bits.push(`Last date ${formatDate(row.application_deadline)}`);
  if (row.application_fee !== null) bits.push(`application fee ${formatFee(row.application_fee)}`);
  if (!isExam && row.program_fee !== null) bits.push(`MBA fees ${formatFee(row.program_fee)}`);
  if (row.average_package !== null) bits.push(`average package ${formatFee(row.average_package)}`);
  if ((row.accepted_exams ?? []).length) bits.push(`accepts ${(row.accepted_exams ?? []).join(", ")}`);

  const fallbackDescription = isExam
    ? `${row.name} ${APPLICATION_YEAR} application form — registration dates, ${bits.join(", ")}. Apply online and track your MBA application deadlines with MBA Compass.`
    : `${row.name} MBA admission ${APPLICATION_YEAR} — ${bits.join(", ")}. Check eligibility, cutoff, selection process and apply online through the official application form.`;

  return {
    title: clampTitle(row.seo_title?.trim() || fallbackTitle),
    description: clampDescription(row.seo_description?.trim() || fallbackDescription),
    canonical: canonicalUrl(`${APPLICATION_BASE}/college/${row.slug}`),
    h1:
      row.seo_h1?.trim() ||
      (isExam
        ? `${row.name} Application Form ${APPLICATION_YEAR}`
        : `${row.name} Application Form ${APPLICATION_YEAR}: Fees, Deadline & Admission`),
  };
};

export const collegeUrl = (row: Pick<TrackerRow, "slug">): string => `${APPLICATION_BASE}/college/${row.slug}`;

export const categoryUrl = (category: Exclude<CategoryKey, "all">): string =>
  `${APPLICATION_BASE}/${CATEGORY_SLUG[category]}`;

/* ------------------------------------------------------------ keywords */

/** Keyword cluster used for the supporting copy and internal linking blocks. */
export const collegeKeywords = (row: TrackerRow): string[] => {
  if ((row.seo_keywords ?? []).length) return row.seo_keywords;
  const name = label(row);
  return [
    `${name} application form`,
    `${name} application fee`,
    `${name} application last date`,
    `${name} admission ${APPLICATION_YEAR}`,
    `${name} fees`,
    `${name} cutoff`,
    `${name} average package`,
    `${name} placement`,
    `${name} eligibility`,
    `${name} apply online`,
  ];
};

/* -------------------------------------------------------------- schema */

export const breadcrumbSchema = (trail: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((item, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: item.name,
    item: canonicalUrl(item.url),
  })),
});

export const faqSchema = (faqs: TrackerFaq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
});

export const collectionSchema = (meta: PageMeta, rows: TrackerRow[]) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: meta.title,
  description: meta.description,
  url: meta.canonical,
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 60).map((row, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: canonicalUrl(collegeUrl(row)),
      name: `${row.name} application form ${APPLICATION_YEAR}`,
    })),
  },
});

export const collegeSchema = (row: TrackerRow) => {
  const isExam = row.category === "exam";
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isExam ? "Course" : "CollegeOrUniversity",
    name: row.name,
    description: collegePageMeta(row).description,
    url: canonicalUrl(collegeUrl(row)),
  };
  if (row.logo_url) base["logo"] = row.logo_url;
  if (row.college_website) base["sameAs"] = row.college_website;
  if (row.location) base["address"] = { "@type": "PostalAddress", addressLocality: row.location, addressCountry: "IN" };
  if (isExam) {
    base["provider"] = { "@type": "Organization", name: row.name };
    base["courseMode"] = "onsite";
  }
  return base;
};

/* ----------------------------------------------------------------- FAQs */

/** Data-derived FAQs — every answer comes from stored fields. */
export const collegeFaqs = (row: TrackerRow): TrackerFaq[] => {
  if ((row.seo_faqs ?? []).length) return row.seo_faqs;
  const name = row.name;
  const info = deadlineInfo(row);
  const faqs: TrackerFaq[] = [];
  if (row.application_deadline) {
    faqs.push({
      question: `What is the ${name} application last date for ${APPLICATION_YEAR}?`,
      answer: `The ${name} application deadline is ${formatDate(row.application_deadline)}. Current status: ${info.label}.`,
    });
  }
  if (row.application_fee !== null) {
    faqs.push({
      question: `What is the ${name} application fee?`,
      answer: `The ${name} application fee is ${formatFee(row.application_fee)}${row.program_fee !== null ? `, and the programme fee is ${formatFee(row.program_fee)}` : ""}.`,
    });
  }
  if ((row.accepted_exams ?? []).length) {
    faqs.push({
      question: `Which entrance exams does ${name} accept?`,
      answer: `${name} accepts ${(row.accepted_exams ?? []).join(", ")} scores for MBA admission ${APPLICATION_YEAR}.`,
    });
  }
  if (row.eligibility) {
    faqs.push({ question: `What is the ${name} eligibility criteria?`, answer: row.eligibility });
  }
  if (row.selection_process) {
    faqs.push({ question: `What is the ${name} selection process?`, answer: row.selection_process });
  }
  if (row.cutoff_note) {
    faqs.push({ question: `What is the ${name} cutoff?`, answer: row.cutoff_note });
  }
  if (row.average_package !== null) {
    faqs.push({
      question: `What is the average package at ${name}?`,
      answer: `${name} reports an average package of ${formatFee(row.average_package)}${row.highest_package !== null ? ` with a highest package of ${formatFee(row.highest_package)}` : ""}${row.median_package !== null ? ` and a median of ${formatFee(row.median_package)}` : ""}.`,
    });
  }
  return faqs;
};

export const listingFaqs = (rows: TrackerRow[]): TrackerFaq[] => {
  const open = rows.filter((r) => deadlineInfo(r).isOpen);
  const soon = rows.filter((r) => {
    const d = deadlineInfo(r).daysLeft;
    return d !== null && d >= 0 && d <= 7;
  });
  return [
    {
      question: `Which MBA colleges are currently accepting applications for ${APPLICATION_YEAR}?`,
      answer: `${open.length} MBA college and exam application forms are open right now, including ${open
        .slice(0, 5)
        .map((r) => r.name)
        .join(", ")}. Use the "Currently Open" filter to see the full list with deadlines and fees.`,
    },
    {
      question: `Which MBA application deadlines are closing soon?`,
      answer:
        soon.length > 0
          ? `${soon.length} applications close within seven days: ${soon.slice(0, 5).map((r) => `${r.name} (${formatDate(r.application_deadline)})`).join(", ")}.`
          : `No MBA application deadline falls within the next seven days. Check the "Next 15 Days" filter for upcoming last dates.`,
    },
    {
      question: `How much is the MBA application fee for top colleges?`,
      answer: `Application fees are listed college-wise on this page, alongside the programme fee, so you can plan your MBA application budget before you apply online.`,
    },
    {
      question: `Can I track my MBA applications on MBA Compass?`,
      answer: `Yes. Click Apply Now on any college and it is saved to My Applications, where you can follow status, deadlines and fees paid across every B-school you apply to.`,
    },
  ];
};
