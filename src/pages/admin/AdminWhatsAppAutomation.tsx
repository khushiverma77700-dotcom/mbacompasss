// WhatsApp Automation — simple version: three tabs (Campaigns, Templates,
// New campaign). Everything about one campaign lives in one place.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useServerFn } from "@tanstack/react-start";
import { runWhatsAppDispatch, getWhatsAppConnectionStatus } from "@/lib/whatsappAutomation.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WhatsAppCampaignOverview from "@/components/admin/whatsapp/WhatsAppCampaignOverview";
import WhatsAppTemplates, {
  fetchWhatsAppTemplates,
  type WhatsAppTemplate,
} from "@/components/admin/whatsapp/WhatsAppTemplates";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Upload,
  Plus,
  MessageSquare,
  Trash2,
  Loader2,
} from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  message_type: "text" | "template";
  template_name: string | null;
  template_language: string;
  template_params: unknown;
  message_body: string | null;
  daily_limit: number;
  start_date: string;
  total_target: number | null;
  status: "draft" | "running" | "paused" | "completed" | "stopped";
  last_run_at: string | null;
  created_at: string;
  send_start_time: string;
  send_end_time: string;
  send_timezone: string;
};

const TIME_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
];

const shortTime = (value: string | null | undefined) => (value ?? "").slice(0, 5);

type Recipient = {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
};

type LogRow = {
  id: string;
  phone: string;
  attempt: number;
  status: string;
  error_code: string | null;
  error_message: string | null;
  provider_message_id: string | null;
  next_retry_at: string | null;
  created_at: string;
};

type Stats = {
  total: number;
  sent: number;
  pending: number;
  retry: number;
  maxRetryFailed: number;
  todaySent: number;
  todayFailed: number;
  todayProcessed: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  sending: "Sending",
  sent: "Sent",
  retry: "In retry queue",
  max_retry_failed: "Failed – max retries reached",
  skipped: "Skipped",
};

