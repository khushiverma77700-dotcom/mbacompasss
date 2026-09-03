import React, { useEffect } from "react";
import { Navigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import StudentShellFallback from "@/components/student/StudentShellFallback";

/**
 * Gate the /demo experience behind a real signed-in account. StudentLogin
 * requires an OTP-verified mobile number, so this doubles as OTP gating.
 * Also captures a demo lead (once per user) and mirrors it into master leads.
 * Ported verbatim from the pre-migration src/App.tsx.
 */
const DemoAuthGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const key = `demo_lead_logged:${user.id}`;
        if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, phone")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        const meta = (user.user_metadata ?? {}) as { display_name?: string; phone?: string };
        const row = (profile ?? null) as { display_name?: string | null; phone?: string | null } | null;
        const name = row?.display_name || meta.display_name || null;
        const phone = row?.phone || meta.phone || null;
        const email = user.email || null;
        const referrer = typeof document !== "undefined" ? document.referrer : null;
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
        await supabase.from("demo_leads" as never).insert({
          user_id: user.id,
          name,
          email,
          phone,
          source: "demo_dashboard",
          referrer,
          user_agent: ua,
        } as never);
        // Mirror into master leads so it appears in AdminAllLeads unified view.
        if (email) {
          await supabase.from("inquiries").insert({
            name: name || "Demo user",
            email,
            phone,
            type: "demo",
            message: "Tried the demo dashboard",
          } as never);
        }
        if (typeof window !== "undefined") sessionStorage.setItem(key, "1");
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return <StudentShellFallback />;
  }
  if (!user) {
    return (
      <Navigate
        to={`/auth?mode=signup&redirect=${encodeURIComponent("/demo")}&reason=demo`}
        replace
      />
    );
  }
  return <>{children}</>;
};

export default DemoAuthGate;
