import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, UserPlus, X, Mail, Phone, KeyRound, Ban, ShieldCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type StudentRow = {
  user_id: string;
  display_name: string;
  email: string;
  phone: string | null;
  enrolled_count: number;
  banned_until: string | null;
};

export default function AdminStudentMocks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({ test_id: "", expires_at: "", admin_notes: "" });
  const [assignOpen, setAssignOpen] = useState(false);

  const search = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_search_students", { _query: q, _limit: 100 });
    setLoading(false);
    if (error) toast({ title: "Search failed", description: error.message, variant: "destructive" });
    setStudents(data ?? []);
  };

  useEffect(() => {
    search();
    supabase.from("mock_tests").select("id, name, slug, exam_code, is_published").eq("is_published", true).order("created_at", { ascending: false }).then(({ data }) => setTests(data ?? []));
  }, []);

  const openStudent = async (s: any) => {
    setSelected(s);
    const { data } = await supabase
      .from("mock_enrollments")
      .select("id, test_id, source, expires_at, enrolled_at, admin_notes, test:mock_tests(name, slug)")
      .eq("user_id", s.user_id)
      .order("enrolled_at", { ascending: false });
    setEnrollments(data ?? []);
  };

  const assign = async () => {
    if (!selected || !assignForm.test_id) return;
    const { error } = await supabase.from("mock_enrollments").insert({
      user_id: selected.user_id,
      test_id: assignForm.test_id,
      source: "admin",
      assigned_by: user?.id ?? null,
      expires_at: assignForm.expires_at || null,
      admin_notes: assignForm.admin_notes || null,
    });
    if (error) return toast({ title: "Assign failed", description: error.message, variant: "destructive" });
    toast({ title: "Mock assigned" });
    setAssignForm({ test_id: "", expires_at: "", admin_notes: "" });
    setAssignOpen(false);
    openStudent(selected);
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this enrollment?")) return;
    await supabase.from("mock_enrollments").delete().eq("id", id);
    toast({ title: "Revoked" });
    if (selected) openStudent(selected);
  };

  const isBlocked = (s: StudentRow | null) => {
    if (!s?.banned_until) return false;
    return new Date(s.banned_until).getTime() > Date.now();
  };

  const callAction = async (action: "reset_password" | "block" | "unblock" | "delete") => {
    if (!selected) return;
    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: { action, user_id: selected.user_id },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Action failed", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    return data as any;
  };

  const handleResetPassword = async () => {
    if (!selected) return;
    if (!confirm(`Reset password for ${selected.email}? A new random password will be generated.`)) return;
    const res = await callAction("reset_password");
    if (res?.new_password) {
      const msg = `Email: ${selected.email}\nNew password: ${res.new_password}\n\nLogin: ${window.location.origin}/auth`;
      try { await navigator.clipboard.writeText(msg); } catch { /* ignore */ }
      alert(`Password reset successfully.\n\n${msg}\n\n(Copied to clipboard)`);
      toast({ title: "Password reset", description: "New credentials copied to clipboard." });
    }
  };

  const handleBlock = async () => {
    if (!selected) return;
    if (!confirm(`Block ${selected.email}? They will be unable to sign in.`)) return;
    const res = await callAction("block");
    if (res?.ok) {
      toast({ title: "Account blocked" });
      setSelected({ ...selected, banned_until: new Date(Date.now() + 100 * 365 * 86400000).toISOString() });
      search();
    }
  };

  const handleUnblock = async () => {
    if (!selected) return;
    const res = await callAction("unblock");
    if (res?.ok) {
      toast({ title: "Account unblocked" });
      setSelected({ ...selected, banned_until: null });
      search();
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`PERMANENTLY DELETE ${selected.email}?\n\nThis removes the account and all associated data. This cannot be undone.`)) return;
    if (!confirm("Are you absolutely sure? Type OK in the next prompt is not required, but this is your last chance.")) return;
    const res = await callAction("delete");
    if (res?.ok) {
      toast({ title: "Account deleted" });
      setSelected(null);
      setEnrollments([]);
      search();
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Student Mock Assignments</h1>
        <p className="text-sm text-muted-foreground">Search students, assign mocks manually, set validity and notes.</p>
      </div>

      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search by name, email or phone…"
              className="pl-9"
            />
          </div>
          <Button onClick={search} disabled={loading}>{loading ? "…" : "Search"}</Button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 p-4">
          <h2 className="font-semibold mb-3">Students ({students.length})</h2>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {students.map((s) => (
              <button
                key={s.user_id}
                onClick={() => openStudent(s)}
                className={`w-full text-left p-3 rounded-lg border hover:border-sky-300 transition-colors ${
                  selected?.user_id === s.user_id ? "border-sky-400 bg-sky-50" : "border-transparent"
                }`}
              >
                <div className="font-medium text-sm truncate">{s.display_name}</div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {s.email}
                </div>
                {s.phone && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {s.phone}
                  </div>
                )}
                <Badge variant="secondary" className="mt-1 text-[10px]">{s.enrolled_count} mock(s)</Badge>
              </button>
            ))}
            {!loading && students.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">No students found.</div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2 p-4">
          {!selected ? (
            <div className="text-center text-muted-foreground py-12">Select a student to manage their mocks.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2 flex-wrap">
                    {selected.display_name}
                    {isBlocked(selected) && (
                      <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{selected.email}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1"><UserPlus className="h-4 w-4" /> Assign mock</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Assign a mock to {selected.display_name}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>Mock test</Label>
                          <Select value={assignForm.test_id} onValueChange={(v) => setAssignForm({ ...assignForm, test_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select a mock" /></SelectTrigger>
                            <SelectContent>
                              {tests.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name} {t.exam_code ? `(${t.exam_code})` : ""}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Expires on (optional)</Label>
                          <Input type="date" value={assignForm.expires_at} onChange={(e) => setAssignForm({ ...assignForm, expires_at: e.target.value })} />
                        </div>
                        <div>
                          <Label>Notes (optional)</Label>
                          <Textarea value={assignForm.admin_notes} onChange={(e) => setAssignForm({ ...assignForm, admin_notes: e.target.value })} placeholder="Why is this mock being assigned?" />
                        </div>
                        <Button onClick={assign} disabled={!assignForm.test_id} className="w-full">Assign</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Card className="p-3 mb-4 bg-sky-50/40 border-sky-100">
                <div className="text-xs font-medium text-muted-foreground mb-2">Account actions</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={handleResetPassword}>
                    <KeyRound className="h-4 w-4" /> Reset password
                  </Button>
                  {isBlocked(selected) ? (
                    <Button size="sm" variant="outline" className="gap-1 text-emerald-700" onClick={handleUnblock}>
                      <ShieldCheck className="h-4 w-4" /> Unblock account
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1 text-amber-700" onClick={handleBlock}>
                      <Ban className="h-4 w-4" /> Block account
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" className="gap-1" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" /> Delete account
                  </Button>
                </div>
              </Card>

              <h3 className="text-sm font-medium mb-2">Current enrollments ({enrollments.length})</h3>
              {enrollments.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No mocks assigned yet.</div>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((e) => (
                    <div key={e.id} className="border rounded-lg p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{e.test?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          Source: <span className="capitalize">{e.source}</span>
                          {e.expires_at && ` · expires ${new Date(e.expires_at).toLocaleDateString()}`}
                        </div>
                        {e.admin_notes && <div className="text-xs italic mt-1">"{e.admin_notes}"</div>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => revoke(e.id)}>
                        <X className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
