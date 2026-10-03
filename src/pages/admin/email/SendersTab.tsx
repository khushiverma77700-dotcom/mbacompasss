import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSenderIdentities } from "@/lib/adminEmail.functions";

const db = supabase as any;
const DOMAIN = "notify.mail.mbacompass.in";

function SenderCard({ s, onSaved }: { s: any; onSaved: () => void }) {
  const [f, setF] = useState({ ...s, match_keywords: (s.match_keywords ?? []).join(", ") });
  useEffect(() => setF({ ...s, match_keywords: (s.match_keywords ?? []).join(", ") }), [s]);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const save = async (extra: Record<string, any> = {}) => {
    const { error } = await db.from("email_sender_identities").update({
      label: f.label, from_name: f.from_name, local_part: String(f.local_part).toLowerCase().trim(), purpose: f.purpose,
      match_keywords: String(f.match_keywords).split(",").map((x: string) => x.trim().toLowerCase()).filter(Boolean),
      daily_cap: Number(f.daily_cap), max_bounce_pct: Number(f.max_bounce_pct), max_complaint_pct: Number(f.max_complaint_pct), min_sample: Number(f.min_sample),
      updated_at: new Date().toISOString(), ...extra,
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Sender saved"); onSaved();
  };
  const paused = s.status === "paused";
  const bPct = s.week ? (s.bounced * 100) / s.week : 0;
  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xl font-semibold">{s.label}</p>
          <p className="text-sm text-muted-foreground">{s.from_name} &lt;{s.local_part}@{DOMAIN}&gt;</p>
        </div>
        <Badge className={paused ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}>{paused ? "Paused" : "Active"}</Badge>
      </div>
      {paused && s.paused_reason && <p className="rounded bg-destructive/10 p-2 text-sm text-destructive">{s.paused_reason}</p>}
      <div>
        <div className="mb-1 flex justify-between text-sm"><span>Sent today</span><span>{s.today} / {s.daily_cap}</span></div>
        <Progress value={Math.min(100, (s.today * 100) / Math.max(1, s.daily_cap))} />
        <p className="mt-1 text-sm text-muted-foreground">Last 7 days: {s.week} sent, {s.bounced} bounced ({bPct.toFixed(1)}%), {s.complained} complaints · {s.campaigns} campaigns</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Name</Label><Input value={f.label} onChange={(e) => set("label", e.target.value)} /></div>
        <div><Label>From name</Label><Input value={f.from_name} onChange={(e) => set("from_name", e.target.value)} /></div>
        <div><Label>Address (before @{DOMAIN})</Label><Input value={f.local_part} onChange={(e) => set("local_part", e.target.value)} /></div>
        <div><Label>Daily cap (India time)</Label><Input type="number" min={1} value={f.daily_cap} onChange={(e) => set("daily_cap", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Used for</Label><Input value={f.purpose ?? ""} onChange={(e) => set("purpose", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Auto-pick when campaign name or subject contains (comma separated)</Label><Input value={f.match_keywords} onChange={(e) => set("match_keywords", e.target.value)} /></div>
        <div><Label>Pause if bounces exceed (%)</Label><Input type="number" step="0.1" value={f.max_bounce_pct} onChange={(e) => set("max_bounce_pct", e.target.value)} /></div>
        <div><Label>Pause if complaints exceed (%)</Label><Input type="number" step="0.1" value={f.max_complaint_pct} onChange={(e) => set("max_complaint_pct", e.target.value)} /></div>
        <div><Label>Only check after this many emails</Label><Input type="number" value={f.min_sample} onChange={(e) => set("min_sample", e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => save()}>Save</Button>
        {paused
          ? <Button variant="outline" onClick={() => save({ status: "active", paused_reason: null, paused_at: null })}>Resume sender</Button>
          : <Button variant="outline" onClick={() => save({ status: "paused", paused_reason: "Paused manually", paused_at: new Date().toISOString() })}>Pause sender</Button>}
      </div>
    </Card>
  );
}

export default function SendersTab({ onChanged }: { onChanged?: () => void }) {
  const fetchSenders = useServerFn(getSenderIdentities);
  const [rows, setRows] = useState<any[]>([]);
  const load = () => fetchSenders({}).then((r: any) => setRows(r)).catch((e: any) => toast.error(e?.message || "Failed to load senders"));
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Each sender has its own name and address on your verified email domain. A campaign keeps one sender for every email. When the daily cap is reached, sending waits until the next day. If bounces or complaints go above the limits, the sender and its campaigns pause on their own until you resume them.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">{rows.map((s) => <SenderCard key={s.id} s={s} onSaved={() => { load(); onChanged?.(); }} />)}</div>
    </div>
  );
}
