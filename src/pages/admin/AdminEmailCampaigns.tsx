import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Download, FlaskConical, Pause, Play, RotateCcw, Send, Square, Gauge } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { getCampaignRecipients, getEmailAnalytics, getEmailAudienceCounts, resendFailedCampaign, sendEmailCampaign, updateCampaignDelivery } from "@/lib/adminEmail.functions";
import EmailComposerFields from "./email/EmailComposerFields";
import ContactListsTab from "./email/ContactListsTab";
import TemplatesTab from "./email/TemplatesTab";
import EngagementTab from "./email/EngagementTab";
import SendersTab from "./email/SendersTab";
import { BUILTIN_VARS, type EmailDraft, emptyDraft, pct } from "./email/emailShared";

const db = supabase as any;
type Audience = "all" | "enrolled" | "list" | "selected";

const INTERVALS: [number, string][] = [[5, "5 sec"], [10, "10 sec"], [30, "30 sec"], [60, "1 min"], [120, "2 min"], [300, "5 min"], [600, "10 min"], [1800, "30 min"], [3600, "1 hour"]];
const intervalLabel = (s: number) => INTERVALS.find(([v]) => v === s)?.[1] ?? `${s} sec`;
const STATUS_LABEL: Record<string, string> = { running: "Running", paused: "Paused", completed: "Completed", sent: "Completed", failed: "Failed", sending: "Preparing", queued: "Queued" };
const statusBadge = (s: string) => s === "running" || s === "sending" ? "bg-primary/10 text-primary" : s === "paused" ? "bg-accent text-accent-foreground" : s === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";

