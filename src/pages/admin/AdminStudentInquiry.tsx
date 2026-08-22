import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import { useToast } from "@/hooks/use-toast";
import { format, isToday } from "date-fns";
import * as XLSX from "xlsx";
import {
  Download, Users, CalendarCheck, PhoneCall, PhoneOff, Star, StickyNote, Eye, Trash2, FileSpreadsheet,
} from "lucide-react";


export const LEAD_STAGES = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "call_back", label: "Call Back" },
  { value: "call_not_connected", label: "Call Not Connected" },
  { value: "potential_lead", label: "Potential Lead" },
  { value: "counselling_done", label: "Counselling Done" },
  { value: "converted", label: "Converted" },
  { value: "not_interested", label: "Not Interested" },
  { value: "junk", label: "Junk / Invalid" },
];

const stageLabel = (value: string) =>
  LEAD_STAGES.find((s) => s.value === value)?.label || value;

const CONTACTED_STAGES = [
  "contacted", "call_back", "potential_lead", "counselling_done", "converted", "not_interested",
];

type Note = {
  id: string;
  request_id: string;
  note: string;
  stage_at_note: string | null;
  created_by_email: string | null;
  created_at: string;
};

const AdminStudentInquiry = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [contactState, setContactState] = useState("all");
  const [topic, setTopic] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [specialisation, setSpecialisation] = useState("all");
  const [gradYear, setGradYear] = useState("all");
  const [notesFilter, setNotesFilter] = useState("all");
  const [todayOnly, setTodayOnly] = useState(false);


  const [detail, setDetail] = useState<any | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: leads }, { data: noteRows }] = await Promise.all([
      (supabase.from("guidance_requests" as any) as any)
        .select("*").order("created_at", { ascending: false }),
      (supabase.from("guidance_request_notes" as any) as any)
        .select("*").order("created_at", { ascending: false }),
    ]);
    setRows(leads || []);
    setNotes((noteRows || []) as Note[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const notesByRequest = useMemo(() => {
    const map: Record<string, Note[]> = {};
    notes.forEach((n) => {
      map[n.request_id] = map[n.request_id] || [];
      map[n.request_id].push(n);
    });
    return map;
  }, [notes]);

  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => (r.help_topics || []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [rows]);

  const specOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.specialisation) set.add(String(r.specialisation)); });
    return Array.from(set).sort();
  }, [rows]);

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.graduation_year) set.add(String(r.graduation_year)); });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const haystack = [
          r.name, r.email, r.phone, r.query, r.exam, r.specialisation,
          (r.help_topics || []).join(" "),
          (notesByRequest[r.id] || []).map((n) => n.note).join(" "),
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (stage !== "all" && (r.lead_stage || "not_contacted") !== stage) return false;
      if (contactState !== "all") {
        const contacted = CONTACTED_STAGES.includes(r.lead_stage || "not_contacted");
        if (contactState === "contacted" && !contacted) return false;
        if (contactState === "not_contacted" && contacted) return false;
        if (contactState === "potential" && (r.lead_stage || "") !== "potential_lead") return false;
      }
      if (topic !== "all" && !(r.help_topics || []).includes(topic)) return false;
      if (specialisation !== "all" && String(r.specialisation || "") !== specialisation) return false;
      if (gradYear !== "all" && String(r.graduation_year || "") !== gradYear) return false;
      if (notesFilter === "with" && !(notesByRequest[r.id]?.length)) return false;
      if (notesFilter === "without" && (notesByRequest[r.id]?.length || 0) > 0) return false;
      const created = new Date(r.created_at);
      if (todayOnly && !isToday(created)) return false;
      if (dateFrom && created < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && created > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [rows, search, stage, contactState, topic, specialisation, gradYear, notesFilter, todayOnly, dateFrom, dateTo, notesByRequest]);

  const { sortedItems, sortConfig, handleSort } = useTableSort(filtered);

  const stats = useMemo(() => {
    const contacted = rows.filter((r) => CONTACTED_STAGES.includes(r.lead_stage || "not_contacted")).length;
    return {
      total: rows.length,
      today: rows.filter((r) => isToday(new Date(r.created_at))).length,
      contacted,
      notContacted: rows.length - contacted,
      potential: rows.filter((r) => r.lead_stage === "potential_lead").length,
      inRange: filtered.length,
    };
  }, [rows, filtered]);

  /** Stage-wise counts across the currently filtered set (with all-time reference). */
  const stageCounts = useMemo(() => {
    return LEAD_STAGES.map((s) => ({
      ...s,
      filtered: filtered.filter((r) => (r.lead_stage || "not_contacted") === s.value).length,
      total: rows.filter((r) => (r.lead_stage || "not_contacted") === s.value).length,
    }));
  }, [filtered, rows]);


  const updateStage = async (id: string, value: string) => {
    const contacted = CONTACTED_STAGES.includes(value);
    const patch: Record<string, any> = { lead_stage: value };
    if (contacted) patch.last_contacted_at = new Date().toISOString();
    const { error } = await (supabase.from("guidance_requests" as any) as any)
      .update(patch).eq("id", id);
    if (error) {
      toast({ title: "Could not update stage", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addNote = async () => {
    if (!detail || !noteDraft.trim()) return;
    setSavingNote(true);
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await (supabase.from("guidance_request_notes" as any) as any)
      .insert({
        request_id: detail.id,
        note: noteDraft.trim(),
        stage_at_note: detail.lead_stage || "not_contacted",
        created_by: session.session?.user?.id ?? null,
        created_by_email: session.session?.user?.email ?? null,
      })
      .select()
      .single();
    setSavingNote(false);
    if (error) {
      toast({ title: "Could not save note", description: error.message, variant: "destructive" });
      return;
    }
    setNotes((prev) => [data as Note, ...prev]);
    setNoteDraft("");
  };

  const deleteNote = async (id: string) => {
    const { error } = await (supabase.from("guidance_request_notes" as any) as any)
      .delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete note", description: error.message, variant: "destructive" });
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const exportCsv = () => {
    const headers = [
      "Name", "Email", "Phone", "Graduation Year", "Exam", "Score", "Work Experience",
      "Specialisation", "Help Topics", "Query", "Lead Stage", "Last Contacted",
      "Notes Count", "Latest Note", "Created At",
    ];
    const rowsOut = sortedItems.map((r) => {
      const rowNotes = notesByRequest[r.id] || [];
      return [
        r.name, r.email, r.phone, r.graduation_year || "", r.exam || "", r.score || "",
        r.work_experience || "", r.specialisation || "", (r.help_topics || []).join("; "),
        r.query || "", stageLabel(r.lead_stage || "not_contacted"),
        r.last_contacted_at ? format(new Date(r.last_contacted_at), "yyyy-MM-dd HH:mm") : "",
        rowNotes.length, rowNotes[0]?.note || "",
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
      ];
    });
    const csv = [headers, ...rowsOut]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-inquiries-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch(""); setStage("all"); setContactState("all"); setTopic("all");
    setDateFrom(""); setDateTo(""); setNotesFilter("all"); setTodayOnly(false);
  };

  const statCards = [
    { label: "Total Inquiries", value: stats.total, icon: Users, onClick: clearFilters },
    { label: "Today's Inquiries", value: stats.today, icon: CalendarCheck, onClick: () => { clearFilters(); setTodayOnly(true); } },
    { label: "Contacted", value: stats.contacted, icon: PhoneCall, onClick: () => { clearFilters(); setContactState("contacted"); } },
    { label: "Not Contacted", value: stats.notContacted, icon: PhoneOff, onClick: () => { clearFilters(); setContactState("not_contacted"); } },
    { label: "Potential Leads", value: stats.potential, icon: Star, onClick: () => { clearFilters(); setStage("potential_lead"); } },
  ];

  const detailNotes = detail ? notesByRequest[detail.id] || [] : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Student Inquiry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All student leads from the Free MBA Guidance page, with stages and follow-up notes.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={sortedItems.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {statCards.map((card) => (
          <button key={card.label} onClick={card.onClick} className="text-left">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                  <card.icon className="w-3.5 h-3.5" /> {card.label}
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label className="text-xs">Search</Label>
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone, query, topic or note…" className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Lead Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {LEAD_STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Contact Status</Label>
            <Select value={contactState} onValueChange={setContactState}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="not_contacted">Not Contacted</SelectItem>
                <SelectItem value="potential">Potential Leads</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Help Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topicOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Select value={notesFilter} onValueChange={setNotesFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="with">With Notes</SelectItem>
                <SelectItem value="without">Without Notes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setTodayOnly(false); }} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setTodayOnly(false); }} className="mt-1" />
          </div>
          <div className="flex items-end gap-2">
            <Button variant={todayOnly ? "default" : "outline"} onClick={() => setTodayOnly((v) => !v)}>
              Today
            </Button>
            <Button variant="ghost" onClick={clearFilters}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mb-2">
        Showing {sortedItems.length} of {rows.length} inquiries
      </p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <SortableTableHead label="Name" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Phone" sortKey="phone" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Email" sortKey="email" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Exam" sortKey="exam" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead>Help Topics</TableHead>
                <SortableTableHead label="Received" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead className="min-w-[190px]">Lead Stage</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Loading inquiries…
                  </TableCell>
                </TableRow>
              )}
              {!loading && sortedItems.map((r, idx) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.phone}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.email}</TableCell>
                  <TableCell>{r.exam || "—"}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {(r.help_topics || []).slice(0, 2).map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px] font-normal">{t}</Badge>
                      ))}
                      {(r.help_topics || []).length > 2 && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          +{(r.help_topics || []).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(r.created_at), "dd MMM yyyy")}
                    <br /><span className="text-[10px]">{format(new Date(r.created_at), "hh:mm a")}</span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.lead_stage || "not_contacted"}
                      onValueChange={(v) => updateStage(r.id, v)}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => { setDetail(r); setNoteDraft(""); }}
                    >
                      <StickyNote className="w-3.5 h-3.5 mr-1" />
                      {(notesByRequest[r.id] || []).length}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { setDetail(r); setNoteDraft(""); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && sortedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {rows.length === 0 ? "No student inquiries yet" : "No inquiries match the current filters"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.name} — Inquiry Details</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  ["Email", detail.email],
                  ["Phone", detail.phone],
                  ["Graduation Year", detail.graduation_year],
                  ["Entrance Exam", detail.exam],
                  ["Score / Percentile", detail.score],
                  ["Work Experience", detail.work_experience],
                  ["Specialisation", detail.specialisation],
                  ["Source", detail.source],
                  ["Received", format(new Date(detail.created_at), "dd MMM yyyy, hh:mm a")],
                  ["Last Contacted", detail.last_contacted_at
                    ? format(new Date(detail.last_contacted_at), "dd MMM yyyy, hh:mm a") : null],
                  ["Lead Stage", stageLabel(detail.lead_stage || "not_contacted")],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-border p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-foreground mt-0.5 break-words">{value || "—"}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Help Topics</p>
                <div className="flex flex-wrap gap-1.5">
                  {(detail.help_topics || []).length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                  {(detail.help_topics || []).map((t: string) => (
                    <Badge key={t} variant="secondary" className="text-[11px]">{t}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Additional Query</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{detail.query || "—"}</p>
              </div>

              <div>
                <Label className="text-xs">Update Lead Stage</Label>
                <Select
                  value={detail.lead_stage || "not_contacted"}
                  onValueChange={async (v) => {
                    await updateStage(detail.id, v);
                    setDetail((prev: any) => (prev ? { ...prev, lead_stage: v } : prev));
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Notes ({detailNotes.length})
                </p>
                <Textarea
                  rows={3} value={noteDraft} maxLength={2000}
                  placeholder="Add a follow-up note — call outcome, next step, student expectations…"
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
                <Button className="mt-2" size="sm" onClick={addNote} disabled={savingNote || !noteDraft.trim()}>
                  {savingNote ? "Saving…" : "Add Note"}
                </Button>

                <div className="space-y-2 mt-4">
                  {detailNotes.length === 0 && (
                    <p className="text-sm text-muted-foreground">No notes yet for this lead.</p>
                  )}
                  {detailNotes.map((n) => (
                    <div key={n.id} className="rounded-lg border border-border bg-muted/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{n.note}</p>
                        <Button size="icon" variant="ghost" onClick={() => deleteNote(n.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {format(new Date(n.created_at), "dd MMM yyyy, hh:mm a")}
                        {n.created_by_email ? ` · ${n.created_by_email}` : ""}
                        {n.stage_at_note ? ` · ${stageLabel(n.stage_at_note)}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudentInquiry;
