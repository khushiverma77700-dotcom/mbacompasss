import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CircleDollarSign, KeyRound, RefreshCw, XCircle } from "lucide-react";

type Slot = 1 | 2;

type AccountStatus = {
  slots: Array<{
    slot: Slot;
    name: string;
    secret_name: string;
    configured: boolean;
    valid: boolean | null;
    status: "ready" | "missing" | "invalid" | "quota_blocked" | "unavailable";
    message: string;
  }>;
  active_slot: Slot;
  tracked_spend: { current_month_usd: number; all_time_usd: number };
  balance: { available: boolean; message: string };
  checked_at: string;
};

const SLOT_NAMES: Record<Slot, string> = { 1: "Suyash", 2: "Vaibhav" };

export default function OpenAiSlotSwitcher() {
  const [slot, setSlot] = useState<Slot>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [checking, setChecking] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "openai_active_slot")
      .maybeSingle();
    const v = (data?.value as any)?.slot;
    setSlot(v === 2 || v === "2" ? 2 : 1);
    setLoading(false);
  }

  async function checkAccounts() {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("openai-account-status", { method: "POST" });
    setChecking(false);
    if (error) {
      toast.error(`OpenAI status check failed: ${error.message}`);
      return;
    }
    setAccountStatus(data as AccountStatus);
  }

  useEffect(() => { void Promise.all([load(), checkAccounts()]); }, []);

  async function switchTo(next: Slot) {
    if (next === slot) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "openai_active_slot", value: { slot: next } as any }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    setSlot(next);
    setSaving(false);
    toast.success(`Switched to ${SLOT_NAMES[next]}. The next AI request will use this account first.`);
  }

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          OpenAI API Switcher
          <Badge variant="secondary">Live across whole website</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Choose which OpenAI key powers every AI feature — admin tools, student dashboard,
          AI writers, mock generation, profile analyzer, vocabulary, formulas, IIM insights and more.
          The selected account is used for the next AI request. If it is unavailable, the backup account is tried automatically.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-3">
          {([1, 2] as Slot[]).map((n) => {
            const active = slot === n;
            const health = accountStatus?.slots.find((item) => item.slot === n);
            return (
              <Button
                key={n}
                type="button"
                variant="outline"
                disabled={saving || loading}
                onClick={() => switchTo(n)}
                className={`flex-1 h-auto justify-start text-left p-4 border-2 transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{SLOT_NAMES[n]} · API {n}</div>
                    <div className={`text-xs mt-1 ${active ? "opacity-90" : "text-muted-foreground"}`}>
                      Secret: <code>{n === 1 ? "OPENAI_API_KEY" : "OPENAI_API_KEY_2"}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {health?.status === "ready" && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Ready" />}
                    {health?.status === "quota_blocked" && <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="Quota blocked" />}
                    {health && ["missing", "invalid"].includes(health.status) && <XCircle className="h-4 w-4 text-destructive" aria-label="Unavailable" />}
                    {active && <Badge variant="outline" className="bg-background text-foreground">Active</Badge>}
                  </div>
                </div>
                {health && <p className={`mt-2 text-xs whitespace-normal ${active ? "opacity-90" : "text-muted-foreground"}`}>{health.message}</p>}
              </Button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => { void load(); void checkAccounts(); }} disabled={loading || checking}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${checking ? "animate-spin" : ""}`} /> Check both APIs
          </Button>
          <span className="text-xs text-muted-foreground">
            Currently active: <strong>{SLOT_NAMES[slot]} · API {slot}</strong>
          </span>
        </div>
        {accountStatus && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border bg-card p-3">
              <p className="text-xs text-muted-foreground">OpenAI spend this month</p>
              <p className="mt-1 text-xl font-bold">${accountStatus.tracked_spend.current_month_usd.toFixed(4)}</p>
            </div>
            <div className="rounded-md border bg-card p-3">
              <p className="text-xs text-muted-foreground">Tracked all-time spend</p>
              <p className="mt-1 text-xl font-bold">${accountStatus.tracked_spend.all_time_usd.toFixed(4)}</p>
            </div>
            <div className="rounded-md border bg-card p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><CircleDollarSign className="h-3.5 w-3.5" /> Credits remaining</p>
              <p className="mt-1 text-sm font-semibold">Not exposed by OpenAI API</p>
            </div>
            <p className="md:col-span-3 text-xs text-muted-foreground">{accountStatus.balance.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
