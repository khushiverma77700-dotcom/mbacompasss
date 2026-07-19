import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LS_KEY = (uid: string) => `student_nav_seen_${uid}`;
const BADGE_CACHE_KEY = (uid: string) => `student_nav_badges_v1_${uid}`;
const BADGE_QUERY_KEY = (uid?: string) => ["student-nav-badges", uid] as const;

type Seen = Record<string, string>;
type Counts = Record<string, number>;

export type StudentNavBadges = {
  counts: Counts;
  markSeen: (route: string) => void;
};

async function fetchBadgeCounts(userId: string, seen: Seen): Promise<Counts> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const cutoff30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const seenDaily = seen["/student/daily-test"] ?? "1970-01-01";
  const seenMocks = seen["/student/mocks"] ?? "1970-01-01";
  const seenSupport = seen["/student/support"] ?? "1970-01-01";

  const [dailyRes, enrollRes, attemptsRes, notifRes, supportRes] = await Promise.all([
    supabase.from("daily_test_assignments")
      .select("assigned_date, test_id, created_at")
      .lte("assigned_date", todayStr)
      .gte("assigned_date", cutoff30),
    supabase.from("mock_enrollments")
      .select("test_id, enrolled_at, expires_at")
      .eq("user_id", userId),
    supabase.from("mock_attempts")
      .select("test_id, status")
      .eq("user_id", userId)
      .in("status", ["submitted", "auto_submitted"]),
    supabase.from("student_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .neq("type", "daily_test"),
    supabase.from("support_tickets")
      .select("id, updated_at, last_admin_reply_at, status")
      .eq("user_id", userId)
      .gt("updated_at", seenSupport),
  ]);

  const attemptedSet = new Set((attemptsRes.data ?? []).map((a: any) => a.test_id));

  const dailyNew = (dailyRes.data ?? []).filter((d: any) => {
    const ts = d.created_at ?? d.assigned_date;
    return ts > seenDaily && !attemptedSet.has(d.test_id);
  }).length;

  const validEnrolls = (enrollRes.data ?? []).filter((e: any) =>
    !e.expires_at || new Date(e.expires_at) > new Date()
  );
  const mocksNew = validEnrolls.filter((e: any) =>
    !attemptedSet.has(e.test_id) && (e.enrolled_at ?? "") > seenMocks
  ).length;

  return {
    "/student/daily-test": dailyNew,
    "/student/mocks": mocksNew,
    "/student/notifications": notifRes.count ?? 0,
    "/student/support": (supportRes.data ?? []).length,
  };
}

export function useStudentNavBadges(): StudentNavBadges {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [seen, setSeen] = useState<Seen>({});

  // Load "seen" timestamps from localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(LS_KEY(user.id));
      setSeen(raw ? JSON.parse(raw) : {});
    } catch { setSeen({}); }
  }, [user?.id]);

  // Hydrate from sessionStorage for instant paint on subsequent visits
  const initialCounts = useMemo<Counts | undefined>(() => {
    if (!user?.id || typeof window === "undefined") return undefined;
    try {
      const raw = sessionStorage.getItem(BADGE_CACHE_KEY(user.id));
      return raw ? JSON.parse(raw) : undefined;
    } catch { return undefined; }
  }, [user?.id]);

  const { data: counts = {} } = useQuery({
    queryKey: BADGE_QUERY_KEY(user?.id),
    queryFn: () => fetchBadgeCounts(user!.id, seen),
    enabled: !!user?.id,
    // 2min stale — subsequent nav mounts within window are served from cache
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
    initialData: initialCounts,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Persist to sessionStorage for next-mount instant paint
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    if (!counts || !Object.keys(counts).length) return;
    try { sessionStorage.setItem(BADGE_CACHE_KEY(user.id), JSON.stringify(counts)); } catch {}
  }, [user?.id, counts]);

  const markSeen = (route: string) => {
    if (!user) return;
    const next = { ...seen, [route]: new Date().toISOString() };
    setSeen(next);
    try { localStorage.setItem(LS_KEY(user.id), JSON.stringify(next)); } catch {}
    // Optimistically zero the count and invalidate so the next refocus refetches fresh.
    qc.setQueryData(BADGE_QUERY_KEY(user.id), (prev: Counts | undefined) => ({
      ...(prev ?? {}),
      [route]: 0,
    }));
    try {
      sessionStorage.setItem(
        BADGE_CACHE_KEY(user.id),
        JSON.stringify({ ...(counts ?? {}), [route]: 0 })
      );
    } catch {}
  };

  return { counts, markSeen };
}