function normalisePhone(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D+/g, "").replace(/^0+/, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

const EMPTY_STATS: Stats = {
  total: 0,
  sent: 0,
  pending: 0,
  retry: 0,
  maxRetryFailed: 0,
  todaySent: 0,
  todayFailed: 0,
  todayProcessed: 0,
};

export default function AdminWhatsAppAutomation() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<{ connected: boolean; phoneNumberId: string | null } | null>(
    null,
  );
  const [tab, setTab] = useState("campaigns");

  // New-campaign form
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [name, setName] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [templateParams, setTemplateParams] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [usePlainText, setUsePlainText] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("100");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sendStartTime, setSendStartTime] = useState("09:00");
  const [sendEndTime, setSendEndTime] = useState("21:00");
  const [sendTimezone, setSendTimezone] = useState("Asia/Kolkata");
  const [newNumbers, setNewNumbers] = useState("");

  // Numbers inside a campaign
  const [manualNumbers, setManualNumbers] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<string>("all");

  const dispatchNow = useServerFn(runWhatsAppDispatch);
  const checkConnection = useServerFn(getWhatsAppConnectionStatus);

  const selected = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId],
  );

  const approvedTemplates = useMemo(
    () => templates.filter((t) => t.status.toUpperCase() === "APPROVED"),
    [templates],
  );

  const loadCampaigns = useCallback(async () => {
    const { data, error } = await supabase
      .from("whatsapp_campaigns")
      .select(
        "id, name, message_type, template_name, template_language, template_params, message_body, daily_limit, start_date, total_target, status, last_run_at, created_at, send_start_time, send_end_time, send_timezone",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCampaigns((data ?? []) as Campaign[]);
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplates(await fetchWhatsAppTemplates());
    } catch {
      /* the Templates tab reports its own errors */
    }
  }, []);

  const loadCampaignDetail = useCallback(async (campaignId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const [recipientRes, logRes, statRes] = await Promise.all([
      supabase
        .from("whatsapp_recipients")
        .select("id, phone, name, status, attempts, next_retry_at, last_error, provider_message_id, sent_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true })
        .limit(2000),
      supabase
        .from("whatsapp_send_logs")
        .select("id, phone, attempt, status, error_code, error_message, provider_message_id, next_retry_at, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("whatsapp_daily_stats")
        .select("sent_count, failed_count, processed_count")
        .eq("campaign_id", campaignId)
        .eq("send_date", today)
        .maybeSingle(),
    ]);

    const rows = (recipientRes.data ?? []) as Recipient[];
    setRecipients(rows);
    setLogs((logRes.data ?? []) as LogRow[]);
    setStats({
      total: rows.length,
      sent: rows.filter((r) => r.status === "sent").length,
      pending: rows.filter((r) => r.status === "pending").length,
      retry: rows.filter((r) => r.status === "retry").length,
      maxRetryFailed: rows.filter((r) => r.status === "max_retry_failed").length,
      todaySent: (statRes.data?.sent_count as number | undefined) ?? 0,
      todayFailed: (statRes.data?.failed_count as number | undefined) ?? 0,
      todayProcessed: (statRes.data?.processed_count as number | undefined) ?? 0,
    });
  }, []);

  useEffect(() => {
    void loadCampaigns();
    void loadTemplates();
    void checkConnection()
      .then((res) => setConnection({ connected: res.connected, phoneNumberId: res.phoneNumberId }))
      .catch(() => setConnection({ connected: false, phoneNumberId: null }));
  }, [loadCampaigns, loadTemplates, checkConnection]);

  useEffect(() => {
    if (selectedId) void loadCampaignDetail(selectedId);
  }, [selectedId, loadCampaignDetail]);

  // Live refresh while a campaign is sending.
  useEffect(() => {
    if (!selectedId || selected?.status !== "running") return;
    const timer = setInterval(() => {
      void loadCampaignDetail(selectedId);
    }, 15000);
    return () => clearInterval(timer);
  }, [selectedId, selected?.status, loadCampaignDetail]);

  const insertRecipients = async (
    campaignId: string,
    entries: { phone: string; name?: string | null; variables?: Record<string, unknown> }[],
  ) => {
    const seen = new Set<string>();
    const rows: { campaign_id: string; phone: string; name: string | null; variables: Json }[] = [];
    let invalid = 0;
    for (const entry of entries) {
      const phone = normalisePhone(entry.phone);
      if (!phone) {
        invalid += 1;
        continue;
      }
      if (seen.has(phone)) continue;
      seen.add(phone);
      rows.push({
        campaign_id: campaignId,
        phone,
        name: entry.name ?? null,
        variables: (entry.variables ?? {}) as Json,
      });
    }
    if (rows.length === 0) {
      toast.error("No valid numbers found");
      return;
    }
    setBusy(true);
    let added = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { data, error } = await supabase
        .from("whatsapp_recipients")
        .upsert(chunk, { onConflict: "campaign_id,phone", ignoreDuplicates: true })
        .select("id");
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
      added += data?.length ?? 0;
    }
    setBusy(false);
    const duplicates = rows.length - added;
    toast.success(
      `${added} numbers added. ${duplicates > 0 ? `${duplicates} duplicates skipped. ` : ""}${invalid > 0 ? `${invalid} invalid skipped.` : ""}`,
    );
    await loadCampaignDetail(campaignId);
  };

  const parseFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    let records: Record<string, unknown>[] = [];
    if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
      const Papa = (await import("papaparse")).default;
      const text = await file.text();
      records = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true }).data;
    } else {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const first = wb.SheetNames[0];
      if (!first) throw new Error("The file has no sheets");
      const sheet = wb.Sheets[first];
      if (!sheet) throw new Error("The first sheet is empty");
      records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    }
    return records
      .map((row) => {
        const keys = Object.keys(row);
        const phoneKey =
          keys.find((k) => /phone|mobile|whatsapp|number|contact/i.test(k)) ?? keys[0] ?? "";
        const nameKey = keys.find((k) => /^name$|full.?name|student/i.test(k));
        const variables: Record<string, unknown> = {};
        for (const k of keys) {
          if (k === phoneKey) continue;
          variables[k.trim().toLowerCase().replace(/\s+/g, "_")] = row[k];
        }
        return {
          phone: String(row[phoneKey] ?? ""),
          name: nameKey ? String(row[nameKey] ?? "") || null : null,
          variables,
        };
      })
      .filter((e) => e.phone.trim().length > 0);
  };

  const handleFile = async (file: File) => {
    if (!selectedId) {
      toast.error("Select a campaign first");
      return;
    }
    try {
      const entries = await parseFile(file);
      if (entries.length === 0) {
        toast.error("No numbers found in the file");
        return;
      }
      await insertRecipients(selectedId, entries);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
  };

  const addManual = async () => {
    if (!selectedId) return;
    const entries = manualNumbers
      .split(/[\n,;]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .map((phone) => ({ phone }));
    if (entries.length === 0) {
      toast.error("Enter at least one number");
      return;
    }
    await insertRecipients(selectedId, entries);
    setManualNumbers("");
  };

  const createCampaign = async () => {
    const template = approvedTemplates.find((t) => `${t.name}|${t.language}` === templateKey) ?? null;
    if (!usePlainText && !template) {
      toast.error("Pick an approved template");
      return;
    }
    if (usePlainText && !messageBody.trim()) {
      toast.error("Enter the message text");
      return;
    }
    const numbers = newNumbers
      .split(/[\n,;]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .map((phone) => ({ phone }));

    setBusy(true);
    const params = templateParams
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    const campaignName =
      name.trim() || `${template?.name ?? "Message"} — ${new Date().toISOString().slice(0, 10)}`;
    const { data, error } = await supabase
      .from("whatsapp_campaigns")
      .insert({
        name: campaignName,
        message_type: usePlainText ? "text" : "template",
        template_name: template ? template.name : null,
        template_language: template ? template.language : "en",
        template_params: params,
        message_body: usePlainText ? messageBody.trim() : null,
        daily_limit: Math.max(parseInt(dailyLimit, 10) || 50, 1),
        start_date: startDate,
        send_start_time: sendStartTime || "09:00",
        send_end_time: sendEndTime || "21:00",
        send_timezone: sendTimezone || "Asia/Kolkata",
        status: "running",
        template_id: template ? template.id : null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const newId = data?.id as string | undefined;
    await loadCampaigns();
    if (newId) {
      setSelectedId(newId);
      if (numbers.length > 0) await insertRecipients(newId, numbers);
    }
    toast.success("Campaign created and started");
    setName("");
    setNewNumbers("");
    setTemplateParams("");
    setMessageBody("");
    setTab("campaigns");
  };

  const setStatus = async (status: Campaign["status"]) => {
    if (!selectedId) return;
    setBusy(true);
    const { error } = await supabase.from("whatsapp_campaigns").update({ status }).eq("id", selectedId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Campaign ${status}`);
    await loadCampaigns();
  };

  const saveCampaignPatch = async (
    patch: Partial<Pick<Campaign, "daily_limit" | "send_start_time" | "send_end_time" | "send_timezone">>,
  ) => {
    if (!selectedId) return;
    const { error } = await supabase.from("whatsapp_campaigns").update(patch).eq("id", selectedId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Campaign updated");
    await loadCampaigns();
  };

  const runNow = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const result = await dispatchNow({ data: { campaignId: selectedId, ignoreWindow: true } });
      if (result.error) {
        toast.error(result.error);
      } else {
        const run = result.campaigns[0];
        toast.success(
          run
            ? `Sent ${run.sent}, failed ${run.failed}${run.skippedReason ? ` (${run.skippedReason})` : ""}`
            : "Nothing to send right now",
        );
      }
      await loadCampaigns();
      await loadCampaignDetail(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dispatch failed");
    } finally {
      setBusy(false);
    }
  };

  const resetRetries = async () => {
    if (!selectedId) return;
    const { error } = await supabase
      .from("whatsapp_recipients")
      .update({ status: "retry", attempts: 0, next_retry_at: null })
      .eq("campaign_id", selectedId)
      .eq("status", "max_retry_failed");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Permanently failed numbers queued for another round");
    await loadCampaignDetail(selectedId);
  };

  const deleteCampaign = async () => {
    if (!selectedId) return;
    const { error } = await supabase.from("whatsapp_campaigns").delete().eq("id", selectedId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Campaign deleted");
    setSelectedId(null);
    await loadCampaigns();
  };

  const filteredRecipients = useMemo(() => {
    if (recipientFilter === "all") return recipients.slice(0, 500);
    return recipients.filter((r) => r.status === recipientFilter).slice(0, 500);
  }, [recipients, recipientFilter]);

  const remaining = stats.pending + stats.retry;
  const dailyRemaining = selected ? Math.max(selected.daily_limit - stats.todayProcessed, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Automation</h1>
          <p className="text-sm text-muted-foreground">
            Pick a template, add numbers, set how many go out per day. The system keeps sending
            daily and retries failures on its own.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connection ? (
            <Badge variant={connection.connected ? "default" : "destructive"}>
              {connection.connected ? "WhatsApp connected" : "WhatsApp API keys missing"}
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => void loadCampaigns()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {connection && !connection.connected ? (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm">
          Sending is paused because the WhatsApp API key is not saved yet. Add
          <span className="font-semibold"> SMARTPING_API_KEY </span> and
          <span className="font-semibold"> SMARTPING_PHONE_NUMBER_ID </span>
          in <span className="font-semibold">API Keys &amp; Secrets</span>, then reload this page.
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="new">New campaign</TabsTrigger>
        </TabsList>

        {/* ---------------- Campaigns ---------------- */}
        <TabsContent value="campaigns" className="space-y-6 pt-4">
          <WhatsAppCampaignOverview
            onSelect={(id) => setSelectedId(id)}
            onChanged={() => void loadCampaigns()}
          />

          {selected ? (
            <>
              <Card className="p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selected.message_type === "template"
                        ? `Template: ${selected.template_name} (${selected.template_language})`
                        : "Plain text message"}{" "}
                      · starts {selected.start_date} · sends {shortTime(selected.send_start_time)}–
                      {shortTime(selected.send_end_time)} ({selected.send_timezone})
                      {selected.last_run_at
                        ? ` · last run ${new Date(selected.last_run_at).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      selected.status === "running"
                        ? "default"
                        : selected.status === "completed"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {selected.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={busy || selected.status === "running"}
                    onClick={() => void setStatus("running")}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {selected.status === "paused" ? "Resume" : "Start"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || selected.status !== "running"}
                    onClick={() => void setStatus("paused")}
                  >
                    <Pause className="w-4 h-4 mr-2" /> Pause
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || selected.status === "stopped"}
                    onClick={() => void setStatus("stopped")}
                  >
                    <Square className="w-4 h-4 mr-2" /> Stop
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runNow()}>
                    {busy ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4 mr-2" />
                    )}
                    Send today&apos;s batch now
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => void deleteCampaign()}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-end gap-3 border-t pt-3">
                  <div>
                    <Label className="text-sm">Daily limit</Label>
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      defaultValue={selected.daily_limit}
                      onBlur={(e) =>
                        void saveCampaignPatch({
                          daily_limit: Math.max(parseInt(e.target.value, 10) || 1, 1),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Send from</Label>
                    <Input
                      type="time"
                      className="w-32"
                      defaultValue={shortTime(selected.send_start_time)}
                      onBlur={(e) => void saveCampaignPatch({ send_start_time: e.target.value || "09:00" })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Send until</Label>
                    <Input
                      type="time"
                      className="w-32"
                      defaultValue={shortTime(selected.send_end_time)}
                      onBlur={(e) => void saveCampaignPatch({ send_end_time: e.target.value || "21:00" })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Time zone</Label>
                    <Select
                      value={selected.send_timezone}
                      onValueChange={(v) => void saveCampaignPatch({ send_timezone: v })}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_ZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Numbers uploaded", value: stats.total },
                  { label: "Sent successfully", value: stats.sent },
                  { label: "Failed (all attempts)", value: stats.maxRetryFailed },
                  { label: "Pending", value: stats.pending },
                  { label: "In retry queue", value: stats.retry },
                  { label: "Remaining numbers", value: remaining },
                  { label: "Sent today", value: stats.todaySent },
                  { label: "Left in today's quota", value: dailyRemaining },
                ].map((item) => (
                  <Card key={item.label} className="p-4">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                  </Card>
                ))}
              </div>

              <Card className="p-4 space-y-4">
                <p className="text-sm font-semibold">Add numbers to this campaign</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Upload CSV or Excel</Label>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        type="file"
                        accept=".csv,.txt,.xlsx,.xls"
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleFile(file);
                          e.target.value = "";
                        }}
                      />
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground pt-1">
                      The number column can be called phone, mobile, whatsapp or number.
                    </p>
                  </div>
                  <div>
                    <Label>Or paste numbers</Label>
                    <Textarea
                      rows={3}
                      placeholder="9876543210, 9812345678"
                      value={manualNumbers}
                      onChange={(e) => setManualNumbers(e.target.value)}
                    />
                    <Button size="sm" className="mt-2" disabled={busy} onClick={() => void addManual()}>
                      <Plus className="w-4 h-4 mr-2" /> Add numbers
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                  <p className="text-sm font-semibold">Numbers ({recipients.length})</p>
                  <div className="flex items-center gap-2">
                    <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="retry">In retry queue</SelectItem>
                        <SelectItem value="max_retry_failed">Failed – max retries</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => void resetRetries()}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Retry failed
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Next retry</TableHead>
                        <TableHead>Last error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecipients.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.phone}</TableCell>
                          <TableCell>{r.name ?? "—"}</TableCell>
                          <TableCell>{STATUS_LABEL[r.status] ?? r.status}</TableCell>
                          <TableCell>{r.attempts} / 3</TableCell>
                          <TableCell>
                            {r.next_retry_at ? new Date(r.next_retry_at).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate">{r.last_error ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <Card className="p-4 overflow-x-auto">
                <p className="text-sm font-semibold pb-3">Activity log</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date &amp; time</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Attempt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Failure reason</TableHead>
                      <TableHead>Message ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{l.phone}</TableCell>
                        <TableCell>{l.attempt}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "sent" ? "default" : "destructive"}>
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate">
                          {l.error_message
                            ? `${l.error_code ? `[${l.error_code}] ` : ""}${l.error_message}`
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {l.provider_message_id ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <Card className="p-6 text-sm text-muted-foreground">
              Pick a campaign above to see its numbers, progress and logs.
            </Card>
          )}
        </TabsContent>

        {/* ---------------- Templates ---------------- */}
        <TabsContent value="templates" className="pt-4">
          <WhatsAppTemplates
            onUse={(template) => {
              setTemplateKey(`${template.name}|${template.language}`);
              setUsePlainText(false);
              setName((current) => current || `${template.name} — ${new Date().toISOString().slice(0, 10)}`);
              void loadTemplates();
              setTab("new");
            }}
          />
        </TabsContent>

        {/* ---------------- New campaign ---------------- */}
        <TabsContent value="new" className="pt-4">
          <Card className="p-4 space-y-4 max-w-2xl">
            <div>
              <Label>Message</Label>
              {usePlainText ? (
                <Textarea
                  rows={4}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Hi {{name}}, your CAT mock series is live."
                />
              ) : (
                <Select value={templateKey} onValueChange={setTemplateKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an approved template" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedTemplates.map((t) => (
                      <SelectItem key={t.id} value={`${t.name}|${t.language}`}>
                        {t.name} ({t.language}) · {t.variable_count} blanks
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-sm text-muted-foreground pt-1">
                Templates reach anyone. Plain text only reaches people who messaged you in the last
                24 hours.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setUsePlainText((v) => !v)}
                >
                  {usePlainText ? "Use a template instead" : "Use plain text instead"}
                </button>
                {approvedTemplates.length === 0 && !usePlainText
                  ? " No approved templates yet — open the Templates tab and sync them."
                  : ""}
              </p>
            </div>

            {!usePlainText ? (
              <div>
                <Label>Values for the blanks (separate with |)</Label>
                <Input
                  value={templateParams}
                  onChange={(e) => setTemplateParams(e.target.value)}
                  placeholder="{{name}} | CAT 2026 | 30 November"
                />
                <p className="text-sm text-muted-foreground pt-1">
                  Use {"{{name}}"}, {"{{phone}}"} or any column from your file, in template order.
                </p>
              </div>
            ) : null}

            <div>
              <Label>Numbers (optional now, can be added later)</Label>
              <Textarea
                rows={3}
                value={newNumbers}
                onChange={(e) => setNewNumbers(e.target.value)}
                placeholder="9876543210, 9812345678"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Campaign name (optional)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CAT 2026 offer" />
              </div>
              <div>
                <Label>Messages per day</Label>
                <Select value={dailyLimit} onValueChange={setDailyLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["10", "50", "100", "250", "500", "1000"].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v} per day
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Send from</Label>
                <Input type="time" value={sendStartTime} onChange={(e) => setSendStartTime(e.target.value)} />
              </div>
              <div>
                <Label>Send until</Label>
                <Input type="time" value={sendEndTime} onChange={(e) => setSendEndTime(e.target.value)} />
              </div>
              <div>
                <Label>Time zone</Label>
                <Select value={sendTimezone} onValueChange={setSendTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_ZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button disabled={busy} onClick={() => void createCampaign()}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create &amp; start campaign
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
