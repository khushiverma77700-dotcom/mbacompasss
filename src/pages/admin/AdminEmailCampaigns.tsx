import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Users, Mail, ExternalLink, AlertTriangle } from "lucide-react";
import {
  getEmailAudienceCounts,
  listEmailCampaigns,
  sendEmailCampaign,
} from "@/lib/adminEmail.functions";

type Audience = "all" | "enrolled" | "selected";

export default function AdminEmailCampaigns() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [selectedEmails, setSelectedEmails] = useState("");
  const [counts, setCounts] = useState<{ all: number; enrolled: number }>({ all: 0, enrolled: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  const fetchCounts = useServerFn(getEmailAudienceCounts);
  const fetchCampaigns = useServerFn(listEmailCampaigns);
  const sendCampaign = useServerFn(sendEmailCampaign);

  const load = async () => {
    try {
      const [c, list] = await Promise.all([fetchCounts({}), fetchCampaigns({})]);
      setCounts(c as any);
      setCampaigns(list as any[]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load email data");
    }
  };
  useEffect(() => { load(); }, []);

  const recipientEstimate =
    audience === "all" ? counts.all : audience === "enrolled" ? counts.enrolled
    : selectedEmails.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.includes("@")).length;

  const send = async () => {
    if (!subject.trim()) return toast.error("Subject is required");
    if (!body.trim()) return toast.error("Message body is required");
    if (audience === "selected" && !recipientEstimate) return toast.error("Add at least one valid email address");
    if (!confirm(`Send this email to about ${recipientEstimate} recipient(s)?`)) return;
    setSending(true);
    try {
      const res: any = await sendCampaign({
        data: {
          subject: subject.trim(),
          body: body.trim(),
          ctaUrl: ctaUrl.trim() || undefined,
          ctaLabel: ctaLabel.trim() || undefined,
          audience,
          selectedEmails: audience === "selected"
            ? selectedEmails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean)
            : undefined,
        },
      });
      toast.success(`Queued for ${res.queued} recipient(s)${res.failed ? `, ${res.failed} failed` : ""}`);
      setSubject(""); setBody(""); setCtaUrl(""); setCtaLabel(""); setSelectedEmails("");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Write and send emails to your users directly from here — with an optional button.
        </p>
      </div>

      <Card className="p-4 border-amber-200 bg-amber-50 flex gap-3 items-start">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          Emails are queued immediately but will only be delivered once your sender domain
          (notify.mail.mbacompass.in) is verified. Until then they stay in the queue.
        </p>
      </Card>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="p-6 border-sky-100">
          <div className="grid gap-4">
            <div>
              <Label>Subject *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="New CAT mock series is live!" />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="Write your message. Blank lines create new paragraphs." />
            </div>
            <div className="rounded-lg border border-dashed p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="h-4 w-4 text-sky-600" />
                <div className="text-sm font-medium">Optional button</div>
                <span className="text-xs text-muted-foreground">— shows only if URL is set</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://mbacompass.in/mocks" />
                <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Button label (e.g. Explore Mocks)" />
              </div>
            </div>

            <div>
              <Label>Send to</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                <Button variant={audience === "all" ? "default" : "outline"} size="sm" onClick={() => setAudience("all")}>
                  All users ({counts.all})
                </Button>
                <Button variant={audience === "enrolled" ? "default" : "outline"} size="sm" onClick={() => setAudience("enrolled")}>
                  Enrolled students ({counts.enrolled})
                </Button>
                <Button variant={audience === "selected" ? "default" : "outline"} size="sm" onClick={() => setAudience("selected")}>
                  Selected emails
                </Button>
              </div>
            </div>
            {audience === "selected" && (
              <div>
                <Label>Email addresses</Label>
                <Textarea value={selectedEmails} onChange={(e) => setSelectedEmails(e.target.value)} rows={3} placeholder="One per line, or separated by commas" />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={send} disabled={sending} className="bg-sky-600 hover:bg-sky-700">
                <Send className="h-4 w-4 mr-1" /> {sending ? "Sending…" : `Send to ~${recipientEstimate} recipient(s)`}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-sky-100 h-fit sticky top-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Live preview</div>
          <div className="rounded-xl border ring-1 ring-sky-200/60 overflow-hidden">
            <div className="p-4 bg-gradient-to-br from-sky-50 to-white">
              <div className="font-semibold">{subject || "Email subject"}</div>
              {body && <div className="text-sm text-muted-foreground mt-2 whitespace-pre-line line-clamp-6">{body}</div>}
              {ctaUrl && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                    {ctaLabel || "View details"} <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              )}
              <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">Team MBA Compass</div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Mail className="h-4 w-4" /> Recent campaigns</h2>
        <div className="space-y-2">
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>}
          {campaigns.map((c) => (
            <Card key={c.id} className="p-3 border-sky-100 text-sm">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.subject}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{c.recipient_count} recipient(s)</span>
                    <span>· {c.audience}</span>
                    <span className="uppercase font-semibold">· {c.status}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{new Date(c.created_at).toLocaleString()}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
