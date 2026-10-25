import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useLocation } from "@/lib/router-compat";
import type { User, Session } from "@supabase/supabase-js";
import { clearStudentMode } from "@/lib/studentModeNav";

const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — session-scoped, expires fast so a tampered cache cannot persistently fake admin

const clearAdminCache = (userId?: string) => {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.sessionStorage.removeItem(`mbc-admin-status:${userId}`);
      window.localStorage.removeItem(`mbc-admin-status:${userId}`); // clear legacy persistent cache
      return;
    }
    for (const store of [window.sessionStorage, window.localStorage]) {
      for (const key of Object.keys(store)) {
        if (key.startsWith("mbc-admin-status:")) store.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
};

type AdminCacheEntry = {
  isAdmin: boolean;
  allowedSections: string[] | null;
  expiresAt: number;
};

const getAdminCacheKey = (userId: string) => `mbc-admin-status:${userId}`;

const shouldResolveAdminForPath = (path: string) =>
  path.startsWith("/admin") ||
  path.startsWith("/tools/profile-analyzer") ||
  path.startsWith("/tools/roi-calculator") ||
  path.startsWith("/tools/iim-waitlist-movement");

const readAdminCache = (userId: string): AdminCacheEntry | null => {
  if (typeof window === "undefined") return null;
  try {
    // Only read from sessionStorage; purge any legacy localStorage entry so a
    // tampered persistent value cannot keep faking admin across tabs/reloads.
    try { window.localStorage.removeItem(getAdminCacheKey(userId)); } catch { /* ignore */ }
    const raw = window.sessionStorage.getItem(getAdminCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminCacheEntry;
    if (!parsed || typeof parsed.expiresAt !== "number") return null;
    // Hard-expire: never return stale entries — server revalidation must run.
    if (Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeAdminCache = (userId: string, value: Omit<AdminCacheEntry, "expiresAt">) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      getAdminCacheKey(userId),
      JSON.stringify({ ...value, expiresAt: Date.now() + ADMIN_CACHE_TTL_MS })
    );
  } catch {
    // Ignore storage failures; backend/RLS remains authoritative.
  }
};

const readStoredSession = (): Session | null => {
  if (typeof window === "undefined") return null;
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const value = JSON.parse(window.localStorage.getItem(key) || "null");
      const session = (value?.currentSession ?? value) as Session | null;
      if (session?.access_token && session?.user) return session;
    }
  } catch {
    return null;
  }
  return null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  allowedSections: string[] | null; // null = full access (super admin)
  signUp: (email: string, password: string, displayName: string, phone?: string, designation?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  // The server cannot read browser storage, so begin from the same state on
  // both sides. Reading a saved session during the first client render caused
  // React to discard the server dashboard shell and rebuild the whole page.
  const initialSession = useRef<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [allowedSections, setAllowedSections] = useState<string[] | null>(null);
  const resolvedAdminUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // On role-gated pages (admin), never give up waiting for the session after a
    // short timeout — doing so treated a slow refresh as "signed out" and sent
    // admins to /auth. Allow a much longer safety window there.
    const roleGated = shouldResolveAdminForPath(window.location.pathname);
    const bootTimeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, roleGated ? 10000 : 1200);

    const applySession = (nextSession: Session | null) => {
      if (cancelled) return;

      setSession((prev) =>
        prev?.access_token === nextSession?.access_token ? prev : nextSession
      );
      setUser((prev) => {
        const nextUser = nextSession?.user ?? null;
        if (prev?.id === nextUser?.id) return prev;
        // Hold admin guards in "loading" in the same commit the user appears,
        // so they don't redirect before the role check starts.
        if (nextUser && shouldResolveAdminForPath(window.location.pathname)) setAdminLoading(true);
        return nextUser;
      });
      window.clearTimeout(bootTimeout);
      setLoading(false);
    };

    // Restore the browser's last verified session immediately after hydration;
    // the network refresh below then confirms it without delaying first paint.
    const storedSession = readStoredSession();
    if (storedSession) {
      // Hold role-gated routes on "loading" in the SAME commit that sets the
      // user; otherwise admin guards see user && !isAdmin and redirect to /auth
      // before the admin-status effect can start.
      if (shouldResolveAdminForPath(window.location.pathname)) setAdminLoading(true);
      applySession(storedSession);
    }

    let subscription: { unsubscribe: () => void } | undefined;
    let cancelIdleStart: (() => void) | undefined;
    const shouldStartAuthNow = () => {
      const path = window.location.pathname;
      const host = window.location.hostname;
      // dashboard.mbacompass.in lives at "/" — auth must start immediately
      // or the LMS shell sits in a skeleton state for ~3.5s.
      if (host === "dashboard.mbacompass.in") return true;
      return path.startsWith("/admin") || path.startsWith("/student") || path.startsWith("/auth") || path.startsWith("/demo") ||
        path.startsWith("/dashboard") || path.startsWith("/tools/profile-analyzer") || path.startsWith("/mocks");
    };
    const startAuth = () => import("@/integrations/supabase/client")
      .then(async ({ supabase }) => {
        if (cancelled) return;
        // Install the shared upload patch only once the account client is needed,
        // rather than importing that client in every public router entry.
        const { installUploadCompression } = await import("@/lib/imageCompression");
        installUploadCompression();
        if (cancelled) return;
        subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
          applySession(nextSession);
        }).data.subscription;

        supabase.auth.getSession()
          .then(({ data: { session: nextSession } }) => applySession(nextSession))
          .catch(() => applySession(null));
      })
      .catch(() => applySession(null));

    if (shouldStartAuthNow()) {
      void startAuth();
    } else {
      const timer = globalThis.setTimeout(() => {
        if (typeof (window as any).requestIdleCallback === "function") {
          const handle = (window as any).requestIdleCallback(() => void startAuth(), { timeout: 2500 });
          cancelIdleStart = () => (window as any).cancelIdleCallback?.(handle);
        } else {
          void startAuth();
        }
      }, 3500);
      cancelIdleStart = () => globalThis.clearTimeout(timer);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimeout);
      try { cancelIdleStart?.(); } catch {}
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAdminStatus = async () => {
      if (!user) {
        resolvedAdminUserIdRef.current = null;
        setIsAdmin(false);
        setAllowedSections(null);
        setAdminLoading(false);
        return;
      }

      if (
        typeof window !== "undefined" &&
        (window.location.hostname === "dashboard.mbacompass.in" ||
          window.location.pathname.startsWith("/student") ||
          window.location.pathname.startsWith("/demo"))
      ) {
        resolvedAdminUserIdRef.current = null;
        setIsAdmin(false);
        setAllowedSections(null);
        setAdminLoading(false);
        return;
      }

      if (resolvedAdminUserIdRef.current === user.id) {
        setAdminLoading(false);
        return;
      }
      resolvedAdminUserIdRef.current = user.id;

      const cached = readAdminCache(user.id);
      if (cached && cached.isAdmin === false) {
        // Safe to trust a "not admin" cache — at worst delays granting admin to a freshly-promoted user.
        setIsAdmin(false);
        setAllowedSections(null);
        setAdminLoading(false);
      } else {
        // For positive (isAdmin=true) or missing cache, NEVER render admin UI until the
        // server-side role check completes. This blocks tampered sessionStorage values
        // from letting a non-admin briefly see admin pages.
        setAdminLoading(true);
      }


      try {
        const { supabase } = await import("@/integrations/supabase/client");
        // On a hard refresh the saved access token may be expired. Wait for the
        // client to refresh it first, otherwise the role check fails and the
        // admin is wrongly sent to the sign-in page.
        try { await supabase.auth.getSession(); } catch { /* ignore */ }
        const runCheck = () => Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle(),
          supabase
            .from("admin_permissions")
            .select("allowed_sections, is_full_access")
            .eq("email", user.email?.toLowerCase() || "")
            .maybeSingle(),
        ]);
        let [rolesRes, permRes] = await runCheck();
        for (let attempt = 0; rolesRes.error && attempt < 3 && !cancelled; attempt++) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          try { await supabase.auth.refreshSession(); } catch { /* ignore */ }
          [rolesRes, permRes] = await runCheck();
        }

        if (cancelled) return;

        const adminStatus = !!rolesRes.data;
        // is_full_access means complete admin: always null (all sections),
        // so newly added sections are visible without re-syncing the saved list.
        const nextAllowedSections = adminStatus
          ? ((permRes.data as { is_full_access?: boolean } | null)?.is_full_access
              ? null
              : ((permRes.data?.allowed_sections as string[] | null) ?? null))
          : null;

        setIsAdmin(adminStatus);
        setAllowedSections(nextAllowedSections);
        writeAdminCache(user.id, { isAdmin: adminStatus, allowedSections: nextAllowedSections });
        setAdminLoading(false);
      } catch {
        resolvedAdminUserIdRef.current = null;
        if (!cancelled && !cached) {
          setIsAdmin(false);
          setAllowedSections(null);
          setAdminLoading(false);
        }
      }
    };

    void loadAdminStatus();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, location.pathname]);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    phone?: string,
    designation?: string
  ) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const signupPageUrl = window.location.pathname;
    const signupPageName = document.title || "Unknown";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          display_name: displayName,
          phone: phone || "",
          designation: designation || "",
          signup_page_url: signupPageUrl,
          signup_page_name: signupPageName,
        },
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    clearStudentMode();
    clearAdminCache();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setAllowedSections(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      console.warn("signOut error (non-blocking):", e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAdmin,
      adminLoading,
      allowedSections,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
