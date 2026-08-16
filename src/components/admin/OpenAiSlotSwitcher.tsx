import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CircleDollarSign, KeyRound, RefreshCw, XCircle } from "lucide-react";

type AccountStatus = {
  account: {
    secret_name: string;
    configured: boolean;
    valid: boolean | null;
    status: "ready" | "missing" | "invalid" | "quota_blocked" | "unavailable";
    message: string;
  };
  tracked_spend: { current_month_usd: number; all_time_usd: number };
  balance: { available: boolean; message: string };
};

export default function OpenAiSlotSwitcher() {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkAccount() {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("openai-account-status", { method: "POST" });
    setChecking(false);
    if (error) {
      toast.error(`OpenAI status check failed: ${error.message}`);
      return;
    }
    setStatus(data as AccountStatus);
  }

  useEffect(() => { void checkAccount(); }, []);

  const health = status?.account;

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="h-5 w-5 text-primary" />
          OpenAI API
          <Badge variant="secondary">Single key · website-wide</Badge>
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Every AI feature uses only the secure <code>OPENAI_API_KEY</code>. No second OpenAI key, Gemini key, or other AI provider is used.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-md border bg-card p-4">
          <div>
            <p className="text-sm font-semibold">Primary OpenAI account</p>
            <p className="mt-1 text-xs text-muted-foreground">Secret: <code>OPENAI_API_KEY</code></p>
            {health && <p className="mt-2 text-xs text-muted-foreground">{health.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            {health?.status === "ready" && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Ready" />}
            {health?.status === "quota_blocked" && <AlertTriangle className="h-5 w-5 text-amber-600" aria-label="Quota blocked" />}
            {health && ["missing", "invalid"].includes(health.status) && <XCircle className="h-5 w-5 text-destructive" aria-label="Unavailable" />}
            <Badge variant="outline">Active</Badge>
          </div>
        </div>

        <Button size="sm" variant="outline" onClick={() => void checkAccount()} disabled={checking}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} /> Check OpenAI API
        </Button>

        {status && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border bg-card p-3">
              <p className="text-xs text-muted-foreground">OpenAI spend this month</p>
              <p className="mt-1 text-xl font-bold">${status.tracked_spend.current_month_usd.toFixed(4)}</p>
            </div>
            <div className="rounded-md border bg-card p-3">
              <p className="text-xs text-muted-foreground">Tracked all-time spend</p>
              <p className="mt-1 text-xl font-bold">${status.tracked_spend.all_time_usd.toFixed(4)}</p>
            </div>
            <div className="rounded-md border bg-card p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><CircleDollarSign className="h-3.5 w-3.5" /> Credits remaining</p>
              <p className="mt-1 text-sm font-semibold">Not exposed by OpenAI API</p>
            </div>
            <p className="text-xs text-muted-foreground md:col-span-3">{status.balance.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}