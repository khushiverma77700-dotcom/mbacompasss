import { deadlineDays, deadlineTimestamp } from "@/lib/applicationDeadline";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared domain layer for the College & MBA Application Tracker.
 *
 * Everything the public tracker page, the student dashboard and the admin
 * "College Applications" module need lives here so the three surfaces stay in
 * sync (same query keys, same status vocabulary, same deadline maths).
 */

export type TrackerCategory = "exam" | "iim" | "tier1" | "tier2";

/** Frontend tab key — categories plus the curated Recommended tab. */
export type CategoryKey = "all" | TrackerCategory | "recommended";

export type TrackerFaq = { question: string; answer: string };

export type TrackerRow = {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  logo_url: string | null;
  category: string;
  tier: string | null;
  program: string | null;
  programs: string[];
  details_html: string | null;
  location: string | null;
  application_open_date: string | null;
  application_deadline: string | null;
  /** True when applications are open but the deadline is not disclosed. */
  deadline_tbd: boolean | null;
  application_fee: number | null;
  program_fee: number | null;
  accepted_exams: string[];
  apply_url: string | null;
  college_website: string | null;
  inside_info_url: string | null;
  inside_info_notes: string | null;
  short_description: string | null;
  eligibility: string | null;
  selection_process: string | null;
  cutoff_note: string | null;
  average_package: number | null;
  highest_package: number | null;
  median_package: number | null;
  is_recommended: boolean;
  recommendation_label: string | null;
  recommendation_note: string | null;
  recommendation_priority: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_h1: string | null;
  seo_intro: string | null;
  seo_keywords: string[];
  seo_faqs: TrackerFaq[];
  seo_image_alt: string | null;
  status: string;
  is_active: boolean;
  is_archived: boolean;
  display_order: number;
  /** Admin-controlled visibility order; lower numbers appear first. */
  sort_order: number | null;
  is_homepage_featured: boolean;
  homepage_order: number;
  view_count: number;
  apply_click_count: number;
  created_at?: string;
  updated_at?: string;
};


export type StudentApplicationRow = {
  id: string;
  user_id: string;
  tracker_id: string;
  status: string;
  fee_paid: boolean;
  fee_amount: number | null;
  notes: string | null;
  started_at: string | null;
  submitted_at: string | null;
  last_activity_at: string;
  created_at: string;
};

export type ActivityRow = {
  id: string;
  user_id: string;
  tracker_id: string | null;
  activity_type: string;
  tracker_name: string | null;
  student_name: string | null;
  student_email: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

/* ---------------------------------------------------------------- filters */

export type DeadlineFilterKey =
  | "all"
  | "today"
  | "this_week"
  | "next_15"
  | "open"
  | "closed";

export const DEADLINE_FILTERS: { key: DeadlineFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Deadline Today" },
  { key: "this_week", label: "Deadline This Week" },
  { key: "next_15", label: "Next 15 Days" },
  { key: "open", label: "Currently Open" },
  { key: "closed", label: "Closed" },
];

export const CATEGORY_FILTERS: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "exam", label: "Exams" },
  { key: "iim", label: "IIMs" },
  { key: "tier1", label: "Tier 1 Non-IIMs" },
  { key: "tier2", label: "Tier 2 Non-IIMs" },
  { key: "recommended", label: "Recommended Applications" },
];

/** Admin-side filter list (no curated tab). */
export const ADMIN_CATEGORY_FILTERS: { key: "all" | TrackerCategory; label: string }[] =
  CATEGORY_FILTERS.filter((c) => c.key !== "recommended") as { key: "all" | TrackerCategory; label: string }[];

/** URL slug ↔ category key, used by the indexable category landing pages. */
export const CATEGORY_SLUG: Record<TrackerCategory | "recommended", string> = {
  exam: "mba-entrance-exams",
  iim: "iim-applications",
  tier1: "tier-1-non-iim-colleges",
  tier2: "tier-2-non-iim-colleges",
  recommended: "recommended-applications",
};

export const categoryFromSlug = (slug: string): CategoryKey | null => {
  const hit = (Object.keys(CATEGORY_SLUG) as (TrackerCategory | "recommended")[]).find(
    (k) => CATEGORY_SLUG[k] === slug,
  );
  return hit ?? null;
};

export const CATEGORY_LABEL: Record<string, string> = {
  exam: "Exam",
  iim: "IIM",
  tier1: "Tier 1 Non-IIM",
  tier2: "Tier 2 Non-IIM",
};

/* --------------------------------------------------------------- statuses */

