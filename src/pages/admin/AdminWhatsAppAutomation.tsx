// WhatsApp Automation — bulk campaign sending with a daily limit, automatic
// retry queue and full activity logging.

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
import WhatsAppMessageLibrary, {
  type SavedMessage,
} from "@/components/admin/whatsapp/WhatsAppMessageLibrary";
import WhatsAppCampaignOverview from "@/components/admin/whatsapp/WhatsAppCampaignOverview";
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<{ connected: boolean; phoneNumberId: string | null } | null>(null);

  // Create-campaign form
  const [name, setName] = useState("");
  const [messageType, setMessageType] = useState<"template" | "text">("template");
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("en");
  const [templateParams, setTemplateParams] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [dailyLimit, setDailyLimit] = useState("100");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sendStartTime, setSendStartTime] = useState("09:00");
  const [sendEndTime, setSendEndTime] = useState("21:00");
  const [sendTimezone, setSendTimezone] = useState("Asia/Kolkata");
  const [totalTarget, setTotalTarget] = useState("");

  const [savedMessageId, setSavedMessageId] = useState<string | null>(null);
  const [tab, setTab] = useState("dashboard");

  // Numbers
  const [manualNumbers, setManualNumbers] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<string>("all");

  const dispatchNow = useServerFn(runWhatsAppDispatch);
  const checkConnection = useServerFn(getWhatsAppConnectionStatus);

  const selected = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId],
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
    const rows = (data ?? []) as Campaign[];
    setCampaigns(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
    setLoading(false);
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
    void checkConnection()
      .then((res) => setConnection({ connected: res.connected, phoneNumberId: res.phoneNumberId }))
      .catch(() => setConnection({ connected: false, phoneNumberId: null }));
  }, [loadCampaigns, checkConnection]);

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

  const createCampaign = async () => {
    if (!name.trim()) {
      toast.error("Give the campaign a name");
      return;
    }
    if (messageType === "template" && !templateName.trim()) {
      toast.error("Enter the approved template name");
      return;
    }
    if (messageType === "text" && !messageBody.trim()) {
      toast.error("Enter the message text");
      return;
    }
    setBusy(true);
    const params = templateParams
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    const { data, error } = await supabase
      .from("whatsapp_campaigns")
      .insert({
        name: name.trim(),
        message_type: messageType,
        template_name: messageType === "template" ? templateName.trim() : null,
        template_language: templateLanguage.trim() || "en",
        template_params: params,
        message_body: messageType === "text" ? messageBody.trim() : null,
        daily_limit: Math.max(parseInt(dailyLimit, 10) || 50, 1),
        start_date: startDate,
        total_target: totalTarget ? Math.max(parseInt(totalTarget, 10) || 0, 0) || null : null,
        send_start_time: sendStartTime || "09:00",
        send_end_time: sendEndTime || "21:00",
        send_timezone: sendTimezone || "Asia/Kolkata",
        message_id: savedMessageId,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Campaign created. Now add numbers and start the automation.");
    setName("");
    setMessageBody("");
    setTemplateParams("");
    await loadCampaigns();
    if (data?.id) setSelectedId(data.id as string);
    setTab("numbers");
  };

  // Load a saved library message into the new-campaign form.
  const useSavedMessage = (message: SavedMessage) => {
    setSavedMessageId(message.id);
    setMessageType(message.message_type);
    setTemplateName(message.template_name ?? "");
    setTemplateLanguage(message.template_language ?? "en");
    setTemplateParams(
      Array.isArray(message.template_params)
        ? message.template_params.map((p) => String(p)).join(" | ")
        : "",
    );
    setMessageBody(message.message_body ?? "");
    setName((current) => current || `${message.name} — ${new Date().toISOString().slice(0, 10)}`);
    setTab("new");
    toast.success(`"${message.name}" loaded into the new campaign form`);
  };


  const insertRecipients = async (
    entries: { phone: string; name?: string | null; variables?: Record<string, unknown> }[],
  ) => {
    if (!selectedId) {
      toast.error("Select a campaign first");
      return;
    }
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
        campaign_id: selectedId,
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
    await loadCampaignDetail(selectedId);
  };

  const handleFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    try {
      let records: Record<string, unknown>[] = [];
      if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
        const Papa = (await import("papaparse")).default;
        const text = await file.text();
        const parsed = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
        });
        records = parsed.data;
      } else {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const first = wb.SheetNames[0];
        if (!first) throw new Error("The file has no sheets");
        const sheet = wb.Sheets[first];
        if (!sheet) throw new Error("The first sheet is empty");
        records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      }

      const entries = records
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

      if (entries.length === 0) {
        toast.error("No numbers found in the file");
        return;
      }
      await insertRecipients(entries);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
  };

  const addManual = async () => {
    const entries = manualNumbers
      .split(/[\n,;]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .map((phone) => ({ phone }));
    if (entries.length === 0) {
      toast.error("Enter at least one number");
      return;
    }
    await insertRecipients(entries);
    setManualNumbers("");
  };

  const setStatus = async (status: Campaign["status"]) => {
    if (!selectedId) return;
    setBusy(true);
    const { error } = await supabase
      .from("whatsapp_campaigns")
      .update({ status })
      .eq("id", selectedId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Campaign ${status}`);
    await loadCampaigns();
  };

  const saveDailyLimit = async (value: string) => {
    if (!selectedId) return;
    const limit = Math.max(parseInt(value, 10) || 0, 1);
    const { error } = await supabase
      .from("whatsapp_campaigns")
      .update({ daily_limit: limit })
      .eq("id", selectedId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Daily limit set to ${limit}`);
    await loadCampaigns();
  };

  const saveSendWindow = async (
    patch: { send_start_time?: string; send_end_time?: string; send_timezone?: string },
  ) => {
    if (!selectedId) return;
    const { error } = await supabase.from("whatsapp_campaigns").update(patch).eq("id", selectedId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sending time updated");
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
            Upload numbers, pick a message and let the system send a fixed number every day, with
            automatic retries for failures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connection ? (
            <Badge variant={connection.connected ? "default" : "destructive"}>
              {connection.connected
                ? `WhatsApp API connected${connection.phoneNumberId ? ` · ${connection.phoneNumberId}` : ""}`
                : "WhatsApp API keys missing"}
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

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="p-3 h-fit">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 pb-2">
            Campaigns
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground px-1 py-4">Loading…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1 py-4">No campaigns yet.</p>
          ) : (
            <div className="space-y-1">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <span className="block text-sm font-medium truncate">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.status} · {c.daily_limit}/day
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="all">All campaigns</TabsTrigger>
              <TabsTrigger value="messages">Message library</TabsTrigger>
              <TabsTrigger value="numbers">Numbers</TabsTrigger>
              <TabsTrigger value="queue">Retry queue</TabsTrigger>
              <TabsTrigger value="logs">Activity logs</TabsTrigger>
              <TabsTrigger value="new">New campaign</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="pt-4">
              <WhatsAppCampaignOverview
                onSelect={(id) => {
                  setSelectedId(id);
                  setTab("dashboard");
                }}
                onChanged={() => void loadCampaigns()}
              />
            </TabsContent>

            <TabsContent value="messages" className="pt-4">
              <WhatsAppMessageLibrary onUse={useSavedMessage} />
            </TabsContent>


            <TabsContent value="dashboard" className="space-y-4 pt-4">
              {!selected ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  Create a campaign to see its progress here.
                </Card>
              ) : (
                <>
                  <Card className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">{selected.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selected.message_type === "template"
                            ? `Template: ${selected.template_name} (${selected.template_language})`
                            : "Plain text message"}{" "}
                          · starts {selected.start_date} · sends {shortTime(selected.send_start_time)}
                          –{shortTime(selected.send_end_time)} ({selected.send_timezone})
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
                        {selected.status === "paused" ? "Resume" : "Start"} automation
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
                      <div className="flex items-center gap-2 ml-auto">
                        <Label className="text-sm">Daily limit</Label>
                        <Input
                          type="number"
                          min={1}
                          defaultValue={selected.daily_limit}
                          className="w-24"
                          onBlur={(e) => void saveDailyLimit(e.target.value)}
                        />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => void deleteCampaign()}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-end gap-3 border-t pt-3">
                      <div>
                        <Label className="text-sm">Send from</Label>
                        <Input
                          type="time"
                          className="w-32"
                          defaultValue={shortTime(selected.send_start_time)}
                          onBlur={(e) => void saveSendWindow({ send_start_time: e.target.value || "09:00" })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Send until</Label>
                        <Input
                          type="time"
                          className="w-32"
                          defaultValue={shortTime(selected.send_end_time)}
                          onBlur={(e) => void saveSendWindow({ send_end_time: e.target.value || "21:00" })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Time zone</Label>
                        <Select
                          value={selected.send_timezone}
                          onValueChange={(v) => void saveSendWindow({ send_timezone: v })}
                        >
                          <SelectTrigger className="w-48">
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
                      <p className="text-sm text-muted-foreground max-w-md">
                        Daily messages only go out inside this time span. Set the end time earlier than
                        the start time to run across midnight. &quot;Send today&apos;s batch now&quot;
                        ignores the time span.
                      </p>
                    </div>
                  </Card>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Numbers uploaded", value: stats.total },
                      { label: "Processed", value: stats.sent + stats.maxRetryFailed },
                      { label: "Sent successfully", value: stats.sent },
                      { label: "Failed (all attempts)", value: stats.maxRetryFailed },
                      { label: "Pending", value: stats.pending },
                      { label: "In retry queue", value: stats.retry },
                      { label: "Remaining numbers", value: remaining },
                      { label: "Daily limit", value: selected.daily_limit },
                      { label: "Sent today", value: stats.todaySent },
                      { label: "Failed today", value: stats.todayFailed },
                      { label: "Processed today", value: stats.todayProcessed },
                      { label: "Left in today's quota", value: dailyRemaining },
                    ].map((item) => (
                      <Card key={item.label} className="p-4">
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="numbers" className="space-y-4 pt-4">
              <Card className="p-4 space-y-4">
                <div>
                  <Label>Upload CSV or Excel</Label>
                  <p className="text-sm text-muted-foreground pb-2">
                    The column containing the number can be called phone, mobile, whatsapp or
                    number. Any other columns are stored and can be used inside the message.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls"
                      disabled={busy || !selectedId}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                        e.target.value = "";
                      }}
                    />
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label>Or add numbers manually</Label>
                  <Textarea
                    rows={4}
                    placeholder="9876543210, 9812345678"
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                  />
                  <Button size="sm" className="mt-2" disabled={busy || !selectedId} onClick={() => void addManual()}>
                    <Plus className="w-4 h-4 mr-2" /> Add numbers
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between gap-3 pb-3">
                  <p className="text-sm font-semibold">Uploaded numbers ({recipients.length})</p>
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
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Sent at</TableHead>
                        <TableHead>Last error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecipients.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.phone}</TableCell>
                          <TableCell>{r.name ?? "—"}</TableCell>
                          <TableCell>{STATUS_LABEL[r.status] ?? r.status}</TableCell>
                          <TableCell>{r.attempts}</TableCell>
                          <TableCell>{r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</TableCell>
                          <TableCell className="max-w-[280px] truncate">{r.last_error ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="queue" className="space-y-4 pt-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                  <p className="text-sm font-semibold">
                    Retry queue ({stats.retry}) · permanently failed ({stats.maxRetryFailed})
                  </p>
                  <Button size="sm" variant="outline" onClick={() => void resetRetries()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry permanently failed numbers
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Next retry</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients
                        .filter((r) => r.status === "retry" || r.status === "max_retry_failed")
                        .slice(0, 500)
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.phone}</TableCell>
                            <TableCell>{STATUS_LABEL[r.status] ?? r.status}</TableCell>
                            <TableCell>
                              {r.attempts} / 3
                            </TableCell>
                            <TableCell>
                              {r.next_retry_at ? new Date(r.next_retry_at).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell className="max-w-[320px] truncate">{r.last_error ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="pt-4">
              <Card className="p-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date &amp; time</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Attempt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Failure reason</TableHead>
                      <TableHead>Next retry</TableHead>
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
                          <Badge variant={l.status === "sent" ? "default" : "destructive"}>{l.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate">
                          {l.error_message ? `${l.error_code ? `[${l.error_code}] ` : ""}${l.error_message}` : "—"}
                        </TableCell>
                        <TableCell>
                          {l.next_retry_at ? new Date(l.next_retry_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {l.provider_message_id ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="new" className="pt-4">
              <Card className="p-4 space-y-4 max-w-2xl">
                <div>
                  <Label>Campaign name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CAT 2026 mock offer" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Message type</Label>
                    <Select value={messageType} onValueChange={(v) => setMessageType(v as "template" | "text")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="template">Approved template (for new contacts)</SelectItem>
                        <SelectItem value="text">Plain text (only within a 24h reply window)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Send from (time)</Label>
                    <Input type="time" value={sendStartTime} onChange={(e) => setSendStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label>Send until (time)</Label>
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
                  <p className="text-sm text-muted-foreground sm:col-span-3">
                    Messages are only sent inside this daily time span, in the selected time zone.
                  </p>
                </div>

                {messageType === "template" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Template name</Label>
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="mock_offer_v1"
                      />
                    </div>
                    <div>
                      <Label>Template language</Label>
                      <Input value={templateLanguage} onChange={(e) => setTemplateLanguage(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Template values (separate with |)</Label>
                      <Input
                        value={templateParams}
                        onChange={(e) => setTemplateParams(e.target.value)}
                        placeholder="{{name}} | CAT 2026 | 30 November"
                      />
                      <p className="text-sm text-muted-foreground pt-1">
                        Use {"{{name}}"}, {"{{phone}}"} or any column name from your file, in the same
                        order as the template placeholders.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>Message text</Label>
                    <Textarea
                      rows={4}
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      placeholder="Hi {{name}}, your CAT mock series is live."
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Daily sending limit</Label>
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
                  <div>
                    <Label>Total numbers to process (optional)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={totalTarget}
                      onChange={(e) => setTotalTarget(e.target.value)}
                      placeholder="Leave blank for all uploaded numbers"
                    />
                  </div>
                </div>

                <Button disabled={busy} onClick={() => void createCampaign()}>
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create campaign
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
