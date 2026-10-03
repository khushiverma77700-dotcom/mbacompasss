import { useEffect, useMemo, useState } from "react";
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
import { ArrowLeft, Download, FlaskConical, Send } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { getCampaignRecipients, getEmailAnalytics, getEmailAudienceCounts, sendEmailCampaign } from "@/lib/adminEmail.functions";
import EmailComposerFields from "./email/EmailComposerFields";
import ContactListsTab from "./email/ContactListsTab";
import TemplatesTab from "./email/TemplatesTab";
import { BUILTIN_VARS, type EmailDraft, emptyDraft, pct } from "./email/emailShared";

const db = supabase as any;
type Audience = "all" | "enrolled" | "list" | "selected";

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
    } catch (e: any) { toast.error(e?.message || "Failed to load analytics"); }
  };
  const loadRefs = async () => {
    const [{ data: l }, { data: t }] = await Promise.all([
      db.from("email_contact_lists").select("id,name,contact_count,variables").order("created_at", { ascending: false }),
      db.from("email_templates").select("*").order("updated_at", { ascending: false }),
    ]);
    setLists(l ?? []); setTemplates(t ?? []);
  };
  useEffect(() => { loadRefs(); fetchCounts({}).then((c: any) => setCounts(c)).catch(() => {}); }, []);
  useEffect(() => { loadAnalytics(); }, [range, campaignFilter]);

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
    setSending(true);
    try {
      const r: any = await send({ data: payload(audience) });
      toast.success(`Queued ${r.queued} emails${r.failed ? `, ${r.failed} skipped` : ""}`);
      setDraft(emptyDraft()); setCampaignName(""); setTemplateId("none"); setComposerKey((k) => k + 1);
      await loadAnalytics(); setTab("campaigns");
    } catch (e: any) { toast.error(e?.message || "Send failed"); }
    finally { setSending(false); }
  };

  const openDetail = async (c: any) => {
    try { setDetail({ campaign: c, data: await fetchRecipients({ data: { campaignId: c.id } }) }); setTab("campaigns"); }
    catch (e: any) { toast.error(e?.message || "Failed to load report"); }
  };

  const t = analytics?.totals ?? { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0, pending: 0 };
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Sent" value={t.sent} sub={`${t.pending} pending`} />
            <StatCard label="Delivered" value={t.delivered} sub={pct(t.delivered, t.sent)} />
            <StatCard label="Opened" value={t.opened} sub={`${pct(t.opened, t.delivered)} open rate`} />
            <StatCard label="Clicked" value={t.clicked} sub={`${pct(t.clicked, t.delivered)} click rate`} />
            <StatCard label="Bounced" value={t.bounced} sub={`${pct(t.bounced, t.sent)} bounce rate`} />
            <StatCard label="Failed" value={t.failed} sub={pct(t.failed, t.sent)} />
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
                    <Area dataKey="cumOpened" name="Opened" stroke="hsl(var(--chart-2, 160 60% 45%))" fill="hsl(var(--chart-2, 160 60% 45%))" fillOpacity={0.15} />
                    <Area dataKey="cumClicked" name="Clicked" stroke="hsl(var(--chart-4, 40 90% 55%))" fill="hsl(var(--chart-4, 40 90% 55%))" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">Open rates are approximate: some mail apps load images automatically, others block them. Clicks are exact.</p>
        </TabsContent>

        <TabsContent value="campaigns">
          {detail ? (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setDetail(null)}><ArrowLeft className="mr-1 h-4 w-4" /> All campaigns</Button>
              <Card className="p-5">
                <h2 className="text-xl font-semibold">{detail.campaign.name || detail.campaign.subject}</h2>
                <p className="text-sm text-muted-foreground">Subject: {detail.campaign.subject} · From: {detail.campaign.from_name || "MBA Compass"} · List: {detail.campaign.list_name || detail.campaign.audience} · Template: {detail.campaign.template_name || "—"} · {new Date(detail.campaign.created_at).toLocaleString()}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
                  {(["sent", "delivered", "opened", "clicked", "bounced", "failed"] as const).map((k) => <StatCard key={k} label={k[0].toUpperCase() + k.slice(1)} value={detail.campaign.stats[k]} />)}
                </div>
              </Card>
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
                      <span className={`rounded px-2 py-0.5 ${statusTone(r.status)}`}>{r.status === "sent" ? "delivered" : r.status === "dlq" ? "failed" : r.status}</span>
                      <span className="w-28 text-muted-foreground">{r.open_count ? `Opened ×${r.open_count}` : "Not opened"}</span>
                      <span className="w-24 text-muted-foreground">{r.click_count ? `Clicks ×${r.click_count}` : "No clicks"}</span>
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
                  <button key={c.id} onClick={() => openDetail(c)} className="flex w-full flex-wrap items-center gap-3 py-3 text-left hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.name || c.subject}</p>
                      <p className="text-sm text-muted-foreground">{c.list_name || c.audience} · {c.template_name || "No template"} · {new Date(c.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline">{c.status}</Badge>
                    <span className="w-20 text-sm">{c.stats.sent} sent</span>
                    <span className="w-24 text-sm">{pct(c.stats.delivered, c.stats.sent)} deliv.</span>
                    <span className="w-24 text-sm">{pct(c.stats.opened, c.stats.delivered)} open</span>
                    <span className="w-24 text-sm">{pct(c.stats.clicked, c.stats.delivered)} click</span>
                  </button>
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
            <Button size="lg" disabled={sending} onClick={sendNow}><Send className="mr-2 h-4 w-4" /> {sending ? "Sending…" : "Send campaign"}</Button>
          </Card>
        </TabsContent>

        <TabsContent value="templates"><TemplatesTab onUse={applyTemplate} onChanged={loadRefs} /></TabsContent>
        <TabsContent value="lists"><ContactListsTab onChanged={loadRefs} /></TabsContent>
      </Tabs>
    </div>
  );
}
