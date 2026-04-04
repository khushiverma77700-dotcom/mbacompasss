import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  allowedSections: string[] | null; // null = full access (super admin)
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setAllowedSections(null);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (cancelled) return;

      const adminStatus = !!data;
      setIsAdmin(adminStatus);

      if (adminStatus) {
        // Load granular permissions
        const { data: permData } = await supabase
          .from("admin_permissions")
          .select("allowed_sections")
          .eq("email", user.email?.toLowerCase() || "")
          .maybeSingle();

        if (!cancelled) {
          // No permissions record = super admin (full access)
          setAllowedSections(permData?.allowed_sections as string[] | null ?? null);
        }
      } else {
        setAllowedSections(null);
      }
    };

    void loadAdminStatus();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
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
