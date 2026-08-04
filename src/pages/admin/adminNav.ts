// Single source of truth for the admin sidebar AND the permission picker.
// Adding a new admin page here makes it visible in both places automatically.

import {
  LayoutDashboard, Building2, BookOpen, Image, Newspaper, MessageSquare,
  GraduationCap, Mail, FileText, Tag, Menu, Settings, MessageCircle, Trophy,
  Ticket, Star, BarChart3, MapPin, Trash2, Users, Globe, Link2, GitCompare,
  TrendingUp, Sparkles, ShieldCheck, Briefcase, Target, PhoneCall, Database,
  Activity, Calculator, Bell, RefreshCw, PenLine, ClipboardList, Package, KeyRound, ShoppingCart, CalendarClock, FileCode,
  Gift, Send,
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
      { label: "Courses", path: "/admin/courses", icon: BookOpen },
      { label: "Bulk AI Courses", path: "/admin/courses/bulk-generate", icon: Sparkles },
      { label: "Bulk SEO (Advanced)", path: "/admin/bulk-seo", icon: Sparkles },
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
      { label: "College Programmes", path: "/admin/programmes", icon: BookOpen },
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
      { label: "Bulk AI Mock Generation", path: "/admin/bulk-mock-generation", icon: Sparkles },
      { label: "✨ Fix Explanations (AI)", path: "/admin/explanation-cleaner", icon: Sparkles },
      { label: "Users", path: "/admin/users", icon: Users },
      { label: "Students", path: "/admin/student-mocks", icon: Users },
      { label: "Demo Leads", path: "/admin/demo-leads", icon: Users },

      { label: "Orders", path: "/admin/mock-orders", icon: ShoppingCart },
      { label: "Support Tickets", path: "/admin/support-tickets", icon: Ticket, dotKey: "supportTickets" },
      // Secondary tools
      { label: "Mocks Landing Page", path: "/admin/mocks-landing", icon: ClipboardList },
      { label: "Personalized Hub", path: "/admin/personalized-hub", icon: Sparkles },
      { label: "Vocabulary Hub", path: "/admin/vocabulary", icon: BookOpen },
      { label: "News & Insights", path: "/admin/newsroom", icon: Sparkles },
      { label: "Quant Formula Book", path: "/admin/formulas", icon: BookOpen },
      { label: "Daily Tests", path: "/admin/daily-tests", icon: ClipboardList },
      { label: "Exam Countdowns", path: "/admin/exam-countdowns", icon: CalendarClock },
      { label: "Push Notifications", path: "/admin/student-notifications", icon: Bell },
    ],
  },
  {
    label: "MBA Newsroom",
    items: [
      { label: "Newsroom Ticker Bar", path: "/admin/mba-newsroom-bar", icon: Newspaper },
      { label: "News & Insights Articles", path: "/admin/newsroom", icon: Sparkles },
    ],
  },
  {
    label: "Homepage Tables",
    items: [
      { label: "Tables Manager (All-in-one)", path: "/admin/tables-manager", icon: Database },
      { label: "College Tables (Ranked)", path: "/admin/college-tables", icon: GraduationCap },
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
    label: "Freebies",
    items: [
      { label: "Manage Freebies", path: "/admin/freebies", icon: Gift },
      { label: "Download Logs", path: "/admin/freebies/downloads", icon: FileText },
      { label: "Unique Users", path: "/admin/freebies/users", icon: Users },
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
      { label: "Meritto Integration", path: "/admin/meritto-logs", icon: Send },
    ],
  },
  {
    label: "SEO & AI Tools",
    items: [
      { label: "Page Editor & SEO", path: "/admin/page-editor", icon: PenLine },
      { label: "AI SEO Dashboard", path: "/admin/seo-dashboard", icon: Sparkles },
      { label: "Re-SEO Optimizer", path: "/admin/seo-dashboard?tab=reseo", icon: RefreshCw },
      { label: "CTR Optimizer", path: "/admin/ctr-optimizer", icon: TrendingUp },
      { label: "Website Optimizer", path: "/admin/website-optimizer", icon: Sparkles },
      { label: "Static Page SEO", path: "/admin/static-seo", icon: Globe },
      { label: "Meta Tag Validator", path: "/admin/meta-validator", icon: ShieldCheck },
      { label: "Weekly SEO Health Check", path: "/admin/seo-health-check", icon: Activity },
      { label: "Image SEO Automation", path: "/admin/image-seo", icon: Image },
      { label: "Sitemap", path: "/admin/sitemap", icon: MapPin },
      { label: "Sitemap Health Check", path: "/admin/sitemap-health", icon: Activity },
      { label: "All Site Links", path: "/admin/all-links", icon: Link2 },
      { label: "Profile Analyzer", path: "/admin/profile-analyzer", icon: BarChart3 },
      { label: "CAT Score Submissions", path: "/admin/cat-scores", icon: Calculator },
      { label: "MBA ROI Analyses", path: "/admin/roi-analyses", icon: TrendingUp },
      // Citation Sources Audit removed
      { label: "Content Studio (All-in-one)", path: "/admin/content-studio", icon: Sparkles },
      { label: "Content Refresh Queue", path: "/admin/content-refreshes", icon: RefreshCw },
      { label: "Master Refresh (All Content)", path: "/admin/master-refresh", icon: Sparkles },
      { label: "Content Pruning (AI Auditor)", path: "/admin/content-pruning", icon: Trash2 },
      { label: "Reverse Siloing Engine", path: "/admin/reverse-siloing", icon: Link2 },
      { label: "AI SEO Automation Suite", path: "/admin/seo-engines", icon: Activity },
      { label: "Official Source Domains", path: "/admin/source-domains", icon: ShieldCheck },
      { label: "Bulk Refresh Content", path: "/admin/bulk-refresh", icon: Sparkles },
      { label: "Bulk AI Editor", path: "/admin/bulk-ai-edit", icon: Sparkles },
      { label: "Hyperlink Update", path: "/admin/hyperlink-update", icon: Link2 },
      { label: "IIM Waitlist & RTI", path: "/admin/iim-waitlist", icon: TrendingUp },
    ],
  },
  {
    label: "Pages",
    items: [
      { label: "CAT Mock 1 (/cat-mock-1)", path: "/admin/pages/cat-mock-1", icon: FileCode },
    ],
  },
  {
    label: "System & Admin",
    items: [
      { label: "Mega Menu", path: "/admin/mega-menu", icon: Menu },
      { label: "Manage Admins", path: "/admin/manage-admins", icon: ShieldCheck },
      { label: "CTA Login Manager", path: "/admin/cta-manager", icon: ShieldCheck },
      { label: "CTA Click Analytics", path: "/admin/cta-analytics", icon: BarChart3 },
      { label: "Database Backup", path: "/admin/database-backup", icon: Database },
      { label: "AI & Cloud Usage", path: "/admin/ai-usage", icon: Activity },
      { label: "API Keys & Secrets", path: "/admin/api-keys", icon: KeyRound },
      // Welcome Email automation removed
      { label: "Safe Browsing Guide", path: "/admin/safe-browsing-guide", icon: ShieldCheck },
      { label: "Clear Caches", path: "/admin/clear-cache", icon: Trash2 },
    ],
  },
];

// Flat list for permission checks / lookups
export const allAdminNavItems: AdminNavItem[] = adminNavGroups.flatMap((g) => g.items);
export const allAdminPaths: string[] = allAdminNavItems.map((i) => i.path);
