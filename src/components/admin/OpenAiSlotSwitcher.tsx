import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, RefreshCw } from "lucide-react";

type Slot = 1 | 2;

export default function OpenAiSlotSwitcher() {
  const [slot, setSlot] = useState<Slot>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => { load(); }, []);

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
    // Flush server-side credential cache so the change applies immediately
    try {
      await supabase.functions.invoke("flush-credentials-cache");
    } catch (_) {/* non-fatal */}
    setSlot(next);
    setSaving(false);
    toast.success(`Switched to OpenAI API ${next}. Active site-wide.`);
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
          Changes propagate within ~30 seconds.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-3">
          {([1, 2] as Slot[]).map((n) => {
            const active = slot === n;
            return (
              <button
                key={n}
                disabled={saving || loading}
                onClick={() => switchTo(n)}
                className={`flex-1 text-left p-4 rounded-lg border-2 transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">API {n}</div>
                    <div className={`text-xs mt-1 ${active ? "opacity-90" : "text-muted-foreground"}`}>
                      Secret: <code>{n === 1 ? "OPENAI_API_KEY" : "OPENAI_API_KEY_2"}</code>
                    </div>
                  </div>
                  {active && <Badge variant="outline" className="bg-background text-foreground">Active</Badge>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <span className="text-xs text-muted-foreground">
            Currently active: <strong>API {slot}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
