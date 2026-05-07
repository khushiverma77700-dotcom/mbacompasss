import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Site-wide CTA login gate.
 * - Reads cta_settings from DB
 * - Subscribes to realtime changes so toggles in admin apply instantly
 * - Returns { requiresLogin, gate(action) }: call gate(yourClickHandler) and
 *   it will either invoke it directly or open the LoginRequiredDialog.
 */

type CtaMap = Record<string, boolean>;

let cache: CtaMap | null = null;
const listeners = new Set<(m: CtaMap) => void>();
let channelInitialized = false;
let inFlight: Promise<CtaMap> | null = null;

const fetchAll = async (): Promise<CtaMap> => {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { data } = await supabase
      .from("cta_settings")
      .select("cta_key, requires_login");
    const map: CtaMap = {};
    (data || []).forEach((r: any) => { map[r.cta_key] = !!r.requires_login; });
    cache = map;
    listeners.forEach((l) => l(map));
    return map;
  })();
  try { return await inFlight; } finally { inFlight = null; }
};

const ensureRealtime = () => {
  if (channelInitialized) return;
  channelInitialized = true;
  supabase
    .channel("cta_settings_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cta_settings" },
      (payload: any) => {
        const next = { ...(cache || {}) };
        const row = (payload.new || payload.old) as any;
        if (!row?.cta_key) return;
        if (payload.eventType === "DELETE") {
          delete next[row.cta_key];
        } else {
          next[row.cta_key] = !!payload.new?.requires_login;
        }
        cache = next;
        listeners.forEach((l) => l(next));
      }
    )
    .subscribe();
};

// Global event so any place can open the login dialog without prop drilling.
export const openLoginDialog = (message?: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("open-login-dialog", { detail: { message } }));
};

export const useCtaGate = (key: string) => {
  const [requiresLogin, setRequiresLogin] = useState<boolean>(cache?.[key] ?? false);
  const { user } = useAuth();
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    ensureRealtime();
    const update = (m: CtaMap) => setRequiresLogin(!!m[keyRef.current]);
    listeners.add(update);
    if (cache) update(cache);
    else void fetchAll().then(update);
    return () => { listeners.delete(update); };
  }, []);

  const gate = useCallback(
    <T extends (...args: any[]) => any>(action: T, message?: string, context?: Record<string, any>) => {
      return ((...args: any[]) => {
        const prompted = requiresLogin && !user;
        const path = typeof window !== "undefined" ? window.location.pathname : null;
        // Fire-and-forget analytics
        void supabase.from("cta_events").insert({
          cta_key: keyRef.current,
          outcome: prompted ? "login_prompted" : "executed",
          user_id: user?.id ?? null,
          page_path: path,
          context: context ?? null,
        } as any);
        if (prompted) {
          openLoginDialog(message);
          return;
        }
        return action(...args);
      }) as T;
    },
    [requiresLogin, user]
  );

  return { requiresLogin, isLoggedIn: !!user, gate };
};

export const refreshCtaSettings = () => fetchAll();
