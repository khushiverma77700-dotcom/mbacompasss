import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LifeBuoy,
  Send,
  Paperclip,
  RotateCcw,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Plus,
  ArrowLeft,
  ImageIcon,
  Timer,
  Inbox,
  Activity,
  TrendingUp,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "mock_issue", label: "Mock Issue" },
  { value: "payment_issue", label: "Payment Issue" },
  { value: "login_issue", label: "Login Issue" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "ai_tools", label: "AI Tools" },
  { value: "other", label: "Other" },
] as const;

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  open: { label: "Pending", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertCircle },
  in_progress: { label: "In Progress", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  resolved: { label: "Resolved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  closed: { label: "Closed", cls: "bg-gray-100 text-gray-700 border-gray-200", icon: CheckCircle2 },
};

const PRIORITY_META: Record<string, string> = {
  low: "bg-sky-50 text-sky-700 border-sky-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
};

type Ticket = any;
type Message = any;

export default function StudentSupport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("create");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Create form
  const [form, setForm] = useState({
    category: "mock_issue",
    title: "",
    description: "",
    priority: "medium",
  });
  const [file, setFile] = useState<File | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast({ title: "Failed to load tickets", description: error.message, variant: "destructive" });
    setTickets(data ?? []);
  };

  const loadFaqs = async () => {
    const { data } = await supabase
      .from("support_faqs")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true });
    setFaqs(data ?? []);
  };

  useEffect(() => {
    loadTickets();
    loadFaqs();
  }, [user]);

  const openTicket = async (t: Ticket) => {
    setActiveTicket(t);
    const { data } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", t.id)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  };

  const onSelectFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (!f.type.startsWith("image/")) {
      toast({ title: "Only image files allowed", variant: "destructive" });
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast({ title: "Image too large", description: "Max 1 MB", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const uploadImage = async (ticketId: string): Promise<{ url: string; name: string } | null> => {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const safe = `${Date.now()}.${ext}`;
    const path = `${user.id}/${ticketId}/${safe}`;
    const { error } = await supabase.storage.from("ticket-attachments").upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data, error: signErr } = await supabase.storage
      .from("ticket-attachments")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !data?.signedUrl) {
      toast({ title: "Could not link attachment", description: signErr?.message, variant: "destructive" });
      return null;
    }
    return { url: data.signedUrl, name: file.name };
  };

  const submitTicket = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Title and description are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        category: form.category as any,
        title: form.title.trim().slice(0, 200),
        description: form.description.trim().slice(0, 5000),
        priority: form.priority as any,
        student_name: profile?.display_name ?? null,
        student_email: user.email ?? null,
        student_phone: profile?.phone ?? null,
      })
      .select()
      .single();

    if (error || !ticket) {
      setSubmitting(false);
      return toast({ title: "Could not create ticket", description: error?.message, variant: "destructive" });
    }

    let attachment: { url: string; name: string } | null = null;
    if (file) {
      attachment = await uploadImage(ticket.id);
      if (attachment) {
        await supabase
          .from("support_tickets")
          .update({ attachment_url: attachment.url, attachment_name: attachment.name })
          .eq("id", ticket.id);
      }
    }

    // Initial system message containing the description
    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_user_id: user.id,
      sender_role: "student",
      body: form.description.trim(),
      attachment_url: attachment?.url ?? null,
      attachment_name: attachment?.name ?? null,
    });

    setSubmitting(false);
    setCreatedTicket({ ...ticket, attachment_url: attachment?.url ?? null });
    setForm({ category: "mock_issue", title: "", description: "", priority: "medium" });
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    loadTickets();
  };

  const sendReply = async () => {
    if (!activeTicket || !user || !reply.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: activeTicket.id,
      sender_user_id: user.id,
      sender_role: "student",
      body: reply.trim().slice(0, 5000),
    });
    if (error) {
      setSubmitting(false);
      return toast({ title: "Reply failed", description: error.message, variant: "destructive" });
    }
    // Bump status back to open if resolved/closed (= reopen)
    if (activeTicket.status === "resolved" || activeTicket.status === "closed") {
      await supabase
        .from("support_tickets")
        .update({ status: "open", resolved_at: null, last_student_reply_at: new Date().toISOString() })
        .eq("id", activeTicket.id);
    } else {
      await supabase
        .from("support_tickets")
        .update({ last_student_reply_at: new Date().toISOString() })
        .eq("id", activeTicket.id);
    }
    setReply("");
    setSubmitting(false);
    openTicket(activeTicket);
    loadTickets();
  };

  const reopenTicket = async () => {
    if (!activeTicket) return;
    await supabase
      .from("support_tickets")
      .update({ status: "open", resolved_at: null })
      .eq("id", activeTicket.id);
    toast({ title: "Ticket reopened" });
    openTicket({ ...activeTicket, status: "open", resolved_at: null });
    loadTickets();
  };

  const filteredFaqs = useMemo(() => faqs, [faqs]);

  // ============ Dashboard stats ============
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "open").length;
    const inProgress = tickets.filter((t) => t.status === "in_progress").length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    const awaiting = tickets.filter(
      (t) => t.last_student_reply_at && (!t.last_admin_reply_at || new Date(t.last_admin_reply_at) < new Date(t.last_student_reply_at))
    ).length;

    // Average admin response time (first reply) in hours
    const replied = tickets.filter((t) => t.last_admin_reply_at && t.created_at);
    let avgMs = 0;
    if (replied.length) {
      const sum = replied.reduce(
        (acc, t) => acc + (new Date(t.last_admin_reply_at).getTime() - new Date(t.created_at).getTime()),
        0
      );
      avgMs = sum / replied.length;
    }
    const fmtDuration = (ms: number) => {
      if (!ms) return "—";
      const mins = Math.round(ms / 60000);
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      if (hrs < 24) return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
      const days = Math.floor(hrs / 24);
      const remH = hrs % 24;
      return remH ? `${days}d ${remH}h` : `${days}d`;
    };
    const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
    return { total, open, inProgress, resolved, awaiting, avgResponse: fmtDuration(avgMs), resolutionRate };
  }, [tickets]);

  // ============ UI ============
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shrink-0">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-sm text-muted-foreground">
            Raise a ticket and our team will get back to you. Browse FAQs for instant answers.
          </p>
        </div>
      </div>

      {/* Advanced stats dashboard */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-blue-50/60 p-5 shadow-sm">
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-white/80 border border-sky-100 grid place-items-center">
              <Activity className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <div className="text-sm font-semibold">Your Support Overview</div>
              <div className="text-[11px] text-muted-foreground">Live snapshot of your ticket activity</div>
            </div>
          </div>
          <Badge variant="outline" className="bg-white/70 border-sky-200 text-sky-700 gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" /> Live
          </Badge>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile icon={Inbox} label="Total Tickets" value={stats.total} tone="sky" />
          <StatTile icon={AlertCircle} label="Pending" value={stats.open} tone="rose" />
          <StatTile icon={Clock} label="In Progress" value={stats.inProgress} tone="amber" />
          <StatTile icon={CheckCircle2} label="Resolved" value={stats.resolved} tone="emerald" />
          <StatTile icon={Timer} label="Avg Response" value={stats.avgResponse} tone="blue" hint="Team first reply" />
          <StatTile icon={TrendingUp} label="Resolution Rate" value={`${stats.resolutionRate}%`} tone="indigo" />
        </div>

        {stats.awaiting > 0 && (
          <div className="relative mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>
              <strong>{stats.awaiting}</strong> ticket{stats.awaiting > 1 ? "s" : ""} awaiting a reply from our team.
            </span>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-sky-50 border border-sky-100">
          <TabsTrigger value="create" className="data-[state=active]:bg-white">
            <Plus className="h-4 w-4 mr-1.5" /> Create Ticket
          </TabsTrigger>
          <TabsTrigger value="my" className="data-[state=active]:bg-white">
            My Tickets {tickets.length > 0 && <Badge className="ml-2 bg-sky-100 text-sky-700">{tickets.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="faq" className="data-[state=active]:bg-white">
            <HelpCircle className="h-4 w-4 mr-1.5" /> FAQs
          </TabsTrigger>
        </TabsList>

        {/* ============ Create ============ */}
        <TabsContent value="create" className="mt-5">
          <Card className="p-6 border-sky-100">
            <h2 className="text-lg font-semibold mb-4">Tell us what went wrong</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Mock test won't load on submit"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={6}
                  value={form.description}
                  maxLength={5000}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Share as much detail as possible — what you tried, error messages, etc."
                />
              </div>
              <div className="md:col-span-2">
                <Label>Attach a screenshot (optional, image only, ≤ 1 MB)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
                  />
                  {file && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                      Clear
                    </Button>
                  )}
                </div>
                {file && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={submitTicket} disabled={submitting} className="gap-2">
                <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit ticket"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ============ My Tickets ============ */}
        <TabsContent value="my" className="mt-5">
          {!activeTicket ? (
            <Card className="p-4 border-sky-100">
              {loading ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
              ) : tickets.length === 0 ? (
                <div className="text-sm text-muted-foreground py-12 text-center">
                  You haven't raised any tickets yet.
                </div>
              ) : (
                <div className="divide-y">
                  {tickets.map((t) => {
                    const sm = STATUS_META[t.status] ?? STATUS_META.open;
                    const Icon = sm.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => openTicket(t)}
                        className="w-full text-left py-3 px-2 hover:bg-sky-50/60 rounded-md transition-colors flex items-start gap-3"
                      >
                        <div className="shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-sky-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{t.title}</span>
                            <span className="text-[11px] text-muted-foreground">{t.code}</span>
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={cn("text-[10px]", PRIORITY_META[t.priority])}>
                            {t.priority}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px]", sm.cls)}>{sm.label}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : (
            <TicketThread
              ticket={activeTicket}
              messages={messages}
              reply={reply}
              setReply={setReply}
              onSend={sendReply}
              onBack={() => { setActiveTicket(null); setMessages([]); }}
              onReopen={reopenTicket}
              submitting={submitting}
            />
          )}
        </TabsContent>

        {/* ============ FAQs ============ */}
        <TabsContent value="faq" className="mt-5">
          <Card className="p-4 border-sky-100">
            {filteredFaqs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">
                No FAQs yet. Please raise a ticket and we'll respond shortly.
              </div>
            ) : (
              <Accordion type="single" collapsible>
                {filteredFaqs.map((f) => (
                  <AccordionItem key={f.id} value={f.id}>
                    <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {f.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation popup */}
      <Dialog open={!!createdTicket} onOpenChange={(o) => { if (!o) setCreatedTicket(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Ticket created
            </DialogTitle>
            <DialogDescription>
              Our support team will review your request and respond shortly.
            </DialogDescription>
          </DialogHeader>
          {createdTicket && (
            <div className="rounded-lg border bg-sky-50/50 p-4">
              <div className="text-xs text-muted-foreground">Your ticket ID</div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-base font-semibold tracking-wide">{createdTicket.code}</code>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => {
                    navigator.clipboard.writeText(createdTicket.code);
                    toast({ title: "Copied" });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-3">
                Track replies in <strong>My Tickets</strong>.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatedTicket(null)}>Close</Button>
            <Button onClick={() => { setCreatedTicket(null); setTab("my"); loadTickets(); }}>
              View my tickets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====== Thread component ======
function TicketThread({
  ticket,
  messages,
  reply,
  setReply,
  onSend,
  onBack,
  onReopen,
  submitting,
}: {
  ticket: any;
  messages: any[];
  reply: string;
  setReply: (v: string) => void;
  onSend: () => void;
  onBack: () => void;
  onReopen: () => void;
  submitting: boolean;
}) {
  const sm = STATUS_META[ticket.status] ?? STATUS_META.open;
  return (
    <Card className="p-0 border-sky-100 overflow-hidden">
      <div className="p-4 border-b border-sky-100 bg-sky-50/40 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="ghost" onClick={onBack} className="h-7 px-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <span className="text-[11px] text-muted-foreground">{ticket.code}</span>
            <Badge variant="outline" className={cn("text-[10px]", sm.cls)}>{sm.label}</Badge>
            <Badge variant="outline" className={cn("text-[10px]", PRIORITY_META[ticket.priority])}>
              {ticket.priority}
            </Badge>
          </div>
          <div className="font-semibold mt-1">{ticket.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Opened {format(new Date(ticket.created_at), "PPp")}
          </div>
        </div>
        {(ticket.status === "resolved" || ticket.status === "closed") && (
          <Button size="sm" variant="outline" onClick={onReopen} className="gap-1">
            <RotateCcw className="h-4 w-4" /> Reopen
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3 max-h-[55vh] overflow-y-auto bg-white">
        {messages.map((m) => {
          const mine = m.sender_role === "student";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  mine
                    ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-br-sm"
                    : "bg-sky-50 text-gray-800 border border-sky-100 rounded-bl-sm"
                )}
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                {m.attachment_url && (
                  <a
                    href={m.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn("text-xs underline mt-1 inline-flex items-center gap-1", mine ? "text-white/90" : "text-sky-700")}
                  >
                    <Paperclip className="h-3 w-3" /> {m.attachment_name ?? "Attachment"}
                  </a>
                )}
                <div className={cn("text-[10px] mt-1", mine ? "text-white/80" : "text-muted-foreground")}>
                  {format(new Date(m.created_at), "PP p")} · {mine ? "You" : "Support"}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">No messages yet.</div>
        )}
      </div>

      <div className="p-3 border-t border-sky-100 bg-white">
        <div className="flex gap-2 items-end">
          <Textarea
            rows={2}
            value={reply}
            maxLength={5000}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply…"
            className="resize-none"
          />
          <Button onClick={onSend} disabled={submitting || !reply.trim()} className="gap-1">
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
