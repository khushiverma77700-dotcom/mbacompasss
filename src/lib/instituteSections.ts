// Schema-driven definition of all coaching-institute content sections.
// One source of truth used by:
//   - Admin editor (renders the right inputs per section)
//   - Frontend renderer (auto-shows sections that have data + enabled)
//
// Each section is stored in `institutes.sections` JSONB as:
//   { [sectionId]: { enabled: boolean, data: <shape> } }

export type FieldKind =
  | "text"
  | "textarea"
  | "richtext"
  | "url"
  | "image"
  | "list-string"          // string[]
  | "list-bullet"          // string[] — rendered as bullets
  | "list-keyvalue"        // {label, value}[]
  | "list-faculty"         // {name, experience, expertise, achievements, photo_url}[]
  | "list-testimonial"     // {name, exam, text, photo_url}[]
  | "list-review"          // {name, rating, text}[]
  | "list-faq"             // {q, a}[]
  | "list-update"          // {date, title, body}[]
  | "list-event"           // {date, title, body, link}[]
  | "list-link"            // {label, url}[]
  | "list-location"        // {city, area, map_url}[]
  | "list-comparison"      // {point, us, others}[]
  | "list-pros-cons"       // {pros: string[], cons: string[]}
  | "list-cta"             // {label, url, style}[]
  | "social-links";        // {website,youtube,instagram,linkedin,facebook,twitter}

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  help?: string;
  rows?: number;
}

export interface SectionDef {
  id: string;
  label: string;
  shortHelp: string;
  icon?: string;
  fields: FieldDef[];
  // Renderer hint for frontend
  layout:
    | "prose"
    | "bullets"
    | "cards"
    | "faculty"
    | "testimonials"
    | "reviews"
    | "faq"
    | "updates"
    | "events"
    | "links"
    | "locations"
    | "comparison"
    | "pros-cons"
    | "ctas"
    | "social"
    | "keyvalue";
}

