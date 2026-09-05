// Student-facing opt-in for browser notifications. All copy and the on/off
// switch are controlled by the admin team (site_settings -> push_settings).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { enablePush, pushConfigured, pushPermission, type PushStatus } from "@/lib/push";

export type PushSettings = {
  enabled: boolean;
  prompt_title: string;
  prompt_body: string;
  button_label: string;
};

export const DEFAULT_PUSH_SETTINGS: PushSettings = {
  enabled: true,
  prompt_title: "Never miss an MBA application deadline",
  prompt_body:
    "Turn on alerts and we will ping you the moment a form opens, a last date is near or a new college is added.",
  button_label: "Turn on deadline alerts",
};

export const readPushSettings = async (): Promise<PushSettings> => {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "push_settings")
    .maybeSingle();
  const value = (data?.value ?? null) as Partial<PushSettings> | null;
  return { ...DEFAULT_PUSH_SETTINGS, ...(value ?? {}) };
};

const MESSAGES: Record<Exclude<PushStatus, "registered">, string> = {
  "already-on": "Alerts are already on for this browser.",
  "not-configured": "Alerts are being set up. Please check back shortly.",
  unsupported: "This browser cannot show alerts. Try Chrome on desktop or Android.",
  "open-in-new-tab": "Open the site in its own browser tab to allow alerts.",
  denied: "Alerts are blocked. Allow notifications for this site in your browser settings.",
  failed: "Could not switch alerts on. Please try again.",
};

export default function NotificationOptIn({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PushSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    void readPushSettings().then(setSettings);
    setGranted(pushPermission() === "granted");
  }, []);

  if (!settings?.enabled || !pushConfigured()) return null;

  const handleClick = async () => {
    setBusy(true);
    const status = await enablePush(user?.id ?? null);
    setBusy(false);
    if (status === "registered") {
      setGranted(true);
      toast.success("Alerts are on. We will notify you about deadlines and new forms.");
      return;
    }
    toast.error(MESSAGES[status]);
  };

  if (compact) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy || granted}
        onClick={() => void handleClick()}
        className="gap-1.5 rounded-full"
      >
        {granted ? <Check className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />}
        {granted ? "Alerts on" : settings.button_label}
      </Button>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600"
        >
          <BellRing className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-medium text-slate-900">{settings.prompt_title}</h2>
          <p className="text-sm text-slate-600">{settings.prompt_body}</p>
        </div>
      </div>
      <Button
        type="button"
        disabled={busy || granted}
        onClick={() => void handleClick()}
        className="shrink-0 gap-1.5"
      >
        {granted ? <Check className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
        {granted ? "Alerts on" : settings.button_label}
      </Button>
    </section>
  );
}
