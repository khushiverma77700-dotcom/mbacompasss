// Centralized list of all public static pages for SEO, link aggregation, and admin tools.
// Add new pages here — they auto-appear in SEO Dashboard, Static Page SEO, and All Links.

export interface StaticPageSEO {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  h1?: string;
  hasSchema?: boolean;       // JSON-LD present in code
  hasSocial?: boolean;       // Open Graph + Twitter tags via SEOHead
  hasCanonical?: boolean;
  hasInternalLinks?: boolean;
  hasImages?: boolean;
  approxWordCount?: number;  // visible content word count for audit signal
}

export interface StaticPageDef {
  key: string;
  label: string;
  path: string;
  seo?: StaticPageSEO;
}

const STATIC_PAGES: StaticPageDef[] = [
  { key: "home", label: "Home Page", path: "/" },
  { key: "about", label: "About Page", path: "/about" },
  { key: "contact", label: "Contact Page", path: "/contact" },
  { key: "blog", label: "Blog Page", path: "/blog" },
  { key: "colleges", label: "Colleges Page", path: "/colleges" },
  { key: "compare", label: "Compare Coaching", path: "/compare" },
  { key: "college-finder", label: "AI College Finder & Compare", path: "/college-finder" },
  { key: "profile-analyzer", label: "Profile Analyzer", path: "/profile-analyzer" },
  { key: "college-shortlister", label: "AI College Shortlister", path: "/college-shortlister" },
  {
    key: "iim-waitlist-movement",
    label: "IIM Waitlist Movement 2026",
    path: "/iim-waitlist-movement",
    seo: {
      metaTitle: "IIM Waitlist Movement 2026 — Live Tracker, RTI Data & Result Dates | MBA Compass",
      metaDescription:
        "Live IIM, IIT & top B-school 2026 result tracker, expected release calendar, category-wise waitlist movement (2021–2026), RTI insights, AI-powered predictions and apply-now B-school list.",
      keywords: [
        "IIM waitlist 2026", "IIM result 2026", "IIM waitlist movement", "RTI IIM data",
        "IIM waitlist conversion", "CAT 2025 result", "IIM Ahmedabad waitlist",
        "MBA admission 2026", "IIM Bangalore movement", "IIM Calcutta waitlist",
        "FMS Delhi waitlist", "B-school admission 2026",
      ],
      h1: "IIM Waitlist Movement 2026 — Live Tracker, RTI Insights & Result Dates",
      hasSchema: true,
      hasSocial: true,
      hasCanonical: true,
      hasInternalLinks: true,
      hasImages: true,
      approxWordCount: 2400,
    },
  },
  { key: "cat-score-calculator", label: "CAT Score Calculator", path: "/cat-score-calculator" },
  { key: "mba-roi-calculator", label: "MBA ROI Calculator", path: "/mba-roi-calculator" },
  
  { key: "list-your-business", label: "List Your Business", path: "/list-your-business" },
  { key: "business-inquiry", label: "Business Inquiry", path: "/business-inquiry" },
  { key: "mocks", label: "Mock Tests", path: "/mocks" },
  { key: "dashboard", label: "Student Dashboard", path: "/dashboard" },
  { key: "auth", label: "Login / Signup", path: "/auth" },
];

export default STATIC_PAGES;