export const INSTITUTE_SECTIONS: SectionDef[] = [
  { id: "overview", label: "Overview", shortHelp: "80–120 words about the institute", layout: "prose",
    fields: [{ key: "body", label: "Overview", kind: "richtext", rows: 6 }] },

  { id: "key_highlights", label: "Key Highlights", shortHelp: "5–7 bullet USPs", layout: "bullets",
    fields: [{ key: "items", label: "Highlights", kind: "list-bullet" }] },

  { id: "courses_offered", label: "Courses Offered (text list)", shortHelp: "6–10 exam programs offered (e.g. CAT Classroom, NMAT Online)", layout: "bullets",
    fields: [{ key: "items", label: "Courses", kind: "list-bullet" }] },

  { id: "course_formats", label: "Course Formats", shortHelp: "4–6 formats: classroom, live online, recorded, crash, test series, 1:1", layout: "bullets",
    fields: [{ key: "items", label: "Formats", kind: "list-bullet" }] },

  { id: "batch_details", label: "Batch Details", shortHelp: "Batch size, start dates, duration, weekday/weekend", layout: "prose",
    fields: [{ key: "body", label: "Batch details", kind: "textarea", rows: 4 }] },

  { id: "teaching_methodology", label: "Teaching Methodology", shortHelp: "80–120 words on pedagogy", layout: "prose",
    fields: [{ key: "body", label: "Methodology", kind: "richtext", rows: 6 }] },

  { id: "faculty", label: "Faculty Profiles", shortHelp: "3–5 faculty with photo and bio", layout: "faculty",
    fields: [{ key: "items", label: "Faculty members", kind: "list-faculty" }] },

  { id: "study_material", label: "Study Material", shortHelp: "Books, PDFs, assignments", layout: "prose",
    fields: [{ key: "body", label: "Material", kind: "textarea", rows: 4 }] },

  { id: "mock_tests", label: "Mock Tests & Practice", shortHelp: "Number of mocks, sectional, analytics", layout: "prose",
    fields: [{ key: "body", label: "Mock tests", kind: "textarea", rows: 4 }] },

  { id: "results", label: "Results & Success Rate", shortHelp: "Past results, top ranks, selection stats", layout: "prose",
    fields: [{ key: "body", label: "Results", kind: "textarea", rows: 4 }] },

  { id: "topper_testimonials", label: "Topper Testimonials", shortHelp: "6–10 short success stories", layout: "testimonials",
    fields: [{ key: "items", label: "Testimonials", kind: "list-testimonial" }] },

  { id: "student_reviews", label: "Student Reviews & Ratings", shortHelp: "4–6 short reviews", layout: "reviews",
    fields: [{ key: "items", label: "Reviews", kind: "list-review" }] },

  { id: "admission_process", label: "Admission Process", shortHelp: "Steps to enroll, online/offline", layout: "prose",
    fields: [{ key: "body", label: "Admission steps", kind: "textarea", rows: 4 }] },

  { id: "eligibility", label: "Eligibility Criteria", shortHelp: "Who can join", layout: "prose",
    fields: [{ key: "body", label: "Eligibility", kind: "textarea", rows: 3 }] },

  { id: "fees", label: "Fee Structure", shortHelp: "Price range, installments, refund", layout: "prose",
    fields: [{ key: "body", label: "Fees", kind: "textarea", rows: 4 }] },

  { id: "scholarships", label: "Scholarships & Discounts", shortHelp: "Merit, early bird, financial aid", layout: "prose",
    fields: [{ key: "body", label: "Scholarships", kind: "textarea", rows: 3 }] },

  { id: "demo_classes", label: "Demo Classes", shortHelp: "Free/paid demo info", layout: "prose",
    fields: [{ key: "body", label: "Demo info", kind: "textarea", rows: 3 }] },

  { id: "online_vs_offline", label: "Online vs Offline", shortHelp: "Mode comparison", layout: "prose",
    fields: [{ key: "body", label: "Mode comparison", kind: "textarea", rows: 3 }] },

  { id: "doubt_solving", label: "Doubt Solving Support", shortHelp: "WhatsApp, live sessions, faculty access", layout: "prose",
    fields: [{ key: "body", label: "Doubt support", kind: "textarea", rows: 3 }] },

  { id: "mentorship", label: "Mentorship Programs", shortHelp: "1:1 mentoring, strategy", layout: "prose",
    fields: [{ key: "body", label: "Mentorship", kind: "textarea", rows: 3 }] },

  { id: "infrastructure", label: "Infrastructure & Facilities", shortHelp: "Classrooms, library, labs", layout: "prose",
    fields: [{ key: "body", label: "Infrastructure", kind: "textarea", rows: 3 }] },

  { id: "tech_platform", label: "Technology & Learning Platform", shortHelp: "LMS, dashboards, analytics", layout: "prose",
    fields: [{ key: "body", label: "Tech platform", kind: "textarea", rows: 3 }] },

  { id: "mobile_app", label: "Mobile App Access", shortHelp: "App features and access", layout: "prose",
    fields: [{ key: "body", label: "Mobile app", kind: "textarea", rows: 2 }] },

  { id: "internship_placement", label: "Internship & Placement Support", shortHelp: "If applicable", layout: "prose",
    fields: [{ key: "body", label: "Placement", kind: "textarea", rows: 3 }] },

  { id: "tieups", label: "College Tie-Ups & Partnerships", shortHelp: "Associated colleges/brands", layout: "prose",
    fields: [{ key: "body", label: "Tie-ups", kind: "textarea", rows: 3 }] },

  { id: "locations", label: "Locations & Centers", shortHelp: "5–8 centers (city, area, map link)", layout: "locations",
    fields: [{ key: "items", label: "Centers", kind: "list-location" }] },

  { id: "contact", label: "Contact Information", shortHelp: "Phone, email, address", layout: "keyvalue",
    fields: [{ key: "items", label: "Contact rows", kind: "list-keyvalue" }] },

  { id: "social", label: "Website & Social Media", shortHelp: "3–5 links", layout: "social",
    fields: [{ key: "links", label: "Social links", kind: "social-links" }] },

  { id: "why_choose", label: "Why Choose This Institute", shortHelp: "5–6 differentiators", layout: "bullets",
    fields: [{ key: "items", label: "Reasons", kind: "list-bullet" }] },

  { id: "pros_cons", label: "Pros & Cons", shortHelp: "3–4 each, balanced view", layout: "pros-cons",
    fields: [{ key: "items", label: "Pros and Cons", kind: "list-pros-cons" }] },

  { id: "comparison", label: "Comparison with Other Institutes", shortHelp: "3–5 comparison points", layout: "comparison",
    fields: [{ key: "items", label: "Comparison rows", kind: "list-comparison" }] },

  { id: "faqs", label: "FAQs", shortHelp: "5–7 questions", layout: "faq",
    fields: [{ key: "items", label: "FAQs", kind: "list-faq" }] },

  { id: "updates", label: "Latest Updates & Announcements", shortHelp: "3–5 recent updates", layout: "updates",
    fields: [{ key: "items", label: "Updates", kind: "list-update" }] },

  { id: "events", label: "Events & Workshops", shortHelp: "2–4 events", layout: "events",
    fields: [{ key: "items", label: "Events", kind: "list-event" }] },

  { id: "blog_resources", label: "Blog & Resources", shortHelp: "3–5 useful links", layout: "links",
    fields: [{ key: "items", label: "Resource links", kind: "list-link" }] },

  { id: "brochure", label: "Download Brochure", shortHelp: "Brochure file or URL", layout: "ctas",
    fields: [
      { key: "url", label: "Brochure URL (PDF)", kind: "url" },
      { key: "headline", label: "Headline", kind: "text", placeholder: "Get the full brochure" },
    ] },

  { id: "ctas", label: "Call to Action Buttons", shortHelp: "2–3 CTAs (Enroll, Demo, Counselor)", layout: "ctas",
    fields: [{ key: "items", label: "CTA buttons", kind: "list-cta" }] },
];

// Build empty default for a section
export const emptySectionData = (def: SectionDef) => {
  const out: Record<string, any> = {};
  for (const f of def.fields) {
    switch (f.kind) {
      case "text": case "textarea": case "richtext": case "url": case "image":
        out[f.key] = ""; break;
      case "list-string": case "list-bullet":
        out[f.key] = []; break;
      case "list-pros-cons":
        out[f.key] = { pros: [], cons: [] }; break;
      case "social-links":
        out[f.key] = { website: "", youtube: "", instagram: "", linkedin: "", facebook: "", twitter: "" }; break;
      default:
        out[f.key] = [];
    }
  }
  return out;
};

export const isSectionEmpty = (def: SectionDef, data: any): boolean => {
  if (!data) return true;
  for (const f of def.fields) {
    const v = data[f.key];
    if (v == null) continue;
    if (typeof v === "string" && v.trim()) return false;
    if (Array.isArray(v) && v.length > 0) return false;
    if (typeof v === "object" && !Array.isArray(v)) {
      if (f.kind === "list-pros-cons" && ((v.pros?.length || 0) + (v.cons?.length || 0)) > 0) return false;
      if (f.kind === "social-links" && Object.values(v).some((x) => typeof x === "string" && x.trim())) return false;
    }
  }
  return true;
};

export const getSection = (sections: any, id: string) => {
  const s = sections?.[id];
  if (!s) return { enabled: false, data: {} };
  return { enabled: !!s.enabled, data: s.data || {} };
};
