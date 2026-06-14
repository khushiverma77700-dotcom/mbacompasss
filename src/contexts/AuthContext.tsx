import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
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
  const initialSession = useRef<Session | null>(readStoredSession());
  const [user, setUser] = useState<User | null>(initialSession.current?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialSession.current);
  const [loading, setLoading] = useState(!initialSession.current);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(!!initialSession.current);
  const [allowedSections, setAllowedSections] = useState<string[] | null>(null);
  const resolvedAdminUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const bootTimeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 1200);

    const applySession = (nextSession: Session | null) => {
      if (cancelled) return;

      setSession((prev) =>
        prev?.access_token === nextSession?.access_token ? prev : nextSession
      );
      setUser((prev) =>
        prev?.id === nextSession?.user?.id ? prev : nextSession?.user ?? null
      );
      window.clearTimeout(bootTimeout);
      setLoading(false);
    };

    let subscription: { unsubscribe: () => void } | undefined;
    import("@/integrations/supabase/client")
      .then(({ supabase }) => {
        if (cancelled) return;
        subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
          applySession(nextSession);
        }).data.subscription;

        supabase.auth.getSession()
          .then(({ data: { session: nextSession } }) => applySession(nextSession))
          .catch(() => applySession(null));
      })
      .catch(() => applySession(null));

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimeout);
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

      if (typeof window !== "undefined" && window.location.pathname.startsWith("/student")) {
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
        const [rolesRes, permRes] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle(),
          supabase
            .from("admin_permissions")
            .select("allowed_sections")
            .eq("email", user.email?.toLowerCase() || "")
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const adminStatus = !!rolesRes.data;
        const nextAllowedSections = adminStatus
          ? ((permRes.data?.allowed_sections as string[] | null) ?? null)
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
  }, [user?.id, user?.email]);

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
    <AuthContext.Provider value={{ user, session, loading, isAdmin, adminLoading, allowedSections, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
