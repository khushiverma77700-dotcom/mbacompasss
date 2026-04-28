import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LS_KEY = (uid: string) => `student_nav_seen_${uid}`;

type Seen = Record<string, string>; // route -> ISO timestamp last viewed

export type StudentNavBadges = {
  counts: Record<string, number>;
  markSeen: (route: string) => void;
};

export function useStudentNavBadges(): StudentNavBadges {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [seen, setSeen] = useState<Seen>({});

  // Load "seen" timestamps from localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(LS_KEY(user.id));
      setSeen(raw ? JSON.parse(raw) : {});
    } catch { setSeen({}); }
  }, [user?.id]);

  const markSeen = (route: string) => {
    if (!user) return;
    const next = { ...seen, [route]: new Date().toISOString() };
    setSeen(next);
    try { localStorage.setItem(LS_KEY(user.id), JSON.stringify(next)); } catch {}
    setCounts((c) => ({ ...c, [route]: 0 }));
  };

  // Compute counts
  useEffect(() => {
    if (!user) return;
    let alive = true;

    const compute = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const cutoff30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const seenDaily = seen["/student/daily-test"] ?? "1970-01-01";
      const seenMocks = seen["/student/mocks"] ?? "1970-01-01";
      const seenAnn = seen["/student/announcements"] ?? "1970-01-01";

      const [dailyRes, enrollRes, attemptsRes, annRes] = await Promise.all([
        // Daily tests scheduled in last 30d
        supabase.from("daily_test_assignments")
          .select("assigned_date, test_id, created_at")
          .lte("assigned_date", todayStr)
          .gte("assigned_date", cutoff30),
        // Mocks assigned to student
        supabase.from("mock_enrollments")
          .select("test_id, enrolled_at, expires_at")
          .eq("user_id", user.id),
        // Submitted attempts to figure out unattempted
        supabase.from("mock_attempts")
          .select("test_id, status")
          .eq("user_id", user.id)
          .in("status", ["submitted", "auto_submitted"]),
        // Announcements
        supabase.from("announcements" as any)
          .select("id, created_at, published")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (!alive) return;

      const attemptedSet = new Set((attemptsRes.data ?? []).map((a: any) => a.test_id));

      // Daily test new: any assignment newer than seen and unattempted
      const dailyNew = (dailyRes.data ?? []).filter((d: any) => {
        const ts = d.created_at ?? d.assigned_date;
        return ts > seenDaily && !attemptedSet.has(d.test_id);
      }).length;

      // My Mocks: enrolled but not attempted, enrolled after last seen
      const validEnrolls = (enrollRes.data ?? []).filter((e: any) =>
        !e.expires_at || new Date(e.expires_at) > new Date()
      );
      const mocksNew = validEnrolls.filter((e: any) =>
        !attemptedSet.has(e.test_id) && (e.enrolled_at ?? "") > seenMocks
      ).length;

      // Announcements: published & created after last seen
      const annNew = (annRes.data ?? [])
        .filter((a: any) => (a.published ?? true) && a.created_at > seenAnn).length;

      setCounts({
        "/student/daily-test": dailyNew,
        "/student/mocks": mocksNew,
        "/student/announcements": annNew,
      });
    };

    compute();
    const t = setInterval(compute, 60_000); // refresh every minute
    return () => { alive = false; clearInterval(t); };
  }, [user?.id, seen]);

  return { counts, markSeen };
}
