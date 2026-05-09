import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Send, RefreshCw } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";

const VARIABLES: { key: string; label: string }[] = [
  { key: "{{name}}", label: "Student Name" },
  { key: "{{email}}", label: "Login Email" },
  { key: "{{password}}", label: "Temp Password" },
  { key: "{{course}}", label: "Course Name" },
  { key: "{{amount}}", label: "Amount Paid" },
  { key: "{{dashboard_link}}", label: "Dashboard Link" },
  { key: "{{support_email}}", label: "Support Email" },
  { key: "{{support_phone}}", label: "Support Phone" },
];

interface Template {
  id: number;
  subject: string;
  body_html: string;
  support_email: string;
  support_phone: string;
  dashboard_link: string;
  enabled: boolean;
}
interface Log {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  course_name: string | null;
  amount: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export default function AdminWelcomeEmail() {
  const [tpl, setTpl] = useState<Template | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data: t } = await supabase
      .from("welcome_email_template").select("*").eq("id", 1).maybeSingle();
    if (t) setTpl(t as Template);
    const { data: l } = await supabase
      .from("welcome_email_logs").select("*").order("created_at", { ascending: false }).limit(100);
    setLogs((l as Log[]) || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!tpl) return;
    setSaving(true);
    const { error } = await supabase.from("welcome_email_template")
      .update({
        subject: tpl.subject,
        body_html: tpl.body_html,
        support_email: tpl.support_email,
        support_phone: tpl.support_phone,
        dashboard_link: tpl.dashboard_link,
        enabled: tpl.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Template saved");
  };

  const sendTest = async () => {
    if (!testEmail) return toast.error("Enter a test email");
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-welcome-email", {
      body: {
        recipient_email: testEmail,
        recipient_name: "Test Student",
        course_name: "CAT Mock Bundle",
        amount: 999,
        password: "TempPass123",
        test: true,
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast.error(error?.message || JSON.stringify((data as any)?.error));
    } else {
      toast.success("Test email sent");
      load();
    }
  };

  if (!tpl) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Welcome Email — Course Purchase</h1>
      </div>

      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">Template Editor</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Template
                <div className="flex items-center gap-2 text-sm font-normal">
                  <span>Enabled</span>
                  <Switch checked={tpl.enabled}
                    onCheckedChange={(v) => setTpl({ ...tpl, enabled: v })} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input value={tpl.subject} onChange={(e) => setTpl({ ...tpl, subject: e.target.value })} />
              </div>
              <div>
                <Label>Body</Label>
                <div className="flex flex-wrap gap-1.5 my-2">
                  {VARIABLES.map((v) => (
                    <Button
                      key={v.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setTpl({ ...tpl, body_html: tpl.body_html + ` ${v.key} ` })}
                      title={`Insert ${v.key}`}
                    >
                      + {v.label}
                    </Button>
                  ))}
                </div>
                <RichTextEditor
                  content={tpl.body_html}
                  onChange={(html) => setTpl({ ...tpl, body_html: html })}
                  placeholder="Compose the welcome email…"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Variables in <code>{"{{ }}"}</code> are auto-replaced when the email is sent. Edit the surrounding text freely; do not change the variable names.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Support Email</Label>
                  <Input value={tpl.support_email}
                    onChange={(e) => setTpl({ ...tpl, support_email: e.target.value })} />
                </div>
                <div>
                  <Label>Support Phone</Label>
                  <Input value={tpl.support_phone}
                    onChange={(e) => setTpl({ ...tpl, support_phone: e.target.value })} />
                </div>
                <div>
                  <Label>Dashboard Link</Label>
                  <Input value={tpl.dashboard_link}
                    onChange={(e) => setTpl({ ...tpl, dashboard_link: e.target.value })} />
                </div>
              </div>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Template"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Send Test Email</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="you@example.com" value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)} />
              <Button onClick={sendTest} disabled={sending}>
                <Send className="h-4 w-4 mr-2" />{sending ? "Sending…" : "Send Test"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Live Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded p-4 bg-white"
                dangerouslySetInnerHTML={{
                  __html: tpl.body_html
                    .replace(/\{\{name\}\}/g, "Rahul")
                    .replace(/\{\{email\}\}/g, "rahul@example.com")
                    .replace(/\{\{password\}\}/g, "TempPass123")
                    .replace(/\{\{course\}\}/g, "CAT Mock Bundle")
                    .replace(/\{\{amount\}\}/g, "999")
                    .replace(/\{\{dashboard_link\}\}/g, tpl.dashboard_link)
                    .replace(/\{\{support_email\}\}/g, tpl.support_email)
                    .replace(/\{\{support_phone\}\}/g, tpl.support_phone),
                }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Deliveries
                <Button variant="outline" size="sm" onClick={load}>
                  <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b">
                    <tr><th className="py-2">When</th><th>Recipient</th><th>Course</th><th>Amount</th><th>Status</th><th>Error</th></tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-b">
                        <td className="py-2">{new Date(l.created_at).toLocaleString()}</td>
                        <td>{l.recipient_email}<div className="text-xs text-muted-foreground">{l.recipient_name}</div></td>
                        <td>{l.course_name}</td>
                        <td>{l.amount ? `₹${l.amount}` : "-"}</td>
                        <td>
                          <Badge variant={l.status === "sent" ? "default" : "destructive"}>
                            {l.status}
                          </Badge>
                        </td>
                        <td className="text-xs text-destructive max-w-xs truncate" title={l.error_message || ""}>
                          {l.error_message}
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No emails sent yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
