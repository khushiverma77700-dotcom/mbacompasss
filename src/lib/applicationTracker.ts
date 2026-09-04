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

export type TrackerRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  category: string;
  tier: string | null;
  program: string | null;
  location: string | null;
  application_open_date: string | null;
  application_deadline: string | null;
  application_fee: number | null;
  program_fee: number | null;
  accepted_exams: string[];
  apply_url: string | null;
  inside_info_url: string | null;
  inside_info_notes: string | null;
  short_description: string | null;
  status: string;
  is_active: boolean;
  is_archived: boolean;
  display_order: number;
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

export const CATEGORY_FILTERS: { key: "all" | TrackerCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "exam", label: "Exams" },
  { key: "iim", label: "IIMs" },
  { key: "tier1", label: "Tier 1 Non-IIMs" },
  { key: "tier2", label: "Tier 2 Non-IIMs" },
];

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

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Days between today and the deadline, both clamped to local midnight. */
export const daysUntil = (deadline: string | null | undefined): number | null => {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  const diff = startOfDay(d).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / 86_400_000);
};

/** Live status derived from the stored deadline — never stored, always computed. */
export const deadlineInfo = (row: Pick<TrackerRow, "application_deadline" | "status">): DeadlineInfo => {
  if (row.status === "closed") {
    return { label: "Applications Closed", tone: "closed", daysLeft: null, isOpen: false };
  }
  const days = daysUntil(row.application_deadline);
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
  if (days <= 3) return { label: `${days} Day${days > 1 ? "s" : ""} Left`, tone: "urgent", daysLeft: days, isOpen: true };
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

export const matchesCategory = (row: TrackerRow, category: "all" | TrackerCategory): boolean =>
  category === "all" || row.category === category;

/* ----------------------------------------------------------- formatting */

export const formatFee = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "Free";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* ------------------------------------------------------------- queries */

export const TRACKER_SELECT =
  "id, name, slug, logo_url, category, tier, program, location, application_open_date, application_deadline, application_fee, program_fee, accepted_exams, apply_url, inside_info_url, inside_info_notes, short_description, status, is_active, is_archived, display_order, view_count, apply_click_count, created_at, updated_at";

/** Public catalogue (RLS already limits this to active, non-archived rows). */
export const publicTrackersQuery = queryOptions({
  queryKey: ["application-trackers", "public"],
  queryFn: async (): Promise<TrackerRow[]> => {
    const { data, error } = await supabase
      .from("application_trackers")
      .select(TRACKER_SELECT)
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("display_order", { ascending: true })
      .order("application_deadline", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return ((data ?? []) as unknown as TrackerRow[]).filter((r) => !!r.name?.trim() && !!r.slug?.trim());
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