export const APPLICATION_STATUSES: { key: string; label: string }[] = [
  { key: "not_started", label: "Not Started" },
  { key: "started", label: "Started" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Submitted" },
  { key: "fee_paid", label: "Fee Paid" },
  { key: "interview", label: "Interview / Selection Stage" },
  { key: "offer_received", label: "Offer Received" },
  { key: "waitlisted", label: "Waitlisted" },
  { key: "rejected", label: "Rejected" },
  { key: "completed", label: "Completed" },
];

export const statusLabel = (key: string): string =>
  APPLICATION_STATUSES.find((s) => s.key === key)?.label ?? key;

export const ACTIVITY_TYPES: { key: string; label: string }[] = [
  { key: "login", label: "Logged in" },
  { key: "view", label: "Viewed college" },
  { key: "apply_click", label: "Clicked Apply Now" },
  { key: "application_started", label: "Started application" },
  { key: "status_change", label: "Updated status" },
  { key: "inside_info", label: "Opened Inside Information" },
];

export const activityLabel = (key: string): string =>
  ACTIVITY_TYPES.find((a) => a.key === key)?.label ?? key;

/* --------------------------------------------------------------- deadlines */

export type DeadlineTone = "today" | "urgent" | "soon" | "open" | "closed" | "unknown";

export type DeadlineInfo = {
  label: string;
  tone: DeadlineTone;
  daysLeft: number | null;
  isOpen: boolean;
};

export const daysUntil = deadlineDays;

/** Live status derived from the stored deadline — never stored, always computed. */
export const deadlineInfo = (row: Pick<TrackerRow, "application_deadline" | "status" | "deadline_tbd">, now = Date.now()): DeadlineInfo => {
  if (row.status === "closed") {
    return { label: "Applications Closed", tone: "closed", daysLeft: null, isOpen: false };
  }
  if (row.deadline_tbd && !row.application_deadline) {
    return { label: "Application Open", tone: "open", daysLeft: null, isOpen: true };
  }
  const days = daysUntil(row.application_deadline, now);
  const target = deadlineTimestamp(row.application_deadline);
  if (row.status === "upcoming") return { label: "Opening Soon", tone: "soon", daysLeft: days, isOpen: false };
  if (target !== null && target <= now) return { label: "Applications Closed", tone: "closed", daysLeft: days, isOpen: false };
  if (days === null) {
    return {
      label: row.status === "upcoming" ? "Opening Soon" : "Currently Open",
      tone: row.status === "upcoming" ? "soon" : "open",
      daysLeft: null,
      isOpen: row.status !== "upcoming",
    };
  }
  if (days < 0) return { label: "Applications Closed", tone: "closed", daysLeft: days, isOpen: false };
  if (days === 0) return { label: "Deadline Today", tone: "today", daysLeft: 0, isOpen: true };
  if (days <= 5) return { label: `${days} Day${days > 1 ? "s" : ""} Left`, tone: "urgent", daysLeft: days, isOpen: true };
  if (days <= 15) return { label: `${days} Days Left`, tone: "soon", daysLeft: days, isOpen: true };
  return { label: "Currently Open", tone: "open", daysLeft: days, isOpen: true };
};

export const matchesDeadlineFilter = (row: TrackerRow, filter: DeadlineFilterKey): boolean => {
  if (filter === "all") return true;
  const info = deadlineInfo(row);
  const days = info.daysLeft;
  switch (filter) {
    case "today":
      return days === 0;
    case "this_week":
      return days !== null && days >= 0 && days <= 7;
    case "next_15":
      return days !== null && days >= 0 && days <= 15;
    case "open":
      return info.isOpen;
    case "closed":
      return !info.isOpen;
    default:
      return true;
  }
};

export const matchesCategory = (row: TrackerRow, category: CategoryKey): boolean => {
  if (category === "all") return true;
  if (category === "recommended") return !!row.is_recommended;
  return row.category === category;
};

/** Exams that actually have data behind them, for the dynamic exam chips. */
export const examOptions = (rows: TrackerRow[]): string[] => {
  const set = new Set<string>();
  for (const row of rows) {
    for (const exam of row.accepted_exams ?? []) {
      const clean = exam.trim().toUpperCase();
      if (clean) set.add(clean);
    }
    if (row.category === "exam") {
      const clean = (row.short_name || row.name).trim().toUpperCase();
      if (clean && clean.length <= 10) set.add(clean);
    }
  }
  return [...set].sort();
};

export const matchesExam = (row: TrackerRow, exam: string | null): boolean => {
  if (!exam) return true;
  const target = exam.toUpperCase();
  if ((row.accepted_exams ?? []).some((e) => e.trim().toUpperCase() === target)) return true;
  if (row.category === "exam") {
    return (row.short_name || row.name).trim().toUpperCase() === target || row.name.toUpperCase().includes(target);
  }
  return false;
};

/* --------------------------------------------------- persistent filters */

export type TrackerPrefs = {
  deadline_filter: DeadlineFilterKey;
  category: CategoryKey;
  exam: string | null;
};

export const DEFAULT_PREFS: TrackerPrefs = { deadline_filter: "all", category: "all", exam: null };

const PREFS_KEY = "mba-application-filters";

export const readLocalPrefs = (): TrackerPrefs | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TrackerPrefs>;
    return {
      deadline_filter: (parsed.deadline_filter ?? "all") as DeadlineFilterKey,
      category: (parsed.category ?? "all") as CategoryKey,
      exam: parsed.exam ?? null,
    };
  } catch {
    return null;
  }
};

