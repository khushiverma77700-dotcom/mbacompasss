import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearStudentMode } from "@/lib/studentModeNav";

const ADMIN_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — render instantly, revalidate in background

const clearAdminCache = (userId?: string) => {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.sessionStorage.removeItem(`mbc-admin-status:${userId}`);
      return;
    }
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith("mbc-admin-status:")) window.sessionStorage.removeItem(key);
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
    const raw = window.localStorage.getItem(getAdminCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminCacheEntry;
    if (!parsed) return null;
    return parsed; // return even if expired — caller decides whether to revalidate
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        applySession(nextSession);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session: nextSession } }) => applySession(nextSession))
      .catch(() => applySession(null));

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimeout);
      subscription.unsubscribe();
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
      if (cached) {
        setIsAdmin(cached.isAdmin);
        setAllowedSections(cached.allowedSections);
        setAdminLoading(false);
        // continue to background-refresh so newly granted admin access shows up immediately
      } else {
        setAdminLoading(true);
      }

      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (cancelled) return;

        const adminStatus = !!data;
        setIsAdmin(adminStatus);

        if (!adminStatus) {
          writeAdminCache(user.id, { isAdmin: false, allowedSections: null });
          setAllowedSections(null);
          setAdminLoading(false);
          return;
        }

        const { data: permData } = await supabase
          .from("admin_permissions")
          .select("allowed_sections")
          .eq("email", user.email?.toLowerCase() || "")
          .maybeSingle();

        if (!cancelled) {
          const nextAllowedSections = (permData?.allowed_sections as string[] | null) ?? null;
          setAllowedSections(nextAllowedSections);
          writeAdminCache(user.id, { isAdmin: true, allowedSections: nextAllowedSections });
          setAdminLoading(false);
        }
      } catch {
        resolvedAdminUserIdRef.current = null;
        if (!cancelled) {
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
