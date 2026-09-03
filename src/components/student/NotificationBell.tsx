import { useEffect, useState, useCallback } from "react";
import { Link } from "@/lib/router-compat";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Lightweight unread badge.
 *
 * Was previously holding an always-open realtime WebSocket per user (1000
 * users = 1000 idle sockets on the server). Now it just fetches the count:
 *   - on mount
 *   - when the tab becomes visible again
 *   - every 2 min as a slow safety poll
 * This is more than fast enough for a notification bell.
 */
export default function NotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    const { count: c } = await supabase
      .from("student_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .neq("type", "daily_test");
    setCount(c ?? 0);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    const id = window.setInterval(load, 120_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
      window.clearInterval(id);
    };
  }, [user, load]);

  return (
    <Link to="/student/notifications" className="relative p-2 rounded-md hover:bg-sky-50" aria-label="Notifications">
      <Bell className="h-5 w-5 text-gray-700" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