export const writeLocalPrefs = (prefs: TrackerPrefs): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // storage can be unavailable (private mode) — filters simply do not persist
  }
};

/** Logged-in students keep their filters on their profile so it follows devices. */
export const readRemotePrefs = async (userId: string): Promise<TrackerPrefs | null> => {
  const { data } = await supabase
    .from("application_filter_prefs")
    .select("deadline_filter, category, exam")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    deadline_filter: (data.deadline_filter ?? "all") as DeadlineFilterKey,
    category: (data.category ?? "all") as CategoryKey,
    exam: data.exam ?? null,
  };
};

export const writeRemotePrefs = async (userId: string, prefs: TrackerPrefs): Promise<void> => {
  try {
    await supabase.from("application_filter_prefs").upsert(
      {
        user_id: userId,
        deadline_filter: prefs.deadline_filter,
        category: prefs.category,
        exam: prefs.exam,
      } as never,
      { onConflict: "user_id" },
    );
  } catch {
    // preference saving must never break browsing
  }
};

/* ----------------------------------------------------------- formatting */

export const formatFee = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "Free";
  const n = Number(value);
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lakhs`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export const PROGRAM_OPTIONS = ["MBA", "PGDM", "MMS", "PGP", "Others"] as const;
export const EXAM_OPTIONS = ["CAT", "XAT", "NMAT", "SNAP", "CMAT", "MAT", "GMAT", "GRE", "MAH MBA CET", "CUET-PG", "ATMA", "IIFT", "TISSNET", "Other"] as const;
export const TIER_OPTIONS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"] as const;

/** Programs for a row, falling back to the retired single `program` text. */
export const rowPrograms = (row: Pick<TrackerRow, "programs" | "program">): string[] =>
  row.programs?.length ? row.programs : row.program ? [row.program] : [];

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* ------------------------------------------------------------- queries */

export const TRACKER_SELECT =
  "id, name, short_name, slug, logo_url, category, tier, program, location, application_open_date, application_deadline, deadline_tbd, sort_order, application_fee, program_fee, accepted_exams, apply_url, inside_info_url, inside_info_notes, short_description, status, is_active, is_archived, display_order, is_homepage_featured, homepage_order, view_count, apply_click_count, created_at, updated_at, college_website, eligibility, selection_process, cutoff_note, average_package, highest_package, median_package, is_recommended, recommendation_label, recommendation_note, recommendation_priority, seo_title, seo_description, seo_h1, seo_intro, seo_keywords, seo_faqs, seo_image_alt, programs, details_html";

/** Public catalogue (RLS already limits this to active, non-archived rows). */
export const publicTrackersQuery = queryOptions({
  queryKey: ["application-trackers", "public"],
  queryFn: async (): Promise<TrackerRow[]> => {
    const { data, error } = await supabase
      .from("application_trackers")
      .select(TRACKER_SELECT)
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true })
      .order("display_order", { ascending: true })
      .order("application_deadline", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return ((data ?? []) as unknown as TrackerRow[])
      .filter((r) => !!r.name?.trim() && !!r.slug?.trim())
      .map(normalizeTracker);
  },
  staleTime: 60 * 1000,
  refetchOnMount: "always",
  refetchInterval: 60 * 1000,
});

/** Fills in the nullable/JSON columns so components never guard for undefined. */
export const normalizeTracker = (row: TrackerRow): TrackerRow => ({
  ...row,
  accepted_exams: Array.isArray(row.accepted_exams) ? row.accepted_exams : [],
  seo_keywords: Array.isArray(row.seo_keywords) ? row.seo_keywords : [],
  seo_faqs: Array.isArray(row.seo_faqs) ? row.seo_faqs : [],
  is_recommended: !!row.is_recommended,
  deadline_tbd: !!row.deadline_tbd,
  sort_order: row.sort_order ?? 0,
  recommendation_priority: row.recommendation_priority ?? 0,
  is_homepage_featured: !!row.is_homepage_featured,
  homepage_order: row.homepage_order ?? 0,
});

/** Single application, used by the indexable college/exam landing pages. */
export const trackerBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["application-trackers", "slug", slug],
    queryFn: async (): Promise<TrackerRow | null> => {
      const { data, error } = await supabase
        .from("application_trackers")
        .select(TRACKER_SELECT)
        .eq("slug", slug)
        .eq("is_active", true)
        .eq("is_archived", false)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeTracker(data as unknown as TrackerRow) : null;
    },
    staleTime: 5 * 60 * 1000,
  });

/* ------------------------------------------------------------ tracking */

type LogArgs = {
  userId: string;
  activityType: string;
  trackerId?: string | null;
  trackerName?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  metadata?: Record<string, unknown>;
};

/** Fire-and-forget activity write. Never blocks the UI. */
export const logApplicationActivity = async (args: LogArgs): Promise<void> => {
  try {
    await supabase.from("application_activity").insert({
      user_id: args.userId,
      tracker_id: args.trackerId ?? null,
      activity_type: args.activityType,
      tracker_name: args.trackerName ?? null,
      student_name: args.studentName ?? null,
      student_email: args.studentEmail ?? null,
      metadata: (args.metadata ?? {}) as never,
    });
  } catch {
    // tracking must never break the student flow
  }
};

/** Adds UTM/source attribution to the official application URL. */
export const buildApplyUrl = (row: TrackerRow): string | null => {
  if (!row.apply_url) return null;
  try {
    const url = new URL(row.apply_url);
    if (!url.searchParams.has("utm_source")) url.searchParams.set("utm_source", "mbacompass");
    if (!url.searchParams.has("utm_medium")) url.searchParams.set("utm_medium", "application_tracker");
    if (!url.searchParams.has("utm_campaign")) url.searchParams.set("utm_campaign", "my-mba-2027");
    if (!url.searchParams.has("utm_content")) url.searchParams.set("utm_content", row.slug);
    return url.toString();
  } catch {
    return row.apply_url;
  }
};

/**
 * Records a tracked application for the student (idempotent per student+college),
 * logs the Apply Now click, bumps the college counter and returns the URL to open.
 */
export const startTrackedApplication = async (
  row: TrackerRow,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
): Promise<string | null> => {
  const studentName =
    (user.user_metadata?.["display_name"] as string | undefined) ||
    (user.user_metadata?.["full_name"] as string | undefined) ||
    user.email?.split("@")[0] ||
    null;

  const { data: existing } = await supabase
    .from("student_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("tracker_id", row.id)
    .maybeSingle();

  const nowIso = new Date().toISOString();

  if (!existing) {
    await supabase.from("student_applications").insert({
      user_id: user.id,
      tracker_id: row.id,
      status: "started",
      fee_amount: row.application_fee,
      started_at: nowIso,
      last_activity_at: nowIso,
    });
    await logApplicationActivity({
      userId: user.id,
      activityType: "application_started",
      trackerId: row.id,
      trackerName: row.name,
      studentName,
      studentEmail: user.email ?? null,
    });
  } else {
    await supabase
      .from("student_applications")
      .update({ last_activity_at: nowIso, status: existing.status === "not_started" ? "started" : existing.status })
      .eq("id", existing.id);
  }

  await logApplicationActivity({
    userId: user.id,
    activityType: "apply_click",
    trackerId: row.id,
    trackerName: row.name,
    studentName,
    studentEmail: user.email ?? null,
    metadata: { deadline: row.application_deadline, fee: row.application_fee },
  });

  void supabase.rpc("increment_tracker_counter", { _tracker_id: row.id, _field: "apply_click_count" });

  return buildApplyUrl(row);
};

/** Logs a college detail/inside-info view. Safe to call for guests (skipped). */
export const trackTrackerView = async (
  row: TrackerRow,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null,
  activityType: "view" | "inside_info" = "view",
): Promise<void> => {
  void supabase.rpc("increment_tracker_counter", { _tracker_id: row.id, _field: "view_count" });
  if (!user) return;
  await logApplicationActivity({
    userId: user.id,
    activityType,
    trackerId: row.id,
    trackerName: row.name,
    studentName:
      (user.user_metadata?.["display_name"] as string | undefined) || user.email?.split("@")[0] || null,
    studentEmail: user.email ?? null,
  });
};
