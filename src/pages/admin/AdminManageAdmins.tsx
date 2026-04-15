import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ShieldCheck, Loader2, UserPlus, Lock, Unlock, ArrowLeft } from "lucide-react";

export const ADMIN_SECTIONS = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/site-settings", label: "Site Settings" },
  { path: "/admin/institutes", label: "Institutes" },
  { path: "/admin/courses", label: "Courses" },
  { path: "/admin/colleges", label: "Colleges" },
  { path: "/admin/exams", label: "Exams" },
  { path: "/admin/categories", label: "Categories" },
  { path: "/admin/banners", label: "Banners" },
  { path: "/admin/articles", label: "Articles" },
  { path: "/admin/testimonials", label: "Testimonials" },
  { path: "/admin/inquiries", label: "Inquiries" },
  { path: "/admin/subscribers", label: "Subscribers" },
  { path: "/admin/coupons", label: "Coupons" },
  { path: "/admin/coaching-of-week", label: "Coaching of Week" },
  { path: "/admin/coaching-results", label: "Coaching Results" },
  { path: "/admin/comparisons", label: "Comparisons" },
  { path: "/admin/college-sections", label: "College Sections" },
  { path: "/admin/institute-results", label: "Institute Results" },
  { path: "/admin/sitemap", label: "Sitemap" },
  { path: "/admin/leads", label: "Student Leads" },
  { path: "/admin/city-pages", label: "City/State Pages" },
  { path: "/admin/all-links", label: "All Site Links" },
  { path: "/admin/clear-cache", label: "Clear Caches" },
  { path: "/admin/seo-dashboard", label: "AI SEO Dashboard" },
  { path: "/admin/profile-analyzer", label: "Profile Analyzer" },
  { path: "/admin/manage-admins", label: "Manage Admins" },
];

interface AdminRecord { id: string; user_id: string; display_name: string; email: string; allowed_sections: string[]; created_at: string; }

const AdminManageAdmins = () => {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSections, setFormSections] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("admin_permissions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setAdmins((data as AdminRecord[]) || []);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const allSelected = formSections.length === ADMIN_SECTIONS.length;
  const toggleSection = (path: string) => { setFormSections(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]); };
  const toggleAll = () => { setFormSections(allSelected ? [] : ADMIN_SECTIONS.map(s => s.path)); };

  const openCreate = () => { setEditId(null); setFormName(""); setFormEmail(""); setFormSections(ADMIN_SECTIONS.map(s => s.path)); setShowForm(true); };
  const openEdit = (admin: AdminRecord) => { setEditId(admin.id); setFormName(admin.display_name); setFormEmail(admin.email); setFormSections(admin.allowed_sections || []); setShowForm(true); };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) { toast({ title: "Required", description: "Name and Email are required.", variant: "destructive" }); return; }
    if (formSections.length === 0) { toast({ title: "Required", description: "Select at least one section to grant access.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase.from("admin_permissions").update({ display_name: formName.trim(), email: formEmail.trim(), allowed_sections: formSections }).eq("id", editId);
        if (error) throw error;
        toast({ title: "Updated", description: `Permissions updated for ${formName}.` });
      } else {
        const { data: existing } = await supabase.from("admin_permissions").select("id").eq("email", formEmail.trim().toLowerCase()).maybeSingle();
        if (existing) { toast({ title: "Already Exists", description: "An admin with this email already exists.", variant: "destructive" }); setSaving(false); return; }
        const { data: userId, error: rpcError } = await supabase.rpc("assign_admin_by_email", { _email: formEmail.trim().toLowerCase() });
        if (rpcError) { if (rpcError.message?.includes("No user account found")) { toast({ title: "User Not Found", description: "No account exists with this email. The user must sign up first.", variant: "destructive" }); setSaving(false); return; } throw rpcError; }
        const { error } = await supabase.from("admin_permissions").insert({ user_id: userId, display_name: formName.trim(), email: formEmail.trim().toLowerCase(), allowed_sections: formSections });
        if (error) throw error;
        toast({ title: "Admin Created", description: `${formName} now has admin access with ${formSections.length} sections.` });
      }
      setShowForm(false); fetchAdmins();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  const handleDelete = async (admin: AdminRecord) => {
    if (!confirm(`Remove admin access for ${admin.display_name}?`)) return;
    try {
      const { error } = await supabase.from("admin_permissions").delete().eq("id", admin.id);
      if (error) throw error;
      toast({ title: "Removed", description: `Admin access removed for ${admin.display_name}.` });
      fetchAdmins();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Manage Admins
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit Admin Permissions" : "Add New Admin"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name *</Label>
              <Input id="admin-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Admin name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email *</Label>
              <Input id="admin-email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="admin@example.com" disabled={!!editId} />
              {!editId && <p className="text-xs text-muted-foreground">The user must have an account and admin role assigned.</p>}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Section Access *</Label>
                <Button size="sm" variant="outline" onClick={toggleAll} type="button">
                  {allSelected ? <><Lock className="w-3 h-3 mr-1" /> Deselect All</> : <><Unlock className="w-3 h-3 mr-1" /> Select All</>}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto border rounded-lg p-3">
                {ADMIN_SECTIONS.map(section => (
                  <label key={section.path} className={`flex items-center gap-2 text-sm p-2 rounded-md cursor-pointer transition-colors ${formSections.includes(section.path) ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                    <Checkbox checked={formSections.includes(section.path)} onCheckedChange={() => toggleSection(section.path)} />
                    {section.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Selected: {formSections.length}/{ADMIN_SECTIONS.length} sections</p>
            </div>
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
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Manage Admins</h1>
          <p className="text-sm text-muted-foreground mt-1">Create admins and control which sections they can access.</p>
        </div>
        <Button onClick={openCreate}><UserPlus className="w-4 h-4 mr-2" /> Add Admin</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Admin Users</CardTitle><CardDescription>Admins without a permissions record here get full access (super admin). Add a record to restrict sections.</CardDescription></CardHeader>
        <CardContent>
          {loading ? (<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : admins.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-8">No admin permission records yet. All admins currently have full access.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Sections Access</TableHead><TableHead>Created</TableHead><TableHead className="w-[100px]">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {admins.map(admin => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.display_name}</TableCell>
                    <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {admin.allowed_sections.length === ADMIN_SECTIONS.length ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><Unlock className="w-3 h-3 mr-1" /> Full Access</Badge>
                        ) : (<>
                          <Badge variant="secondary" className="text-xs">{admin.allowed_sections.length}/{ADMIN_SECTIONS.length} sections</Badge>
                          {admin.allowed_sections.slice(0, 3).map(path => { const section = ADMIN_SECTIONS.find(s => s.path === path); return section ? <Badge key={path} variant="outline" className="text-[10px]">{section.label}</Badge> : null; })}
                          {admin.allowed_sections.length > 3 && <Badge variant="outline" className="text-[10px]">+{admin.allowed_sections.length - 3} more</Badge>}
                        </>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(admin)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(admin)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManageAdmins;
