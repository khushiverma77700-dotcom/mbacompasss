// Centralized list of all public static pages for SEO, link aggregation, and admin tools.
// Add new pages here — they auto-appear in SEO Dashboard, Static Page SEO, and All Links.

export interface StaticPageDef {
  key: string;
  label: string;
  path: string;
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
  { key: "iim-waitlist-movement", label: "IIM Waitlist Movement 2026", path: "/iim-waitlist-movement" },
  { key: "cat-score-calculator", label: "CAT Score Calculator", path: "/cat-score-calculator" },
  { key: "mba-roi-calculator", label: "MBA ROI Calculator", path: "/mba-roi-calculator" },
  { key: "mba-programme-compare", label: "MBA Programme Compare", path: "/mba-programme-compare" },
  { key: "list-your-business", label: "List Your Business", path: "/list-your-business" },
  { key: "business-inquiry", label: "Business Inquiry", path: "/business-inquiry" },
  { key: "mocks", label: "Mock Tests", path: "/mocks" },
  { key: "dashboard", label: "Student Dashboard", path: "/dashboard" },
  { key: "auth", label: "Login / Signup", path: "/auth" },
];

export default STATIC_PAGES;
