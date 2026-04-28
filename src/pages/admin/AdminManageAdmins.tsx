import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, ShieldCheck, Loader2, UserPlus, Lock, Unlock, ArrowLeft, Sparkles } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import { adminNavGroups, allAdminPaths, allAdminNavItems } from "./adminNav";

// Derived from the live sidebar config — adding a new admin page in adminNav.ts
// makes it available here automatically.
export const ADMIN_SECTIONS = allAdminNavItems.map((i) => ({ path: i.path, label: i.label }));

interface AdminRecord {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  allowed_sections: string[];
  is_full_access: boolean;
  created_at: string;
}

const AdminManageAdmins = () => {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSections, setFormSections] = useState<string[]>([]);
  const [formFullAccess, setFormFullAccess] = useState(true);
  const { toast } = useToast();
  const { sortedItems: sortedAdmins, sortConfig, handleSort } = useTableSort(admins);

  const totalSections = ADMIN_SECTIONS.length;
  const allCurrentPaths = useMemo(() => allAdminPaths, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_permissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAdmins((data as AdminRecord[]) || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAdmins(); }, []);

  const toggleSection = (path: string) => {
    setFormSections((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const toggleGroup = (groupItems: { path: string }[], allOn: boolean) => {
    const groupPaths = groupItems.map((i) => i.path);
    setFormSections((prev) =>
      allOn ? prev.filter((p) => !groupPaths.includes(p)) : Array.from(new Set([...prev, ...groupPaths]))
    );
  };

  const setFullAccess = (on: boolean) => {
    setFormFullAccess(on);
    if (on) setFormSections([...allCurrentPaths]);
  };

  const openCreate = () => {
    setEditId(null);
    setFormName("");
    setFormEmail("");
    setFormFullAccess(true);
    setFormSections([...allCurrentPaths]);
    setShowForm(true);
  };

  const openEdit = (admin: AdminRecord) => {
    setEditId(admin.id);
    setFormName(admin.display_name);
    setFormEmail(admin.email);
    const isFull = admin.is_full_access || admin.allowed_sections?.length === totalSections;
    setFormFullAccess(isFull);
    setFormSections(isFull ? [...allCurrentPaths] : (admin.allowed_sections || []));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast({ title: "Required", description: "Name and Email are required.", variant: "destructive" });
      return;
    }
    if (!formFullAccess && formSections.length === 0) {
      toast({ title: "Required", description: "Select at least one section to grant access.", variant: "destructive" });
      return;
    }
    // If "Full Access" toggle is on, persist EVERY current path so the admin instantly
    // gets access to any future page added to adminNav.ts (after a re-save).
    const sectionsToSave = formFullAccess ? [...allCurrentPaths] : formSections;

    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase
          .from("admin_permissions")
          .update({
            display_name: formName.trim(),
            email: formEmail.trim(),
            allowed_sections: sectionsToSave,
            is_full_access: formFullAccess,
          })
          .eq("id", editId);
        if (error) throw error;
        toast({ title: "Updated", description: `Permissions updated for ${formName}.` });
      } else {
        const { data: existing } = await supabase
          .from("admin_permissions")
          .select("id")
          .eq("email", formEmail.trim().toLowerCase())
          .maybeSingle();
        if (existing) {
          toast({ title: "Already Exists", description: "An admin with this email already exists.", variant: "destructive" });
          setSaving(false);
          return;
        }
        const { data: userId, error: rpcError } = await supabase.rpc("assign_admin_by_email", {
          _email: formEmail.trim().toLowerCase(),
        });
        if (rpcError) {
          if (rpcError.message?.includes("No user account found")) {
            toast({ title: "User Not Found", description: "No account exists with this email. The user must sign up first.", variant: "destructive" });
            setSaving(false);
            return;
          }
          throw rpcError;
        }
        const { error } = await supabase.from("admin_permissions").insert({
          user_id: userId,
          display_name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          allowed_sections: sectionsToSave,
          is_full_access: formFullAccess,
        });
        if (error) throw error;
        toast({
          title: "Admin Created",
          description: formFullAccess
            ? `${formName} now has full access to all ${totalSections} sections.`
            : `${formName} now has admin access with ${sectionsToSave.length} sections.`,
        });
      }
      setShowForm(false);
      fetchAdmins();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResyncAll = async () => {
    if (!confirm(`Re-sync every "Full Access" admin so they receive any newly added sections (${totalSections} total)?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_permissions")
        .update({ allowed_sections: allCurrentPaths })
        .eq("is_full_access", true);
      if (error) throw error;
      toast({ title: "Synced", description: `All Full-Access admins now have ${totalSections} sections.` });
      fetchAdmins();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: AdminRecord) => {
    if (!confirm(`Remove admin access for ${admin.display_name}?`)) return;
    try {
      const { error } = await supabase.from("admin_permissions").delete().eq("id", admin.id);
      if (error) throw error;
      toast({ title: "Removed", description: `Admin access removed for ${admin.display_name}.` });
      fetchAdmins();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Manage Admins
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Edit Admin Permissions" : "Add New Admin"}</CardTitle>
            <CardDescription>Full Access automatically includes any new section added later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name *</Label>
              <Input id="admin-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Admin name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email *</Label>
              <Input id="admin-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="admin@example.com" disabled={!!editId} />
              {!editId && <p className="text-xs text-muted-foreground">The user must have an account and admin role assigned.</p>}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 bg-emerald-50/50 dark:bg-emerald-900/10">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-emerald-600" /> Full Access
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Grants every section now and any added in the future (re-save or use "Sync Full-Access Admins").
                </p>
              </div>
              <Switch checked={formFullAccess} onCheckedChange={setFullAccess} />
            </div>

            {!formFullAccess && (
              <div className="space-y-3">
                <Label>Section Access *</Label>
                <div className="space-y-3 max-h-[480px] overflow-y-auto border rounded-lg p-3">
                  {adminNavGroups.map((group) => {
                    const groupPaths = group.items.map((i) => i.path);
                    const groupSelected = groupPaths.filter((p) => formSections.includes(p)).length;
                    const allOn = groupSelected === group.items.length;
                    return (
                      <div key={group.label} className="border-b last:border-b-0 pb-2 last:pb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {group.label} <span className="ml-1 text-[10px] text-muted-foreground/70">({groupSelected}/{group.items.length})</span>
                          </span>
                          <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => toggleGroup(group.items, allOn)}>
                            {allOn ? "Clear" : "All"}
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {group.items.map((it) => (
                            <label
                              key={it.path}
                              className={`flex items-center gap-2 text-sm p-2 rounded-md cursor-pointer transition-colors ${
                                formSections.includes(it.path) ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <Checkbox checked={formSections.includes(it.path)} onCheckedChange={() => toggleSection(it.path)} />
                              {it.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Selected: {formSections.length}/{totalSections} sections</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editId ? "Update Permissions" : "Create Admin"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Manage Admins
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create admins and control which of the {totalSections} sections they can access.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResyncAll} disabled={saving}>
            <Sparkles className="w-4 h-4 mr-2" /> Sync Full-Access Admins
          </Button>
          <Button onClick={openCreate}><UserPlus className="w-4 h-4 mr-2" /> Add Admin</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admin Users</CardTitle>
          <CardDescription>
            Admins without a permissions record here get full access (super admin). Add a record to restrict sections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No admin permission records yet. All admins currently have full access.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label="Name" sortKey="display_name" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHead label="Email" sortKey="email" sortConfig={sortConfig} onSort={handleSort} />
                  <TableHead>Sections Access</TableHead>
                  <SortableTableHead label="Created" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAdmins.map((admin) => {
                  const isFull = admin.is_full_access || admin.allowed_sections?.length === totalSections;
                  const stale = admin.is_full_access && admin.allowed_sections?.length < totalSections;
                  return (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.display_name}</TableCell>
                      <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[340px]">
                          {isFull ? (
                            <>
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <Unlock className="w-3 h-3 mr-1" /> Full Access
                              </Badge>
                              {stale && (
                                <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">
                                  Needs sync ({admin.allowed_sections.length}/{totalSections})
                                </Badge>
                              )}
                            </>
                          ) : (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                {admin.allowed_sections.length}/{totalSections} sections
                              </Badge>
                              {admin.allowed_sections.slice(0, 3).map((path) => {
                                const section = ADMIN_SECTIONS.find((s) => s.path === path);
                                return section ? (
                                  <Badge key={path} variant="outline" className="text-[10px]">{section.label}</Badge>
                                ) : null;
                              })}
                              {admin.allowed_sections.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">+{admin.allowed_sections.length - 3} more</Badge>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(admin)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(admin)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManageAdmins;
