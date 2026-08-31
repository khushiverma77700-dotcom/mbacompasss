/**
 * Field schema shared by the public Magic Edit page.
 * Mirrors the master-admin editors (Admin → Colleges / Articles / Exams) field
 * for field, tab for tab, so a magic-link holder sees exactly the same form.
 *
 * Keep in sync with `supabase/functions/magic-edit/fields.ts` (server allow-list).
 */

export type MagicFieldType =
  | "text"
  | "number"
  | "richtext"
  | "select"
  | "tags"
  | "switch"
  | "statecity"
  | "url";

export interface MagicField {
  key: string;
  label: string;
  type: MagicFieldType;
  options?: string[];
  optionLabels?: Record<string, string>;
  placeholder?: string;
  maxLength?: number;
  counter?: number;
  hint?: string;
  mono?: boolean;
  /** Half-width on desktop. */
  half?: boolean;
}

export interface MagicTab {
  key: string;
  label: string;
  fields: MagicField[];
}

export interface MagicEntitySchema {
  label: string;
  titleField: string;
  slugField: string;
  publicPath: (slug: string) => string;
  tabs: MagicTab[];
}

const TIER_OPTIONS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"];
const CATEGORY_OPTIONS = ["IIM", "Non-IIM"];
const TYPE_OPTIONS = ["IIM", "Private", "Government", "Deemed", "Autonomous", "University"];
const ARTICLE_CATEGORIES = [
  "news", "exam-tips", "career", "success-stories", "reviews",
  "college-news", "coaching", "gd-pi", "placements", "scholarships",
];
const ARTICLE_STATUS = ["draft", "live", "not-live"];

