import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, KeyRound, ExternalLink, RefreshCw, Copy, Users as UsersIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UserRow = {
  user_id: string | null;
  display_name: string;
  email: string;
  phone: string | null;
  purchases: { label: string; kind: string; date: string; status?: string; amount?: number | null }[];
  purchase_count: number;
  first_enrolled_at: string | null;
  status: "active" | "blocked" | "guest" | "guest_paid";
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users-list", { body: {} });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed to load users", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    setRows((data as any)?.users ?? []);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      r.display_name?.toLowerCase().includes(t) ||
      r.email?.toLowerCase().includes(t) ||
      (r.phone ?? "").toLowerCase().includes(t) ||
      r.purchases.some((p) => p.label.toLowerCase().includes(t))
    );
  }, [rows, q]);

  const openReset = (u: UserRow) => {
    setResetTarget(u);
    setNewPassword("");
    setResetResult(null);
    setResetOpen(true);
  };

  const doReset = async () => {
    if (!resetTarget) return;
    if (newPassword && newPassword.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters, or leave blank to auto-generate.", variant: "destructive" });
      return;
    }
    setResetBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: {
        action: "reset_password",
        user_id: resetTarget.user_id,
        ...(newPassword ? { new_password: newPassword } : {}),
      },
    });
    setResetBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Reset failed", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    const pwd = (data as any)?.new_password ?? newPassword;
    setResetResult({ email: resetTarget.email, password: pwd });
    toast({ title: "Password updated" });
  };

  const openDashboardAs = async (u: UserRow) => {
    const confirmMsg = `Open ${u.display_name || u.email}'s dashboard?\n\nA magic sign-in link will be generated. Opening it will replace your current admin session in this browser — use an incognito window if you need to stay signed in as admin.`;
    if (!confirm(confirmMsg)) return;
    const redirect = `${window.location.origin}/student`;
    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: { action: "impersonate", user_id: u.user_id },
      // pass redirect as query
    });
    if (error || (data as any)?.error) {
      toast({ title: "Could not create sign-in link", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    let link: string | null = (data as any)?.action_link ?? null;
    if (!link) {
      toast({ title: "No link returned", variant: "destructive" });
      return;
    }
    // Force redirect to /student
    try {
      const u2 = new URL(link);
      u2.searchParams.set("redirect_to", redirect);
      link = u2.toString();
    } catch { /* ignore */ }
    try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
    toast({ title: "Sign-in link ready", description: "Link copied to clipboard. Opening in a new tab…" });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const copyLoginLink = async (u: UserRow) => {
    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: { action: "impersonate", user_id: u.user_id },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Failed", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    let link: string | null = (data as any)?.action_link ?? null;
    if (!link) return;
    try {
      const u2 = new URL(link);
      u2.searchParams.set("redirect_to", `${window.location.origin}/student`);
      link = u2.toString();
    } catch { /* ignore */ }
    try { await navigator.clipboard.writeText(link); toast({ title: "Login link copied", description: "Paste into an incognito window to view as this student." }); }
    catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UsersIcon className="h-6 w-6" /> Users</h1>
          <p className="text-sm text-muted-foreground">All enrolled users with their purchases, enrollment date and account status.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="gap-1">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, mobile or course…"
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Purchased Course</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading users…</TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No enrolled users found.</TableCell></TableRow>
              )}
              {filtered.map((u, idx) => (
                <TableRow key={u.user_id ?? `guest-${u.email}-${idx}`}>
                  <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{u.phone || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{u.email || "—"}</TableCell>
                  <TableCell className="max-w-[320px]">
                    <div className="flex flex-wrap gap-1">
                      {u.purchases.slice(0, 3).map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs" title={p.status ? `${p.status}${p.amount ? ` • ₹${p.amount}` : ""}` : undefined}>
                          {p.label}{p.status && p.status !== "enrolled" ? ` · ${p.status}` : ""}
                        </Badge>
                      ))}
                      {u.purchases.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{u.purchases.length - 3} more</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {u.first_enrolled_at ? new Date(u.first_enrolled_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    {u.status === "blocked" ? (
                      <Badge variant="destructive" className="text-xs">Blocked</Badge>
                    ) : u.status === "guest_paid" ? (
                      <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">Guest · Paid</Badge>
                    ) : u.status === "guest" ? (
                      <Badge variant="outline" className="text-xs">Guest</Badge>
                    ) : (
                      <Badge className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {u.user_id ? (
                        <>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => openDashboardAs(u)}>
                            <ExternalLink className="h-3.5 w-3.5" /> View Dashboard
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => copyLoginLink(u)} title="Copy sign-in link (for incognito)">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => openReset(u)}>
                            <KeyRound className="h-3.5 w-3.5" /> Reset
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No account yet</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {resetTarget?.email
                ? <>Set a new password for <span className="font-medium">{resetTarget.email}</span>. Leave blank to auto-generate a secure random password.</>
                : null}
            </DialogDescription>
          </DialogHeader>

          {resetResult ? (
            <div className="space-y-3">
              <div className="text-sm">Password updated successfully. Share these credentials with the user:</div>
              <Card className="p-3 bg-sky-50 border-sky-200 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{resetResult.email}</span></div>
                <div><span className="text-muted-foreground">New password:</span> <span className="font-mono font-semibold">{resetResult.password}</span></div>
              </Card>
              <Button
                variant="outline"
                className="gap-1"
                onClick={async () => {
                  const msg = `Email: ${resetResult.email}\nNew password: ${resetResult.password}\nLogin: ${window.location.origin}/auth`;
                  try { await navigator.clipboard.writeText(msg); toast({ title: "Copied" }); } catch { /* ignore */ }
                }}
              >
                <Copy className="h-4 w-4" /> Copy details
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>New password (optional)</Label>
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters if you set one manually.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            {resetResult ? (
              <Button onClick={() => setResetOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button onClick={doReset} disabled={resetBusy}>{resetBusy ? "Updating…" : "Reset password"}</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