function SpeedFields({ interval, batch, onInterval, onBatch }: { interval: number; batch: number; onInterval: (n: number) => void; onBatch: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label>Emails per batch</Label>
        <Input type="number" min={1} max={2000} className="w-32" value={batch} onChange={(e) => onBatch(Math.max(1, Math.min(2000, Number(e.target.value) || 1)))} />
      </div>
      <div>
        <Label>Wait between batches</Label>
        <Select value={String(interval)} onValueChange={(v) => onInterval(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{INTERVALS.map(([v, l]) => <SelectItem key={v} value={String(v)}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <p className="pb-2 text-sm text-muted-foreground">≈ {Math.round((batch * 3600) / Math.max(interval, 5)).toLocaleString()} emails/hour</p>
    </div>
  );
}

function LiveCampaignRow({ c, onChanged, onOpen }: { c: any; onChanged: () => void; onOpen?: () => void }) {
  const update = useServerFn(updateCampaignDelivery);
  const [interval, setInterval_] = useState<number>(c.interval_seconds ?? 30);
  const [batch, setBatch] = useState<number>(c.batch_size ?? 100);
  useEffect(() => { setInterval_(c.interval_seconds ?? 30); setBatch(c.batch_size ?? 100); }, [c.interval_seconds, c.batch_size]);
  const total = c.stats.total || c.recipient_count || 0;
  const done = total - c.stats.remaining;
  const live = c.status === "running" || c.status === "paused";
  const act = async (payload: any, msg: string) => {
    try { await update({ data: { campaignId: c.id, ...payload } }); toast.success(msg); onChanged(); }
    catch (e: any) { toast.error(e?.message || "Update failed"); }
  };
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="font-medium">{c.name || c.subject}</p>
          <p className="text-sm text-muted-foreground">{c.list_name || c.audience} · {c.batch_size ?? "—"} per batch every {intervalLabel(c.interval_seconds ?? 30)}</p>
        </button>
        <span className={`rounded px-2 py-0.5 text-sm ${statusBadge(c.status)}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
      <div className="flex flex-wrap gap-4 text-sm">
        <span><b>{c.stats.sent}</b> sent</span><span><b>{c.stats.remaining}</b> remaining</span>
        <span><b>{c.stats.delivered}</b> delivered</span><span><b>{c.stats.opened}</b> opened ({pct(c.stats.opened, c.stats.delivered)})</span><span><b>{c.stats.clicked}</b> clicked ({pct(c.stats.clicked, c.stats.delivered)})</span>
        <span><b>{c.stats.failed + c.stats.bounced}</b> failed/bounced</span>
        {c.status === "running" && c.next_send_at && <span className="text-muted-foreground">Next batch {new Date(c.next_send_at).toLocaleTimeString()}</span>}
      </div>
      {live && (
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <SpeedFields interval={interval} batch={batch} onInterval={setInterval_} onBatch={setBatch} />
          <Button size="sm" variant="outline" disabled={interval === c.interval_seconds && batch === c.batch_size} onClick={() => act({ intervalSeconds: interval, batchSize: batch }, "Speed updated for the remaining emails")}><Gauge className="mr-1 h-4 w-4" /> Apply speed</Button>
          {c.status === "running"
            ? <Button size="sm" variant="outline" onClick={() => act({ action: "pause" }, "Paused")}><Pause className="mr-1 h-4 w-4" /> Pause</Button>
            : <Button size="sm" variant="outline" onClick={() => act({ action: "resume" }, "Resumed")}><Play className="mr-1 h-4 w-4" /> Resume</Button>}
          <StopButton id={c.id} onDone={onChanged} />
        </div>
      )}
    </Card>
  );
}

const STOPPABLE = ["running", "paused", "queued", "sending"];

function StopButton({ id, onDone }: { id: string; onDone: () => void }) {
  const update = useServerFn(updateCampaignDelivery);
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="destructive" disabled={busy} onClick={async (e) => {
      e.stopPropagation();
      if (!window.confirm("Stop this campaign now? Emails not yet sent will be cancelled. This cannot be undone.")) return;
      setBusy(true);
      try { await update({ data: { campaignId: id, action: "stop" } }); toast.success("Campaign stopped"); onDone(); }
      catch (err: any) { toast.error(err?.message || "Could not stop"); }
      finally { setBusy(false); }
    }}><Square className="mr-1 h-4 w-4" /> Stop</Button>
  );
}

function ResendFailedButton({ id, count, onDone }: { id: string; count: number; onDone: () => void }) {
  const resend = useServerFn(resendFailedCampaign);
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={async (e) => {
      e.stopPropagation();
      if (!window.confirm(`Send this campaign again to the ${count.toLocaleString()} people it failed for? A new campaign will be created so the original report stays intact.`)) return;
      setBusy(true);
      try {
        const r: any = await resend({ data: { campaignId: id } });
        toast.success(`Resend started for ${r.resent.toLocaleString()} email(s)${r.skipped ? ` — ${r.skipped} skipped (unsubscribed/complained)` : ""}`);
        onDone();
      } catch (err: any) { toast.error(err?.message || "Could not resend"); }
      finally { setBusy(false); }
    }}><RotateCcw className="mr-1 h-4 w-4" /> {busy ? "Starting…" : "Resend to failed"}</Button>
  );
}

const RANGES: Record<string, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null };

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </Card>
  );
}

const statusTone = (s: string) =>
  s === "sent" ? "bg-primary/10 text-primary" : s === "dlq" || s === "failed" || s === "bounced" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";

function downloadCsv(name: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const h = Object.keys(rows[0]);
  const csv = [h.join(","), ...rows.map((r) => h.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
}

export default function AdminEmailCampaigns() {
  const [tab, setTab] = useState("dashboard");
  const [range, setRange] = useState("30d");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [analytics, setAnalytics] = useState<any>(null);
  const [detail, setDetail] = useState<{ campaign: any; data: any } | null>(null);
  const [counts, setCounts] = useState({ all: 0, enrolled: 0 });
  const [lists, setLists] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // composer state
  const [campaignName, setCampaignName] = useState("");
  const [draft, setDraft] = useState<EmailDraft>(emptyDraft());
  const [templateId, setTemplateId] = useState<string>("none");
  const [composerKey, setComposerKey] = useState(0);
  const [audience, setAudience] = useState<Audience>("list");
  const [listId, setListId] = useState("");
  const [selectedEmails, setSelectedEmails] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [intervalSec, setIntervalSec] = useState(30);
  const [batchSize, setBatchSize] = useState(100);
  const [senders, setSenders] = useState<any[]>([]);
  const [senderId, setSenderId] = useState("default");
  const [senderTouched, setSenderTouched] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sample, setSample] = useState<Record<string, string>>({});

  const fetchAnalytics = useServerFn(getEmailAnalytics);
  const fetchRecipients = useServerFn(getCampaignRecipients);
  const fetchCounts = useServerFn(getEmailAudienceCounts);
  const send = useServerFn(sendEmailCampaign);

  const loadAnalytics = async () => {
    try {
      const days = RANGES[range];
      const from = days ? new Date(Date.now() - days * 864e5).toISOString() : undefined;
      setAnalytics(await fetchAnalytics({ data: { from, campaignId: campaignFilter === "all" ? undefined : campaignFilter } }));
      setLastUpdated(new Date());
    } catch (e: any) { toast.error(e?.message || "Failed to load analytics"); }
  };
  const loadRefs = async () => {
    const [{ data: l }, { data: t }] = await Promise.all([
      db.from("email_contact_lists").select("id,name,contact_count,variables").order("created_at", { ascending: false }),
      db.from("email_templates").select("*").order("updated_at", { ascending: false }),
    ]);
    setLists(l ?? []); setTemplates(t ?? []);
    const { data: sd } = await db.from("email_sender_identities").select("id,label,from_name,local_part,status,match_keywords").order("created_at");
    setSenders(sd ?? []);
  };
  useEffect(() => { loadRefs(); fetchCounts({}).then((c: any) => setCounts(c)).catch(() => {}); }, []);
  useEffect(() => { loadAnalytics(); }, [range, campaignFilter]);

  // Live updates: realtime pushes on campaign/tracking changes plus a short poll for delivery statuses.
  const loadRef = useRef(loadAnalytics);
  loadRef.current = loadAnalytics;
  const anyRunning = (analytics?.campaigns ?? []).some((c: any) => c.status === "running" || c.status === "paused" || c.status === "sending");
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const soon = () => { if (!t) t = setTimeout(() => { t = null; loadRef.current(); }, 1500); };
    const ch = supabase.channel("email-campaigns-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_campaigns" }, soon)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "email_tracking_events" }, soon)
      .subscribe();
    return () => { if (t) clearTimeout(t); supabase.removeChannel(ch); };
  }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") loadRef.current(); }, anyRunning ? 5000 : 20000);
    return () => clearInterval(id);
  }, [anyRunning]);
  useEffect(() => {
    if (!detail) return;
    const fresh = (analytics?.campaigns ?? []).find((c: any) => c.id === detail.campaign.id);
    if (fresh && fresh !== detail.campaign) fetchRecipients({ data: { campaignId: fresh.id } }).then((d: any) => setDetail({ campaign: fresh, data: d })).catch(() => {});
  }, [analytics]);

  // Rules: auto-pick a sender from its keywords until the admin chooses one by hand.
  useEffect(() => {
    if (senderTouched) return;
    const text = `${campaignName} ${draft.subject}`.toLowerCase();
    const hit = senders.find((x) => x.status === "active" && (x.match_keywords ?? []).some((k: string) => k && text.includes(k)));
    setSenderId(hit?.id ?? "default");
  }, [campaignName, draft.subject, senders, senderTouched]);
  const selectedList = lists.find((l) => l.id === listId);
  const variables = useMemo(() => [...new Set([...BUILTIN_VARS, ...((audience === "list" && selectedList?.variables) || [])])], [audience, selectedList]);

  useEffect(() => {
    const base = { name: "Rahul Sharma", first_name: "Rahul", email: "rahul@example.com" };
    if (audience !== "list" || !listId) return setSample(base);
    db.from("email_contacts").select("email,name,vars").eq("list_id", listId).limit(1).maybeSingle().then(({ data }: any) => {
      if (!data) return setSample(base);
      const v: Record<string, string> = { ...(data.vars || {}), email: data.email };
      if (data.name) { v.name = data.name; v.first_name = data.name.split(" ")[0]; }
      setSample(v);
    });
  }, [audience, listId]);

  const applyTemplate = (t: any | null) => {
    if (!t) { setTemplateId("none"); return; }
    setTemplateId(t.id);
    setDraft({ fromName: t.from_name || "MBA Compass", subject: t.subject || "", heading: t.heading || "", bodyHtml: t.body_html || "", ctas: t.ctas || [] });
    if (!campaignName) setCampaignName(t.name);
    setComposerKey((k) => k + 1);
    setTab("new");
  };

  const payload = (aud: string) => ({
    name: campaignName || draft.subject,
    fromName: draft.fromName,
    subject: draft.subject,
    heading: draft.heading,
    bodyHtml: draft.bodyHtml,
    ctas: draft.ctas.filter((c) => c.label && c.url),
    audience: aud as any,
    listId: audience === "list" ? listId : undefined,
    selectedEmails: selectedEmails.split(/[\s,;]+/).filter(Boolean),
    testEmail,
    templateId: templateId !== "none" ? templateId : undefined,
    templateName: templates.find((t) => t.id === templateId)?.name,
    intervalSeconds: intervalSec,
    batchSize,
    senderIdentityId: senderId !== "default" ? senderId : undefined,
  });

  const sendTest = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) return toast.error("Enter a valid test email");
    setSending(true);
    try { await send({ data: { ...payload("test"), name: `[Test] ${campaignName || draft.subject}` } }); toast.success(`Test sent to ${testEmail}`); }
    catch (e: any) { toast.error(e?.message || "Test failed"); }
    finally { setSending(false); }
  };

  const sendNow = async () => {
    if (audience === "list" && !listId) return toast.error("Choose a contact list");
    const n = audience === "all" ? counts.all : audience === "enrolled" ? counts.enrolled : audience === "list" ? selectedList?.contact_count : selectedEmails.split(/[\s,;]+/).filter(Boolean).length;
    if (!window.confirm(`Send this campaign to about ${n ?? 0} recipients?`)) return;
    // Hand the campaign off and go straight to the live list; preparation and sending continue in the background.
    const body = payload(audience);
    const tId = toast.loading("Preparing campaign in the background. You can keep working.");
    setDraft(emptyDraft()); setCampaignName(""); setTemplateId("none"); setComposerKey((k) => k + 1);
    setTab("campaigns");
    setTimeout(() => loadAnalytics(), 1500);
    send({ data: body })
      .then((r: any) => {
        toast.success(`Campaign started: ${r.queued} emails${r.failed ? `, ${r.failed} skipped` : ""}`, { id: tId });
        if (r.errors?.length) toast.warning(r.errors.slice(0, 3).join("\n"), { duration: 12000 });
      })
      .catch((e: any) => toast.error(e?.message || "Send failed", { id: tId }))
      .finally(() => loadAnalytics());
  };

  const openDetail = async (c: any) => {
    try { setDetail({ campaign: c, data: await fetchRecipients({ data: { campaignId: c.id } }) }); setTab("campaigns"); }
    catch (e: any) { toast.error(e?.message || "Failed to load report"); }
  };

  const t = analytics?.totals ?? { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0, pending: 0, remaining: 0 };
  const liveCampaigns = (analytics?.campaigns ?? []).filter((c: any) => c.status === "running" || c.status === "paused");
  const statusCounts = (analytics?.campaigns ?? []).reduce((a: any, c: any) => { const k = STATUS_LABEL[c.status] ?? c.status; a[k] = (a[k] ?? 0) + 1; return a; }, {});
  const campaigns: any[] = analytics?.campaigns ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Email Campaigns</h1>
        <p className="text-sm text-muted-foreground">Compose, personalise, send and track emails to your users and saved lists.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v !== "campaigns") setDetail(null); }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="new">New Campaign</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="lists">Contact Lists</TabsTrigger>
          <TabsTrigger value="senders">Senders</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-64"><SelectValue placeholder="All campaigns" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name || c.subject}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => downloadCsv("email-report.csv", campaigns.map((c) => ({ campaign: c.name || c.subject, list: c.list_name, template: c.template_name, sent_at: c.created_at, ...c.stats })))}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
          </div>
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
            <span className="flex items-center gap-2 text-sm"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>Live{lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString()}` : ""}</span>
            <span className="text-sm"><b>{t.sent}</b> Sent</span>
            <span className="text-sm"><b>{t.remaining}</b> Remaining</span>
            <span className="text-sm"><b>{statusCounts.Running ?? 0}</b> Running</span>
            <span className="text-sm"><b>{statusCounts.Paused ?? 0}</b> Paused</span>
            <span className="text-sm"><b>{statusCounts.Completed ?? 0}</b> Completed</span>
          </Card>
          {liveCampaigns.length > 0 && <div className="space-y-3">{liveCampaigns.map((c: any) => <LiveCampaignRow key={c.id} c={c} onChanged={loadAnalytics} onOpen={() => openDetail(c)} />)}</div>}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <StatCard label="Total emails" value={t.total} />
            <StatCard label="Sent" value={t.sent} sub={`${t.pending} awaiting delivery`} />
            <StatCard label="Delivered" value={t.delivered} sub={pct(t.delivered, t.sent)} />
            <StatCard label="Opened" value={t.opened} sub={`${pct(t.opened, t.delivered)} open rate`} />
            <StatCard label="Clicked" value={t.clicked} sub={`${pct(t.clicked, t.delivered)} click rate`} />
            <StatCard label="Failed / Bounced" value={t.failed + t.bounced} sub={`${pct(t.bounced, t.sent)} bounce rate`} />
            <StatCard label="Remaining" value={t.remaining} sub={pct(t.remaining, t.total)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <p className="mb-3 font-medium">Day-wise activity</p>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={analytics?.series ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" fontSize={12} /><YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip /><Legend />
                    <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" />
                    <Bar dataKey="opened" fill="hsl(var(--chart-2, 160 60% 45%))" name="Opened" />
                    <Bar dataKey="clicked" fill="hsl(var(--chart-4, 40 90% 55%))" name="Clicked" />
                    <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <p className="mb-3 font-medium">Cumulative performance</p>
              <div className="h-72">
                <ResponsiveContainer>
                  <AreaChart data={analytics?.series ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" fontSize={12} /><YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip /><Legend />
                    <Area dataKey="cumSent" name="Sent" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                    <Area dataKey="cumDelivered" name="Delivered" stroke="hsl(var(--chart-1, 200 70% 45%))" fill="hsl(var(--chart-1, 200 70% 45%))" fillOpacity={0.1} />
                    <Area dataKey="cumFailed" name="Failed/Bounced" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} />
                    <Area dataKey="cumOpened" name="Opened" stroke="hsl(var(--chart-2, 160 60% 45%))" fill="hsl(var(--chart-2, 160 60% 45%))" fillOpacity={0.15} />
                    <Area dataKey="cumClicked" name="Clicked" stroke="hsl(var(--chart-4, 40 90% 55%))" fill="hsl(var(--chart-4, 40 90% 55%))" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <p className="mb-3 font-medium">Last 24 hours (hourly)</p>
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={analytics?.hourlySeries ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="hour" fontSize={12} /><YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip /><Legend />
                    <Line type="monotone" dataKey="sent" name="Sent" stroke="hsl(var(--primary))" dot={false} />
                    <Line type="monotone" dataKey="delivered" name="Delivered" stroke="hsl(var(--chart-1, 200 70% 45%))" dot={false} />
                    <Line type="monotone" dataKey="opened" name="Opened" stroke="hsl(var(--chart-2, 160 60% 45%))" dot={false} />
                    <Line type="monotone" dataKey="clicked" name="Clicked" stroke="hsl(var(--chart-4, 40 90% 55%))" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <p className="mb-3 font-medium">Delivery breakdown by campaign</p>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={campaigns.slice(0, 10).map((c) => ({ name: (c.name || c.subject).slice(0, 18), Delivered: c.stats.delivered, Opened: c.stats.opened, Clicked: c.stats.clicked, Failed: c.stats.failed + c.stats.bounced, Remaining: c.stats.remaining }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip /><Legend />
                    <Bar dataKey="Delivered" stackId="a" fill="hsl(var(--primary))" />
                    <Bar dataKey="Failed" stackId="a" fill="hsl(var(--destructive))" />
                    <Bar dataKey="Remaining" stackId="a" fill="hsl(var(--muted-foreground))" />
                    <Bar dataKey="Opened" fill="hsl(var(--chart-2, 160 60% 45%))" />
                    <Bar dataKey="Clicked" fill="hsl(var(--chart-4, 40 90% 55%))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">Open rates are approximate: some mail apps load images automatically, others block them. Clicks are exact.</p>
          <div className="space-y-2 pt-2">
            <h2 className="text-xl font-semibold">Recipient engagement</h2>
            <p className="text-sm text-muted-foreground">Who opened, read and clicked, for the date range and campaign selected above. Updates live.</p>
          </div>
          <EngagementTab rows={analytics?.engagement ?? []} onExport={(rows) => downloadCsv("email-engagement.csv", rows.map((r) => ({ name: r.name, email: r.email, campaign: r.campaign, sent: r.sent, sent_at: r.sent_at, delivery: r.delivery, opened: r.opened, open_count: r.open_count, read: r.read, clicked: r.clicked, click_count: r.click_count, possible_forward: r.possible_forward, last_activity: r.last_activity })))} />
        </TabsContent>

        <TabsContent value="campaigns">
          {detail ? (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setDetail(null)}><ArrowLeft className="mr-1 h-4 w-4" /> All campaigns</Button>
              <Card className="p-5">
                <h2 className="text-xl font-semibold">{detail.campaign.name || detail.campaign.subject}</h2>
                <p className="text-sm text-muted-foreground">Subject: {detail.campaign.subject} · From: {detail.campaign.from_name || "MBA Compass"} · List: {detail.campaign.list_name || detail.campaign.audience} · Template: {detail.campaign.template_name || "—"} · {new Date(detail.campaign.created_at).toLocaleString()}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
                  {(["total", "sent", "remaining", "delivered", "opened", "clicked"] as const).map((k) => <StatCard key={k} label={k[0].toUpperCase() + k.slice(1)} value={detail.campaign.stats[k]} />)}
                </div>
              </Card>
              {(detail.campaign.last_error || detail.data.recipients.some((r: any) => r.error)) && (
                <Card className="border-destructive/40 p-5">
                  <p className="mb-2 font-medium text-destructive">Problems with this campaign</p>
                  {detail.campaign.last_error && <pre className="mb-2 whitespace-pre-wrap text-sm">{detail.campaign.last_error}</pre>}
                  {Object.entries(detail.data.recipients.filter((r: any) => r.error).reduce((a: any, r: any) => { a[r.error] = (a[r.error] ?? 0) + 1; return a; }, {})).slice(0, 10).map(([err, n]: any) => (
                    <p key={err} className="text-sm"><b>{n}×</b> {err}</p>
                  ))}
                </Card>
              )}
              {detail.data.recipients.some((r: any) => r.is_test_inbox) && (
                <Card className="p-5">
                  <p className="mb-1 font-medium">Test inbox placement</p>
                  <p className="mb-3 text-sm text-muted-foreground">Mail providers never tell senders where an email lands. Check each test inbox and mark it here.</p>
                  {detail.data.recipients.filter((r: any) => r.is_test_inbox).map((r: any) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 border-b py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{r.email}</span>
                      <span className={`rounded px-2 py-0.5 ${statusTone(r.status)}`}>{r.status === "sent" ? "delivered" : r.status === "dlq" ? "failed" : r.status === "waiting" ? "remaining" : r.status}</span>
                      <span className="text-muted-foreground">{r.open_count ? "Opened" : "Not opened"}</span>
                      <Select value={r.placement ?? "unchecked"} onValueChange={async (v) => {
                        const { error } = await db.from("email_campaign_recipients").update({ placement: v === "unchecked" ? null : v }).eq("id", r.id);
                        if (error) return toast.error(error.message);
                        setDetail((d) => d && { ...d, data: { ...d.data, recipients: d.data.recipients.map((x: any) => x.id === r.id ? { ...x, placement: v === "unchecked" ? null : v } : x) } });
                      }}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unchecked">Not checked</SelectItem>
                          <SelectItem value="inbox">Inbox</SelectItem>
                          <SelectItem value="promotions">Promotions</SelectItem>
                          <SelectItem value="spam">Spam</SelectItem>
                          <SelectItem value="missing">Not received</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </Card>
              )}
              {(detail.campaign.status === "running" || detail.campaign.status === "paused") && <LiveCampaignRow c={detail.campaign} onChanged={loadAnalytics} />}
              {detail.data.links.length > 0 && (
                <Card className="p-5">
                  <p className="mb-2 font-medium">Link clicks</p>
                  {detail.data.links.map((l: any) => <div key={l.url} className="flex justify-between border-b py-1 text-sm"><span className="truncate">{l.url}</span><span>{l.clicks}</span></div>)}
                </Card>
              )}
              <Card className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">Recipients ({detail.data.recipients.length})</p>
                  <Button size="sm" variant="outline" onClick={() => downloadCsv("recipients.csv", detail.data.recipients.map(({ message_id, ...r }: any) => r))}><Download className="mr-1 h-4 w-4" /> CSV</Button>
                </div>
                <div className="max-h-[480px] overflow-auto text-sm">
                  {detail.data.recipients.map((r: any) => (
                    <div key={r.message_id} className="flex flex-wrap items-center gap-3 border-b py-2">
                      <span className="min-w-0 flex-1 truncate">{r.email}</span>
                      <span className={`rounded px-2 py-0.5 ${statusTone(r.status)}`}>{r.status === "sent" ? "delivered" : r.status === "dlq" ? "failed" : r.status === "waiting" ? "remaining" : r.status}</span>
                      <span className="w-28 text-muted-foreground">{r.open_count ? `Opened ×${r.open_count}` : "Not opened"}</span>
                      <span className="w-24 text-muted-foreground">{r.click_count ? `Clicks ×${r.click_count}` : "No clicks"}</span>
                      {r.error && <span className="w-full text-destructive">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-5">
              {!campaigns.length && <p className="text-sm text-muted-foreground">No campaigns in this period.</p>}
              <div className="divide-y">
                {campaigns.map((c) => (
                  <div key={c.id} role="button" tabIndex={0} onClick={() => openDetail(c)} onKeyDown={(e) => e.key === "Enter" && openDetail(c)} className="w-full cursor-pointer space-y-2 py-3 text-left hover:bg-muted/40">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{c.name || c.subject}</p>
                        <p className="text-sm text-muted-foreground">{c.list_name || c.audience} · {c.template_name || "No template"} · {new Date(c.created_at).toLocaleString()} · {c.batch_size ?? "—"} per batch every {intervalLabel(c.interval_seconds ?? 30)}</p>
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded px-2 py-0.5 text-sm ${statusBadge(c.status)}`}>
                        {(c.status === "running" || c.status === "sending") && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>}
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                      {STOPPABLE.includes(c.status) && <StopButton id={c.id} onDone={loadAnalytics} />}
                      {(c.stats.failed + c.stats.bounced) > 0 && <ResendFailedButton id={c.id} count={c.stats.failed + c.stats.bounced} onDone={loadAnalytics} />}
                    </div>
                    {(() => { const tot = c.stats.total || c.recipient_count || 0; const gone = tot - c.stats.remaining; return (
                      <>
                        <div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${tot ? (gone / tot) * 100 : 0}%` }} /></div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                          <span><b>{gone.toLocaleString()}</b> / {tot.toLocaleString()} gone</span>
                          <span><b>{c.stats.remaining.toLocaleString()}</b> remaining</span>
                          <span><b>{c.stats.delivered.toLocaleString()}</b> delivered ({pct(c.stats.delivered, c.stats.sent)})</span>
                          <span><b>{c.stats.opened.toLocaleString()}</b> opened ({pct(c.stats.opened, c.stats.delivered)})</span>
                          <span><b>{c.stats.clicked.toLocaleString()}</b> clicked ({pct(c.stats.clicked, c.stats.delivered)})</span>
                          <span><b>{(c.stats.failed + c.stats.bounced).toLocaleString()}</b> failed</span>
                          {c.status === "running" && c.next_send_at && <span className="text-muted-foreground">Next batch {new Date(c.next_send_at).toLocaleTimeString()}</span>}
                        </div>
                      </>
                    ); })()}
                    {c.last_error && <p className="text-sm text-destructive">{c.last_error.split("\n")[0]}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="new">
          <Card className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Campaign name</Label>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="October CAT mock offer" />
              </div>
              <div>
                <Label>Start from template</Label>
                <Select value={templateId} onValueChange={(v) => applyTemplate(v === "none" ? null : templates.find((x) => x.id === v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Write a new email</SelectItem>
                    {templates.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <EmailComposerFields key={composerKey} draft={draft} onChange={setDraft} variables={variables} sampleVars={sample} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Send to</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">A saved contact list</SelectItem>
                    <SelectItem value="all">All registered users ({counts.all})</SelectItem>
                    <SelectItem value="enrolled">Enrolled students ({counts.enrolled})</SelectItem>
                    <SelectItem value="selected">Specific emails</SelectItem>
                  </SelectContent>
                </Select>
                {audience === "list" && (
                  <Select value={listId} onValueChange={setListId}>
                    <SelectTrigger><SelectValue placeholder={lists.length ? "Choose a list" : "No lists yet — upload one first"} /></SelectTrigger>
                    <SelectContent>{lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.contact_count})</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {audience === "selected" && <Textarea rows={3} value={selectedEmails} onChange={(e) => setSelectedEmails(e.target.value)} placeholder="one@example.com, two@example.com" />}
              </div>
              <div className="space-y-2">
                <Label>Send a test first</Label>
                <div className="flex gap-2">
                  <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
                  <Button variant="outline" disabled={sending} onClick={sendTest}><FlaskConical className="mr-1 h-4 w-4" /> Test</Button>
                </div>
                <p className="text-sm text-muted-foreground">Unsubscribed and bounced addresses are skipped automatically.</p>
              </div>
            </div>
            <div className="space-y-2 rounded-lg border p-4">
              <p className="font-medium">Sender</p>
              <Select value={senderId} onValueChange={(v) => { setSenderId(v); setSenderTouched(true); }}>
                <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default — {draft.fromName || "MBA Compass"} &lt;no-reply@notify.mbacompass.in&gt;</SelectItem>
                  {senders.map((x) => <SelectItem key={x.id} value={x.id} disabled={x.status === "paused"}>{x.label} — {x.from_name} &lt;{x.local_part}@notify.mbacompass.in&gt;{x.status === "paused" ? " (paused)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{senderTouched ? "Chosen by you." : "Picked automatically from the campaign name and subject."} Every email in this campaign uses this sender, its daily cap and its auto-pause rules.</p>
            </div>
            <div className="space-y-2 rounded-lg border p-4">
              <p className="font-medium">Sending speed</p>
              <SpeedFields interval={intervalSec} batch={batchSize} onInterval={setIntervalSec} onBatch={setBatchSize} />
              <p className="text-sm text-muted-foreground">You can change this while the campaign is running — it applies to the remaining emails straight away.</p>
            </div>
            <Button size="lg" disabled={sending} onClick={sendNow}><Send className="mr-2 h-4 w-4" /> {sending ? "Sending…" : "Send campaign"}</Button>
          </Card>
        </TabsContent>

        <TabsContent value="templates"><TemplatesTab onUse={applyTemplate} onChanged={loadRefs} /></TabsContent>
        <TabsContent value="lists"><ContactListsTab onChanged={loadRefs} /></TabsContent>
        <TabsContent value="senders"><SendersTab onChanged={loadRefs} /></TabsContent>
      </Tabs>
    </div>
  );
}