export const MAGIC_SCHEMA: Record<string, MagicEntitySchema> = {
  college: {
    label: "College",
    titleField: "name",
    slugField: "slug",
    publicPath: (slug) => `/college/${slug}`,
    tabs: [
      {
        key: "basic",
        label: "Basic Info",
        fields: [
          { key: "name", label: "College Name *", type: "text", placeholder: "e.g. IIM Bangalore" },
          { key: "slug", label: "Slug", type: "text", mono: true, half: true },
          { key: "description", label: "Description", type: "richtext", placeholder: "College description..." },
          { key: "statecity", label: "Location", type: "statecity" },
          { key: "type", label: "Type", type: "select", options: TYPE_OPTIONS, half: true },
          { key: "college_category", label: "Category *", type: "select", options: CATEGORY_OPTIONS, half: true },
          { key: "tier", label: "Tier *", type: "select", options: TIER_OPTIONS, half: true },
          { key: "established", label: "Established Year", type: "number", half: true },
          { key: "ranking", label: "Ranking", type: "number", half: true },
          { key: "fees", label: "Fees (e.g. ₹20L)", type: "text", half: true },
          { key: "fees_lakhs", label: "Fees (₹ Lakhs, numeric)", type: "number", half: true },
          { key: "specializations", label: "Specializations", type: "tags" },
          { key: "logo_url", label: "College Logo URL", type: "url", hint: "200×200 px square PNG", half: true },
          { key: "banner_url", label: "Banner Image URL", type: "url", hint: "1200×400 px landscape", half: true },
          { key: "website", label: "Website URL", type: "url" },
        ],
      },
      {
        key: "placements",
        label: "Placements",
        fields: [
          { key: "placement_avg", label: "Avg Package", type: "text", placeholder: "e.g. ₹25 LPA", half: true },
          { key: "placement_highest", label: "Highest Package", type: "text", placeholder: "e.g. ₹80 LPA", half: true },
          { key: "placement_median", label: "Median Package", type: "text", placeholder: "e.g. ₹22 LPA", half: true },
          { key: "top_recruiters", label: "Top Recruiters", type: "tags" },
        ],
      },
      {
        key: "details",
        label: "Details",
        fields: [
          { key: "campus_size", label: "Campus Size", type: "text", half: true },
          { key: "total_students", label: "Total Students", type: "number", half: true },
          { key: "admission_process", label: "Admission Process", type: "richtext", placeholder: "Describe the admission process..." },
          { key: "courses", label: "Courses Offered", type: "tags" },
          { key: "accreditations", label: "Accreditations", type: "tags" },
          { key: "exams_accepted", label: "Exams Accepted", type: "tags" },
        ],
      },
      {
        key: "seo",
        label: "SEO",
        fields: [
          { key: "primary_keyword", label: "Primary Keyword", type: "text" },
          { key: "h1_tag", label: "H1 Heading", type: "text" },
          { key: "meta_title", label: "Meta Title", type: "text", maxLength: 70, counter: 60 },
          { key: "meta_description", label: "Meta Description", type: "text", maxLength: 170, counter: 160 },
          { key: "keywords", label: "Target Keywords", type: "tags" },
          { key: "funnel_stage", label: "Funnel Stage", type: "text", half: true },
        ],
      },
    ],
  },

  article: {
    label: "Article",
    titleField: "title",
    slugField: "slug",
    publicPath: (slug) => `/article/${slug}`,
    tabs: [
      {
        key: "content",
        label: "Content",
        fields: [
          { key: "title", label: "Title *", type: "text", placeholder: "Article title" },
          { key: "slug", label: "Slug", type: "text", mono: true, half: true },
          { key: "author", label: "Author", type: "text", half: true },
          { key: "category", label: "Category", type: "select", options: ARTICLE_CATEGORIES, half: true },
          { key: "intro", label: "Intro / Summary", type: "richtext", placeholder: "Brief intro paragraph..." },
          { key: "excerpt", label: "Excerpt (for cards/previews)", type: "text", placeholder: "Short excerpt" },
          { key: "content", label: "Content", type: "richtext", placeholder: "Write your article content here..." },
        ],
      },
      {
        key: "seo",
        label: "SEO & Meta",
        fields: [
          { key: "primary_keyword", label: "Primary Keyword", type: "text" },
          { key: "h1_tag", label: "H1 Tag", type: "text", placeholder: "Primary H1 heading" },
          { key: "meta_title", label: "Meta Title (max 60 chars)", type: "text", maxLength: 70, counter: 60 },
          { key: "meta_description", label: "Meta Description (max 160 chars)", type: "text", maxLength: 170, counter: 160 },
          { key: "keywords", label: "Target Keywords", type: "tags" },
          { key: "priority", label: "Priority", type: "number", half: true },
        ],
      },
      {
        key: "settings",
        label: "Settings",
        fields: [
          { key: "status", label: "Status", type: "select", options: ARTICLE_STATUS, half: true },
          { key: "featured", label: "Featured on Homepage", type: "switch", half: true },
          { key: "banner_url", label: "Banner Image URL", type: "url", hint: "1200×630 px", half: true },
          { key: "mobile_banner_url", label: "Mobile Banner URL", type: "url", hint: "600×400 px", half: true },
          { key: "image_url", label: "Thumbnail URL", type: "url", hint: "16:9 thumbnail", half: true },
        ],
      },
    ],
  },

  exam: {
    label: "Exam",
    titleField: "name",
    slugField: "slug",
    publicPath: (slug) => `/exam/${slug}`,
    tabs: [
      {
        key: "basic",
        label: "Basic Info",
        fields: [
          { key: "name", label: "Short Name *", type: "text", placeholder: "e.g. CAT", half: true },
          { key: "slug", label: "Slug", type: "text", mono: true, half: true },
          { key: "full_name", label: "Full Name", type: "text", placeholder: "e.g. Common Admission Test" },
          { key: "description", label: "Description", type: "richtext", placeholder: "Exam description..." },
          { key: "conducting_body", label: "Conducting Body", type: "text", half: true },
          { key: "official_website", label: "Official Website", type: "url", half: true },
        ],
      },
      {
        key: "details",
        label: "Details",
        fields: [
          { key: "eligibility", label: "Eligibility Criteria", type: "richtext", placeholder: "Eligibility criteria..." },
          { key: "exam_date", label: "Exam Date", type: "text", half: true },
          { key: "registration_deadline", label: "Registration Deadline", type: "text", half: true },
          { key: "frequency", label: "Frequency (e.g. Annual)", type: "text", half: true },
          { key: "duration", label: "Duration", type: "text", half: true },
          { key: "exam_mode", label: "Exam Mode", type: "text", half: true },
          { key: "exam_level", label: "Exam Level", type: "text", half: true },
          { key: "exam_category", label: "Exam Category", type: "text", half: true },
          { key: "exam_year", label: "Exam Year", type: "number", half: true },
          { key: "syllabus", label: "Syllabus Topics", type: "tags" },
        ],
      },
      {
        key: "seo",
        label: "SEO",
        fields: [
          { key: "primary_keyword", label: "Primary Keyword", type: "text" },
          { key: "h1_tag", label: "H1 Heading", type: "text", placeholder: "e.g. CAT 2026: Exam Dates, Pattern, Syllabus & Cutoffs" },
          { key: "meta_title", label: "Meta Title", type: "text", maxLength: 70, counter: 60 },
          { key: "meta_description", label: "Meta Description", type: "text", maxLength: 170, counter: 160 },
          { key: "keywords", label: "Keywords", type: "tags" },
          { key: "funnel_stage", label: "Funnel Stage", type: "text", half: true },
        ],
      },
    ],
  },
};

export const magicSchemaFor = (t?: string | null): MagicEntitySchema | null =>
  (t && MAGIC_SCHEMA[t]) || null;
