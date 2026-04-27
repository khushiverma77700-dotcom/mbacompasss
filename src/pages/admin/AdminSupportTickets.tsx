import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LifeBuoy, Send, Copy, ArrowLeft, Phone, Mail, Filter, Upload, BarChart3, FileText, Plus, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import Papa from "papaparse";

const CATS = [
  { value: "mock_issue", label: "Mock Issue" },
  { value: "payment_issue", label: "Payment" },
  { value: "login_issue", label: "Login" },
  { value: "technical_issue", label: "Technical" },
  { value: "ai_tools", label: "AI Tools" },
  { value: "other", label: "Other" },
];
const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;
const STATUS_CLS: Record<string, string> = {
  open: "bg-rose-50 text-rose-700 border-rose-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-gray-100 text-gray-700 border-gray-200",
};
const PRIORITY_CLS: Record<string, string> = {
  low: "bg-sky-50 text-sky-700 border-sky-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
};
const PIE_COLORS = ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd", "#e0f2fe"];

export default function AdminSupportTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("tickets");
  const [tickets, setTickets] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Detail
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    setLoading(false);
    if (error) return toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setTickets(data ?? []);
  };

  const loadAdmins = async () => {
    const { data } = await supabase.from("admin_permissions").select("user_id, email, name").not("user_id", "is", null);
    setAdmins(data ?? []);
  };

  useEffect(() => { loadTickets(); loadAdmins(); }, []);

  const dateBounds = useMemo(() => {
    const now = new Date();
    if (range === "today") return { from: new Date(now.toDateString()), to: null };
    if (range === "7") return { from: subDays(now, 7), to: null };
    if (range === "15") return { from: subDays(now, 15), to: null };
    if (range === "30") return { from: subDays(now, 30), to: null };
    if (range === "custom" && (from || to)) return { from: from ? new Date(from) : null, to: to ? new Date(to + "T23:59:59") : null };
    return { from: null, to: null };
  }, [range, from, to]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const created = new Date(t.created_at);
      if (dateBounds.from && created < dateBounds.from) return false;
      if (dateBounds.to && created > dateBounds.to) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${t.code} ${t.title} ${t.student_name ?? ""} ${t.student_email ?? ""} ${t.student_phone ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [tickets, dateBounds, statusFilter, priorityFilter, categoryFilter, search]);

  const stats = useMemo(() => ({
    total: filtered.length,
    open: filtered.filter((t) => t.status === "open").length,
    inProgress: filtered.filter((t) => t.status === "in_progress").length,
    resolved: filtered.filter((t) => t.status === "resolved").length,
    high: filtered.filter((t) => t.priority === "high").length,
  }), [filtered]);

  const openTicket = async (t: any) => {
    setActive(t);
    const { data: msgs } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", t.id)
      .order("created_at", { ascending: true });
    setMessages(msgs ?? []);
    const { data: prev } = await supabase
      .from("support_tickets")
      .select("id, code, title, status, created_at")
      .eq("user_id", t.user_id)
      .neq("id", t.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory(prev ?? []);
  };

  const sendReply = async () => {
    if (!active || !reply.trim() || !user) return;
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: active.id,
      sender_user_id: user.id,
      sender_role: "admin",
      body: reply.trim().slice(0, 5000),
    });
    if (error) return toast({ title: "Reply failed", description: error.message, variant: "destructive" });
    await supabase
      .from("support_tickets")
      .update({
        last_admin_reply_at: new Date().toISOString(),
        status: active.status === "open" ? "in_progress" : active.status,
      })
      .eq("id", active.id);
    setReply("");
    openTicket(active);
    loadTickets();
  };

  const addInternalNote = async () => {
    if (!active || !internalNote.trim() || !user) return;
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: active.id,
      sender_user_id: user.id,
      sender_role: "admin",
      body: internalNote.trim().slice(0, 5000),
      is_internal: true,
    });
    if (error) return toast({ title: "Note failed", description: error.message, variant: "destructive" });
    setInternalNote("");
    openTicket(active);
  };

  const updateTicket = async (patch: any) => {
    if (!active) return;
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", active.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setActive({ ...active, ...patch });
    loadTickets();
  };

  // ============ Analytics data ============
  const overTime = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      map.set(d, 0);
    }
    filtered.forEach((t) => {
      const d = format(new Date(t.created_at), "MMM d");
      if (map.has(d)) map.set(d, (map.get(d) ?? 0) + 1);
    });
    return Array.from(map, ([date, count]) => ({ date, count }));
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + 1));
    return Array.from(map, ([name, value]) => ({
      name: CATS.find((c) => c.value === name)?.label ?? name,
      value,
    }));
  }, [filtered]);

  const resolvedVsPending = useMemo(() => ([
    { name: "Open", value: stats.open },
    { name: "In Progress", value: stats.inProgress },
    { name: "Resolved", value: stats.resolved },
  ]), [stats]);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Manage student support requests, internal notes and analytics.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-sky-50 border border-sky-100">
          <TabsTrigger value="tickets" className="data-[state=active]:bg-white">Tickets</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white"><BarChart3 className="h-4 w-4 mr-1.5" /> Analytics</TabsTrigger>
          <TabsTrigger value="faqs" className="data-[state=active]:bg-white"><FileText className="h-4 w-4 mr-1.5" /> FAQs</TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-white"><Upload className="h-4 w-4 mr-1.5" /> Import Students</TabsTrigger>
        </TabsList>

        {/* ==================== TICKETS ==================== */}
        <TabsContent value="tickets" className="mt-5 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: stats.total, cls: "from-sky-500 to-blue-600" },
              { label: "Pending", value: stats.open, cls: "from-rose-500 to-rose-600" },
              { label: "In Progress", value: stats.inProgress, cls: "from-amber-500 to-orange-500" },
              { label: "Resolved", value: stats.resolved, cls: "from-emerald-500 to-green-600" },
              { label: "High Priority", value: stats.high, cls: "from-pink-500 to-rose-600" },
            ].map((c) => (
              <Card key={c.label} className="p-4 border-sky-100">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className={cn("text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent mt-1", c.cls)}>
                  {c.value}
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="p-4 border-sky-100">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-sky-600" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Select value={range} onValueChange={setRange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="15">Last 15 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {range === "custom" && (
                <>
                  <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                  <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
                </>
              )}
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {CATS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">Search</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code, name, email…" />
              </div>
            </div>
          </Card>

          {/* Detail or table */}
          {!active ? (
            <Card className="border-sky-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-sky-50/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">Ticket</th>
                      <th className="text-left p-3">Student</th>
                      <th className="text-left p-3">Mobile</th>
                      <th className="text-left p-3">Category</th>
                      <th className="text-left p-3">Priority</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-left p-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <tr key={t.id} className="border-t hover:bg-sky-50/40 cursor-pointer" onClick={() => openTicket(t)}>
                        <td className="p-3">
                          <div className="font-medium">{t.title}</div>
                          <div className="text-[11px] text-muted-foreground">{t.code}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{t.student_name ?? "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{t.student_email}</div>
                        </td>
                        <td className="p-3">{t.student_phone ?? "—"}</td>
                        <td className="p-3 capitalize">{CATS.find((c) => c.value === t.category)?.label}</td>
                        <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", PRIORITY_CLS[t.priority])}>{t.priority}</Badge></td>
                        <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", STATUS_CLS[t.status])}>{t.status.replace("_", " ")}</Badge></td>
                        <td className="p-3 text-xs">{format(new Date(t.created_at), "PP")}</td>
                        <td className="p-3 text-xs">{format(new Date(t.updated_at), "PP")}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && !loading && (
                      <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No tickets match filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <TicketDetail
              ticket={active}
              messages={messages}
              history={history}
              admins={admins}
              reply={reply}
              setReply={setReply}
              internalNote={internalNote}
              setInternalNote={setInternalNote}
              onBack={() => { setActive(null); setMessages([]); }}
              onSend={sendReply}
              onAddNote={addInternalNote}
              onUpdate={updateTicket}
            />
          )}
        </TabsContent>

        {/* ==================== ANALYTICS ==================== */}
        <TabsContent value="analytics" className="mt-5">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-4 border-sky-100">
              <div className="font-medium mb-3">Tickets over time (last 14 days)</div>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={overTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#0284c7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4 border-sky-100">
              <div className="font-medium mb-3">Category distribution</div>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} label>
                      {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4 border-sky-100 lg:col-span-2">
              <div className="font-medium mb-3">Resolved vs Pending</div>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={resolvedVsPending}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4 border-sky-100 lg:col-span-2">
              <div className="font-medium mb-3">Top recurring issues</div>
              <div className="space-y-2">
                {byCategory.sort((a, b) => b.value - a.value).slice(0, 5).map((c) => (
                  <div key={c.name} className="flex items-center justify-between p-2 bg-sky-50/50 rounded">
                    <div className="text-sm font-medium">{c.name}</div>
                    <Badge className="bg-sky-100 text-sky-700">{c.value} tickets</Badge>
                  </div>
                ))}
                {byCategory.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No data.</div>}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== FAQs ==================== */}
        <TabsContent value="faqs" className="mt-5">
          <FaqAdmin />
        </TabsContent>

        {/* ==================== IMPORT ==================== */}
        <TabsContent value="import" className="mt-5">
          <ImportStudents />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ Detail panel ============
function TicketDetail({
  ticket, messages, history, admins, reply, setReply, internalNote, setInternalNote,
  onBack, onSend, onAddNote, onUpdate,
}: any) {
  const { toast } = useToast();
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast({ title: "Copied" }); };
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="p-0 lg:col-span-2 border-sky-100 overflow-hidden">
        <div className="p-4 bg-sky-50/40 border-b border-sky-100 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Button size="sm" variant="ghost" className="h-7 px-2 -ml-2" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <div className="font-semibold mt-1">{ticket.title}</div>
            <div className="text-[11px] text-muted-foreground">{ticket.code} · {format(new Date(ticket.created_at), "PPp")}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px]", PRIORITY_CLS[ticket.priority])}>{ticket.priority}</Badge>
            <Badge variant="outline" className={cn("text-[10px]", STATUS_CLS[ticket.status])}>{ticket.status.replace("_", " ")}</Badge>
          </div>
        </div>
        <div className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
          {messages.map((m: any) => (
            <div key={m.id} className={cn("rounded-lg p-3 text-sm border",
              m.is_internal ? "bg-amber-50 border-amber-200" :
              m.sender_role === "admin" ? "bg-sky-50 border-sky-100" : "bg-white border-gray-200"
            )}>
              <div className="text-[11px] text-muted-foreground mb-1">
                {m.is_internal ? "Internal note" : m.sender_role === "admin" ? "Admin" : "Student"} · {format(new Date(m.created_at), "PP p")}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
              {m.attachment_url && <a href={m.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-sky-700 underline mt-1 inline-block">{m.attachment_name ?? "Attachment"}</a>}
            </div>
          ))}
        </div>
        <div className="border-t border-sky-100 p-3 space-y-2">
          <div className="flex gap-2 items-end">
            <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to student…" className="resize-none" />
            <Button onClick={onSend} disabled={!reply.trim()} className="gap-1"><Send className="h-4 w-4" /> Reply</Button>
          </div>
          <div className="flex gap-2 items-end">
            <Textarea rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Internal note (only admins see this)…" className="resize-none bg-amber-50/40" />
            <Button onClick={onAddNote} disabled={!internalNote.trim()} variant="outline" className="gap-1">Add note</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-sky-100 space-y-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Student</div>
          <div className="text-sm font-medium">{ticket.student_name ?? "—"}</div>
          <a href={`mailto:${ticket.student_email}`} className="text-xs text-sky-700 flex items-center gap-1 mt-1"><Mail className="h-3 w-3" /> {ticket.student_email}</a>
          {ticket.student_phone && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> {ticket.student_phone}</span>
              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copy(ticket.student_phone)}><Copy className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={ticket.status} onValueChange={(v) => onUpdate({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Priority</Label>
          <Select value={ticket.priority} onValueChange={(v) => onUpdate({ priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Assign to</Label>
          <Select value={ticket.assigned_to ?? "none"} onValueChange={(v) => onUpdate({ assigned_to: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {admins.map((a: any) => <SelectItem key={a.user_id} value={a.user_id}>{a.name ?? a.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {ticket.attachment_url && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Attachment</div>
            <a href={ticket.attachment_url} target="_blank" rel="noreferrer">
              <img src={ticket.attachment_url} alt="" className="rounded border max-h-40" />
            </a>
          </div>
        )}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Previous tickets</div>
          {history.length === 0 ? (
            <div className="text-xs text-muted-foreground">None.</div>
          ) : (
            <div className="space-y-1">
              {history.map((h: any) => (
                <div key={h.id} className="text-xs flex items-center justify-between border-b py-1">
                  <span className="truncate">{h.title}</span>
                  <Badge variant="outline" className={cn("text-[9px] ml-1", STATUS_CLS[h.status])}>{h.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ============ FAQ admin ============
function FaqAdmin() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [cat, setCat] = useState("other");

  const load = async () => {
    const { data } = await supabase.from("support_faqs").select("*").order("display_order");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!q.trim() || !a.trim()) return;
    const { error } = await supabase.from("support_faqs").insert({ question: q.trim(), answer: a.trim(), category: cat as any });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setQ(""); setA(""); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete FAQ?")) return;
    await supabase.from("support_faqs").delete().eq("id", id);
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-4 border-sky-100">
        <div className="font-medium mb-3">Add FAQ</div>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Question</Label><Input value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div><Label className="text-xs">Answer</Label><Textarea rows={4} value={a} onChange={(e) => setA(e.target.value)} /></div>
          <Button onClick={add} className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </Card>
      <Card className="p-4 border-sky-100">
        <div className="font-medium mb-3">Published FAQs ({items.length})</div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {items.map((f) => (
            <div key={f.id} className="border rounded p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium">{f.question}</div>
                <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-3 w-3 text-rose-500" /></Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{f.answer}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ Import students ============
function ImportStudents() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<any[]>([]);

  const loadImported = async () => {
    const { data } = await supabase.from("imported_students").select("*").order("created_at", { ascending: false }).limit(200);
    setImported(data ?? []);
  };
  useEffect(() => { loadImported(); }, []);

  const onFile = (f: File | null) => {
    if (!f) return;
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cleaned = (res.data as any[]).map((r) => ({
          full_name: (r.name || r.Name || r.full_name || "").trim(),
          email: (r.email || r.Email || "").trim().toLowerCase(),
          mobile: String(r.mobile || r.Mobile || r.phone || r.Phone || "").trim(),
          course: (r.course || r.Course || "").trim(),
        })).filter((r) => r.full_name && r.email);
        setRows(cleaned);
      },
    });
  };

  const importNow = async () => {
    if (rows.length === 0) return;
    setBusy(true);
    const payload = rows.map((r) => ({ ...r, imported_by: user?.id ?? null }));
    const { error } = await supabase.from("imported_students").upsert(payload, { onConflict: "email", ignoreDuplicates: false });
    setBusy(false);
    if (error) return toast({ title: "Import failed", description: error.message, variant: "destructive" });
    toast({ title: `Imported ${rows.length} students` });
    setRows([]);
    loadImported();
  };

  return (
    <Card className="p-4 border-sky-100 space-y-4">
      <div>
        <div className="font-medium">Import Students (CSV)</div>
        <div className="text-xs text-muted-foreground mt-1">
          Required columns: <code>name</code>, <code>email</code>. Optional: <code>mobile</code>, <code>course</code>.
          Profiles will auto-link to a student account when they sign up with the same email.
        </div>
      </div>
      <Input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {rows.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">Preview ({rows.length} rows)</div>
          <div className="max-h-60 overflow-y-auto border rounded">
            <table className="w-full text-xs">
              <thead className="bg-sky-50/60"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Mobile</th><th className="text-left p-2">Course</th></tr></thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t"><td className="p-2">{r.full_name}</td><td className="p-2">{r.email}</td><td className="p-2">{r.mobile}</td><td className="p-2">{r.course}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={importNow} disabled={busy} className="mt-3 gap-1"><Upload className="h-4 w-4" /> {busy ? "Importing…" : "Import now"}</Button>
        </div>
      )}
      <div className="pt-3 border-t">
        <div className="text-sm font-medium mb-2">Recently imported ({imported.length})</div>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-sky-50/60 sticky top-0"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Mobile</th><th className="text-left p-2">Course</th><th className="text-left p-2">Linked</th></tr></thead>
            <tbody>
              {imported.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.full_name}</td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{r.mobile}</td>
                  <td className="p-2">{r.course}</td>
                  <td className="p-2">{r.matched_user_id ? <Badge className="bg-emerald-100 text-emerald-700">Yes</Badge> : <Badge variant="outline">Pending</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
