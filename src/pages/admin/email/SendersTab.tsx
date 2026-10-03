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
import { getSenderIdentities, getGlobalDailyCap, setGlobalDailyCap } from "@/lib/adminEmail.functions";

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
        <div><Label>Address name</Label><Input value={f.local_part} onChange={(e) => set("local_part", e.target.value)} /></div>
        <div><Label>Daily cap</Label><Input type="number" min={1} value={f.daily_cap} onChange={(e) => set("daily_cap", e.target.value)} /></div>
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
      <GlobalCapCard />
      <SenderReport rows={rows} />
      <div className="grid gap-4 lg:grid-cols-3">{rows.map((s) => <SenderCard key={s.id} s={s} onSaved={() => { load(); onChanged?.(); }} />)}</div>
    </div>
  );
}

function GlobalCapCard() {
  const fetchCap = useServerFn(getGlobalDailyCap);
  const saveCap = useServerFn(setGlobalDailyCap);
  const [info, setInfo] = useState({ cap: 1000, today: 0 });
  const [val, setVal] = useState("1000");
  const load = () => fetchCap({}).then((r: any) => { setInfo(r); setVal(String(r.cap)); }).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  const save = async () => {
    try { await saveCap({ data: { cap: Number(val) } }); toast.success("Daily total cap saved"); load(); }
    catch (e: any) { toast.error(e?.message || "Could not save"); }
  };
  return (
    <Card className="space-y-3 p-4">
      <p className="text-xl font-semibold">Daily total cap (all senders)</p>
      <p className="text-sm text-muted-foreground">A safety brake while your domain warms up. Once this many emails go out today (India time) across every sender, all campaigns wait until tomorrow and continue on their own. Test inbox emails don't count.</p>
      <div className="flex justify-between text-sm"><span>Sent today</span><span>{info.today} / {info.cap}</span></div>
      <Progress value={Math.min(100, (info.today * 100) / Math.max(1, info.cap))} />
      <div className="flex flex-wrap items-end gap-2">
        <div><Label>Max emails per day</Label><Input type="number" min={1} value={val} onChange={(e) => setVal(e.target.value)} /></div>
        <Button onClick={save}>Save</Button>
      </div>
    </Card>
  );
}

const rate = (n: number, d: number) => (d ? (n * 100) / d : 0);

function SenderReport({ rows }: { rows: any[] }) {
  const data = rows.map((s) => {
    const p = s.perf ?? { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 };
    return { id: s.id, label: s.label, ...p, dRate: rate(p.delivered, p.sent), oRate: rate(p.opened, p.delivered), cRate: rate(p.clicked, p.delivered), ctor: rate(p.clicked, p.opened) };
  });
  const best = (k: "dRate" | "oRate" | "cRate") => {
    const c = data.filter((d) => d.sent > 0).sort((a, b) => b[k] - a[k])[0];
    return c && c[k] > 0 ? c : null;
  };
  const winners = { dRate: best("dRate"), oRate: best("oRate"), cRate: best("cRate") };
  const cards: [string, "dRate" | "oRate" | "cRate"][] = [["Best delivery rate", "dRate"], ["Best open rate", "oRate"], ["Best click rate", "cRate"]];
  return (
    <Card className="space-y-4 p-4">
      <p className="text-xl font-semibold">Sender performance report</p>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map(([l, k]) => (
          <div key={k} className="rounded border bg-primary/5 p-3">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="text-xl font-semibold">{winners[k] ? winners[k]!.label : "Not enough data"}</p>
            {winners[k] && <p className="text-sm text-primary">{winners[k]![k].toFixed(1)}%</p>}
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-2">Sender</th><th>Sent</th><th>Delivered</th><th>Delivery rate</th><th>Opened</th><th>Open rate</th><th>Clicked</th><th>Click rate</th><th>Click-to-open</th><th>Failed</th></tr>
          </thead>
          <tbody className="divide-y">
            {data.map((d) => {
              const mark = (k: "dRate" | "oRate" | "cRate") => winners[k]?.id === d.id ? <Badge className="ml-1 bg-primary/10 text-primary">Best</Badge> : null;
              return (
                <tr key={d.id}>
                  <td className="py-2 font-medium">{d.label}</td><td>{d.sent}</td><td>{d.delivered}</td>
                  <td>{d.dRate.toFixed(1)}%{mark("dRate")}</td><td>{d.opened}</td><td>{d.oRate.toFixed(1)}%{mark("oRate")}</td>
                  <td>{d.clicked}</td><td>{d.cRate.toFixed(1)}%{mark("cRate")}</td><td>{d.ctor.toFixed(1)}%</td><td>{d.failed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">All-time figures per sender. Open and click rates are measured against delivered emails. Open rates are approximate because some mail apps load images automatically or block them.</p>
    </Card>
  );
}
