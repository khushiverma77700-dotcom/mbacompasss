import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearStudentMode } from "@/lib/studentModeNav";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  allowedSections: string[] | null; // null = full access (super admin)
  signUp: (email: string, password: string, displayName: string, phone?: string, designation?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowedSections, setAllowedSections] = useState<string[] | null>(null);
  const resolvedAdminUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applySession = (nextSession: Session | null) => {
      if (cancelled) return;

      setSession((prev) =>
        prev?.access_token === nextSession?.access_token ? prev : nextSession
      );
      setUser((prev) =>
        prev?.id === nextSession?.user?.id ? prev : nextSession?.user ?? null
      );
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        applySession(nextSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      applySession(nextSession);
    });

    return () => {
      cancelled = true;
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
        return;
      }

      if (resolvedAdminUserIdRef.current === user.id) return;
      resolvedAdminUserIdRef.current = user.id;

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
          setAllowedSections(null);
          return;
        }

        const { data: permData } = await supabase
          .from("admin_permissions")
          .select("allowed_sections")
          .eq("email", user.email?.toLowerCase() || "")
          .maybeSingle();

        if (!cancelled) {
          setAllowedSections((permData?.allowed_sections as string[] | null) ?? null);
        }
      } catch {
        resolvedAdminUserIdRef.current = null;
        if (!cancelled) {
          setIsAdmin(false);
          setAllowedSections(null);
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
    <AuthContext.Provider value={{ user, session, loading, isAdmin, allowedSections, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
