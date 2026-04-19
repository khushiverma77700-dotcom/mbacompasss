// Schema-driven form definitions mirroring AdminInstitutes & AdminColleges
// Used by the user-generated listing flow to ensure 100% parity.

export type ListingType = "coaching" | "college";

export type SectionId =
  | "basic"
  | "contact"
  | "courses"
  | "fees_placements"
  | "academics"
  | "faculty"
  | "results"
  | "media"
  | "seo";

export interface SectionDef {
  id: SectionId;
  label: string;
  description: string;
  required?: boolean;
}

export const COACHING_SECTIONS: SectionDef[] = [
  { id: "basic", label: "Basic Info", description: "Name, description, location, mode", required: true },
  { id: "contact", label: "Contact Details", description: "Phone, email, website, WhatsApp" },
  { id: "courses", label: "Courses Offered", description: "Programs, durations, fees" },
  { id: "fees_placements", label: "Offers & Highlights", description: "Discount, offer, key features" },
  { id: "faculty", label: "Faculty", description: "Teaching team profiles" },
  { id: "results", label: "Results", description: "Year-wise selections & achievements" },
  { id: "media", label: "Media", description: "Logo, banner, brochures" },
  { id: "seo", label: "SEO Metadata", description: "Meta title, description, keywords" },
];

export const COLLEGE_SECTIONS: SectionDef[] = [
  { id: "basic", label: "Basic Info", description: "Name, description, type, tier, location", required: true },
  { id: "academics", label: "Academics", description: "Courses, specializations, exams accepted" },
  { id: "fees_placements", label: "Fees & Placements", description: "Fee structure, placement stats, recruiters" },
  { id: "contact", label: "Contact & Website", description: "Website and admission process" },
  { id: "media", label: "Media", description: "Logo, banner image" },
  { id: "seo", label: "SEO Metadata", description: "Meta title, description, keywords" },
];

export const getSections = (type: ListingType): SectionDef[] =>
  type === "college" ? COLLEGE_SECTIONS : COACHING_SECTIONS;

// ---------- Default empty payloads ----------

export const emptyCoachingPayload = () => ({
  // basic
  name: "",
  description: "",
  city: "",
  state: "",
  address: "",
  mode: "Offline",
  category_id: "",
  specializations: [] as string[],
  // contact
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  // offers / highlights
  discount: "",
  offer: "",
  features: [] as string[],
  fees_lakhs: 0,
  // courses (array of structured course objects)
  courses_list: [] as Array<{
    name: string;
    duration: string;
    mode: string;
    fees: string;
    description: string;
  }>,
  // faculty
  faculty_list: [] as Array<{
    name: string;
    designation: string;
    qualification: string;
    experience: string;
    specialization: string;
    bio: string;
    photo_url: string;
  }>,
  // results
  results_list: [] as Array<{
    year: number;
    college_name: string;
    students_selected: number;
    description: string;
  }>,
  // media
  logo_url: "",
  banner_url: "",
  // SEO
  meta_title: "",
  meta_description: "",
  keywords: [] as string[],
  primary_keyword: "",
});

export const emptyCollegePayload = () => ({
  // basic
  name: "",
  description: "",
  city: "",
  state: "",
  type: "Private",
  tier: "Tier 2",
  college_category: "Non-IIM",
  established: 0,
  ranking: 0,
  // academics
  courses: [] as string[],
  specializations: [] as string[],
  exams_accepted: [] as string[],
  accreditations: [] as string[],
  // fees & placements
  fees: "",
  fees_lakhs: 0,
  placement_avg: "",
  placement_median: "",
  placement_highest: "",
  top_recruiters: [] as string[],
  total_students: 0,
  campus_size: "",
  // contact
  website: "",
  admission_process: "",
  // media
  logo_url: "",
  banner_url: "",
  // SEO
  meta_title: "",
  meta_description: "",
  keywords: [] as string[],
  primary_keyword: "",
});

export const emptyPayload = (type: ListingType) =>
  type === "college" ? emptyCollegePayload() : emptyCoachingPayload();
