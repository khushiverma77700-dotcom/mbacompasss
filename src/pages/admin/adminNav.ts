// Single source of truth for the admin sidebar AND the permission picker.
// Adding a new admin page here makes it visible in both places automatically.

import {
  LayoutDashboard, Building2, BookOpen, Image, Newspaper, MessageSquare,
  GraduationCap, Mail, FileText, Tag, Menu, Settings, MessageCircle, Trophy,
  Ticket, Star, BarChart3, MapPin, Trash2, Users, Globe, Link2, GitCompare,
  TrendingUp, Sparkles, ShieldCheck, Briefcase, Target, PhoneCall, Database,
  Activity, Calculator, Bell, RefreshCw, PenLine, ClipboardList, Package, KeyRound,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  path: string;
  icon: any;
  dotKey?: string;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
      { label: "Site Settings", path: "/admin/site-settings", icon: Settings },
    ],
  },
  {
    label: "Institutes & Coaching",
    items: [
      { label: "Coaching Institutes", path: "/admin/coaching-institutes", icon: Building2 },
      { label: "Institutes (legacy)", path: "/admin/institutes", icon: Building2 },
      { label: "Courses", path: "/admin/courses", icon: BookOpen },
      { label: "Course Categories", path: "/admin/course-categories", icon: Tag },
      { label: "Coaching of Week", path: "/admin/coaching-of-week", icon: Trophy },
      { label: "Coaching Performance Stats", path: "/admin/coaching-results", icon: TrendingUp },
      { label: "Institute Placement Results", path: "/admin/institute-results", icon: BarChart3 },
      { label: "Comparisons", path: "/admin/comparisons", icon: GitCompare },
    ],
  },
  {
    label: "Colleges & Exams",
    items: [
      { label: "Colleges", path: "/admin/colleges", icon: GraduationCap },
      { label: "College Sections", path: "/admin/college-sections", icon: Star },
      { label: "Shortlister Colleges", path: "/admin/shortlister-colleges", icon: Target },
      { label: "Exams", path: "/admin/exams", icon: FileText },
      { label: "Categories", path: "/admin/categories", icon: Tag },
      { label: "Specializations", path: "/admin/specializations", icon: Tag },
    ],
  },
  {
    label: "Mock Platform",
    items: [
      // Primary 4
      { label: "Courses", path: "/admin/mba-compass-courses", icon: BookOpen },
      { label: "Bundles", path: "/admin/mock-bundles", icon: Package },
      { label: "Mocks", path: "/admin/mock-tests", icon: ClipboardList },
      { label: "Students", path: "/admin/student-mocks", icon: Users },
      // Secondary tools
      { label: "Mocks Landing Page", path: "/admin/mocks-landing", icon: ClipboardList },
      { label: "Personalized Hub", path: "/admin/personalized-hub", icon: Sparkles },
      { label: "Daily Tests", path: "/admin/daily-tests", icon: ClipboardList },
      { label: "Student Announcements", path: "/admin/student-announcements", icon: Bell },
      { label: "Push Notifications", path: "/admin/student-notifications", icon: Bell },
    ],
  },
  {
    label: "Content & Media",
    items: [
      { label: "Banners", path: "/admin/banners", icon: Image },
      { label: "Articles", path: "/admin/articles", icon: Newspaper },
      { label: "Testimonials", path: "/admin/testimonials", icon: MessageCircle },
      { label: "Coupons", path: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    label: "Leads & Inquiries",
    items: [
      { label: "Callback Requests", path: "/admin/callbacks", icon: PhoneCall, dotKey: "callbacks" },
      { label: "Inquiries", path: "/admin/inquiries", icon: MessageSquare, dotKey: "inquiries" },
      { label: "Student Leads", path: "/admin/leads", icon: Users, dotKey: "leads" },
      { label: "Master Data", path: "/admin/all-leads-unified", icon: Database, dotKey: "master" },
      { label: "Subscribers", path: "/admin/subscribers", icon: Mail, dotKey: "subscribers" },
      { label: "Business Inquiries", path: "/admin/business-inquiries", icon: Briefcase, dotKey: "business" },
      { label: "User Submissions", path: "/admin/user-submissions", icon: ShieldCheck, dotKey: "submissions" },
      { label: "Listing Edit Requests", path: "/admin/listing-change-requests", icon: GitCompare, dotKey: "changeRequests" },
    ],
  },
  {
    label: "SEO & AI Tools",
    items: [
      { label: "Page Editor & SEO", path: "/admin/page-editor", icon: PenLine },
      { label: "AI SEO Dashboard", path: "/admin/seo-dashboard", icon: Sparkles },
      { label: "Website Optimizer", path: "/admin/website-optimizer", icon: Sparkles },
      { label: "Static Page SEO", path: "/admin/static-seo", icon: Globe },
      { label: "Google Indexing", path: "/admin/google-indexing", icon: Globe },
      { label: "Indexing Audit", path: "/admin/indexing-audit", icon: ShieldCheck },
      { label: "Indexing Requeue", path: "/admin/indexing-requeue", icon: RefreshCw },
      { label: "Old-Domain Audit", path: "/admin/domain-audit", icon: ShieldCheck },
      { label: "Meta Tag Validator", path: "/admin/meta-validator", icon: ShieldCheck },
      { label: "DNS Propagation Status", path: "/admin/dns-status", icon: Globe },
      { label: "Sitemap", path: "/admin/sitemap", icon: MapPin },
      { label: "All Site Links", path: "/admin/all-links", icon: Link2 },
      { label: "Profile Analyzer", path: "/admin/profile-analyzer", icon: BarChart3 },
      { label: "CAT Score Submissions", path: "/admin/cat-scores", icon: Calculator },
      { label: "MBA ROI Analyses", path: "/admin/roi-analyses", icon: TrendingUp },
      { label: "Citation Sources Audit", path: "/admin/citations-audit", icon: Link2 },
      { label: "Content Studio (All-in-one)", path: "/admin/content-studio", icon: Sparkles },
      { label: "Content Refresh Queue", path: "/admin/content-refreshes", icon: RefreshCw },
      { label: "Bulk Refresh Content", path: "/admin/bulk-refresh", icon: Sparkles },
      { label: "Bulk AI Editor", path: "/admin/bulk-ai-edit", icon: Sparkles },
      { label: "Hyperlink Update", path: "/admin/hyperlink-update", icon: Link2 },
      { label: "IIM Waitlist & RTI", path: "/admin/iim-waitlist", icon: TrendingUp },
    ],
  },
  {
    label: "System & Admin",
    items: [
      { label: "Mega Menu", path: "/admin/mega-menu", icon: Menu },
      { label: "Manage Admins", path: "/admin/manage-admins", icon: ShieldCheck },
      { label: "Database Backup", path: "/admin/database-backup", icon: Database },
      { label: "AI & Cloud Usage", path: "/admin/ai-usage", icon: Activity },
      { label: "API Keys & Secrets", path: "/admin/api-keys", icon: KeyRound },
      { label: "Safe Browsing Guide", path: "/admin/safe-browsing-guide", icon: ShieldCheck },
      { label: "Clear Caches", path: "/admin/clear-cache", icon: Trash2 },
    ],
  },
];

// Flat list for permission checks / lookups
export const allAdminNavItems: AdminNavItem[] = adminNavGroups.flatMap((g) => g.items);
export const allAdminPaths: string[] = allAdminNavItems.map((i) => i.path);
