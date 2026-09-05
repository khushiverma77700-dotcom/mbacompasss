// Admin control room for browser (Chrome) notifications:
// the on/off switch, the wording students see, sending a broadcast,
// registered devices and the full send history.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BellRing, Send, Smartphone, History } from "lucide-react";
import { toast } from "sonner";
import { sendPushBroadcast } from "@/lib/push.functions";
import {
  DEFAULT_PUSH_SETTINGS,
  readPushSettings,
  type PushSettings,
} from "@/components/NotificationOptIn";

type Broadcast = {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  audience: string;
  sent_count: number;
  failed_count: number;
  status: string;
  error_text: string | null;
  created_at: string;
};

type Device = {
  id: string;
  user_id: string | null;
  page_path: string | null;
  user_agent: string | null;
  created_at: string;
};

export default function AdminPushNotifications() {
  const [settings, setSettings] = useState<PushSettings>(DEFAULT_PUSH_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audience, setAudience] = useState<"all" | "signed_in">("all");
  const [sending, setSending] = useState(false);

  const [devices, setDevices] = useState<Device[]>([]);
  const [history, setHistory] = useState<Broadcast[]>([]);

  const load = async () => {
    const [{ data: deviceRows }, { data: historyRows }] = await Promise.all([
      supabase
        .from("push_subscribers")
        .select("id, user_id, page_path, user_agent, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("push_broadcasts")
        .select("id, title, body, link_url, audience, sent_count, failed_count, status, error_text, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setDevices((deviceRows ?? []) as Device[]);
    setHistory((historyRows ?? []) as Broadcast[]);
  };

  useEffect(() => {
    void readPushSettings().then(setSettings);
    void load();
  }, []);

  const signedInDevices = useMemo(() => devices.filter((d) => d.user_id).length, [devices]);

  const saveSettings = async (next: PushSettings) => {
    setSavingSettings(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "push_settings", value: next }, { onConflict: "key" });
    setSavingSettings(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSettings(next);
    toast.success("Notification settings saved");
  };

  const send = async () => {
    if (!title.trim()) {
      toast.error("Add a title first");
      return;
    }
    setSending(true);
    try {
      const result = await sendPushBroadcast({
        data: {
          title: title.trim(),
          body: body.trim(),
          linkUrl: linkUrl.trim(),
          imageUrl: imageUrl.trim(),
          audience,
        },
      });
      if (result.error) toast.error(result.error);
      else
        toast.success(
          `Notification sent to ${result.sent} device${result.sent === 1 ? "" : "s"}${
            result.failed ? ` (${result.failed} failed)` : ""
          }`,
        );
      setTitle("");
      setBody("");
      setLinkUrl("");
      setImageUrl("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-[2.25rem] font-semibold text-slate-900">
          <BellRing className="h-7 w-7 text-sky-600" /> Browser Notifications
        </h1>
        <p className="text-base text-slate-600">
          Ask visitors for permission on the site and send alerts straight to their browser.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Smartphone className="h-4 w-4 text-sky-600" /> Devices subscribed
            </p>
            <p className="pt-1 text-[1.375rem] font-semibold text-slate-900">{devices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Signed-in students</p>
            <p className="pt-1 text-[1.375rem] font-semibold text-slate-900">{signedInDevices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Notifications sent</p>
            <p className="pt-1 text-[1.375rem] font-semibold text-slate-900">{history.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[1.375rem]">Permission prompt shown to students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div>
              <p className="text-base text-slate-900">Ask visitors to allow notifications</p>
              <p className="text-sm text-slate-500">
                When off, the request card disappears from the site.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              disabled={savingSettings}
              onCheckedChange={(v) => void saveSettings({ ...settings, enabled: v })}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Heading</Label>
              <Input
                value={settings.prompt_title}
                onChange={(e) => setSettings({ ...settings, prompt_title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Button label</Label>
              <Input
                value={settings.button_label}
                onChange={(e) => setSettings({ ...settings, button_label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Message</Label>
              <Textarea
                rows={2}
                value={settings.prompt_body}
                onChange={(e) => setSettings({ ...settings, prompt_body: e.target.value })}
              />
            </div>
          </div>
          <Button disabled={savingSettings} onClick={() => void saveSettings(settings)}>
            Save wording
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[1.375rem]">Send a notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="IIM Bangalore form closes tomorrow"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Who receives it</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as "all" | "signed_in")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone who allowed alerts</SelectItem>
                  <SelectItem value="signed_in">Signed-in students only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Message</Label>
              <Textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Last date is 24 November. Apply before the portal closes."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link opened on click</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://mbacompass.in/mba-application"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Image URL (optional)</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </div>
          </div>
          <Button disabled={sending} onClick={() => void send()} className="gap-1.5">
            <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send notification"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[1.375rem]">
            <History className="h-5 w-5 text-sky-600" /> Sent history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing sent yet.</p>
          ) : (
            history.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-medium text-slate-900">{row.title}</p>
                  <Badge variant="outline">{row.sent_count} delivered</Badge>
                  {row.failed_count > 0 && (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      {row.failed_count} failed
                    </Badge>
                  )}
                  <span className="text-sm text-slate-500">
                    {new Date(row.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                {row.body && <p className="pt-1 text-sm text-slate-600">{row.body}</p>}
                {row.error_text && (
                  <p className="pt-1 text-sm text-rose-600">{row.error_text}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
