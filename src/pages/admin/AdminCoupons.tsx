import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, ArrowLeft } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import RichTextEditor from "@/components/admin/RichTextEditor";

type Coupon = {
  id: string; code: string; description: string | null; discount_text: string | null;
  institute_id: string | null; active: boolean | null; max_uses: number | null;
  current_uses: number | null; valid_from: string | null; valid_until: string | null;
  created_at: string;
};

type CouponClaim = {
  id: string; coupon_id: string; user_id: string; target_exam: string | null;
  login_source: string | null; claimed_at: string;
};

const emptyForm = {
  code: "", description: "", discount_text: "", institute_id: "",
  active: true, max_uses: 0, valid_from: "", valid_until: "",
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [claims, setClaims] = useState<CouponClaim[]>([]);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [claimsDialogOpen, setClaimsDialogOpen] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();
  const { sortedItems: sortedCoupons, sortConfig, handleSort } = useTableSort(coupons);

  const fetchCoupons = async () => { const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false }); if (data) setCoupons(data); };
  const fetchInstitutes = async () => { const { data } = await supabase.from("institutes").select("id, name").order("name"); if (data) setInstitutes(data); };
  const fetchClaims = async (couponId: string) => { const { data } = await supabase.from("coupon_claims").select("*").eq("coupon_id", couponId).order("claimed_at", { ascending: false }); if (data) setClaims(data); };

  useEffect(() => { fetchCoupons(); fetchInstitutes(); }, []);

  const handleSave = async () => {
    const payload = {
      code: form.code, description: form.description || null, discount_text: form.discount_text || null,
      institute_id: form.institute_id || null, active: form.active, max_uses: form.max_uses,
      valid_from: form.valid_from || null, valid_until: form.valid_until || null,
    };
    if (editId) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Coupon updated" });
    } else {
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Coupon created" });
    }
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchCoupons();
  };

  const handleEdit = async (id: string) => {
    const { data } = await supabase.from("coupons").select("*").eq("id", id).single();
    if (data) {
      setForm({
        code: data.code, description: data.description ?? "", discount_text: data.discount_text ?? "",
        institute_id: data.institute_id ?? "", active: data.active ?? true, max_uses: data.max_uses ?? 0,
        valid_from: data.valid_from ? data.valid_from.split("T")[0] : "", valid_until: data.valid_until ? data.valid_until.split("T")[0] : "",
      });
      setEditId(id); setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    fetchCoupons(); toast({ title: "Coupon deleted" });
  };

  const viewClaims = (couponId: string) => { setSelectedCouponId(couponId); fetchClaims(couponId); setClaimsDialogOpen(true); };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Coupons
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Coupon</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Coupon Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE20" /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label><RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Coupon details..." /></div>
            <Input placeholder="Discount text (e.g. 20% off)" value={form.discount_text} onChange={(e) => setForm({ ...form, discount_text: e.target.value })} />
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Linked Institute (optional)</Label>
              <select className="w-full border border-border rounded-md p-2 text-sm bg-background" value={form.institute_id} onChange={(e) => setForm({ ...form, institute_id: e.target.value })}>
                <option value="">No specific institute</option>
                {institutes.map((inst) => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground block mb-1">Valid From</Label><Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
              <div><Label className="text-xs text-muted-foreground block mb-1">Valid Until</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
            </div>
            <Input type="number" placeholder="Max uses (0 = unlimited)" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Active</label>
            <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"} Coupon</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Coupons</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Coupon</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead><SortableTableHead label="Code" sortKey="code" sortConfig={sortConfig} onSort={handleSort} /><SortableTableHead label="Discount" sortKey="discount_text" sortConfig={sortConfig} onSort={handleSort} /><TableHead>Uses</TableHead>
                <SortableTableHead label="Status" sortKey="active" sortConfig={sortConfig} onSort={handleSort} /><SortableTableHead label="Valid Until" sortKey="valid_until" sortConfig={sortConfig} onSort={handleSort} /><SortableTableHead label="Created" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} /><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCoupons.map((c, idx) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-mono font-bold">{c.code}</TableCell>
                  <TableCell>{c.discount_text}</TableCell>
                  <TableCell>{c.current_uses}/{c.max_uses || "∞"}</TableCell>
                  <TableCell><Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell>{c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br/><span className="text-[10px]">{new Date(c.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => viewClaims(c.id)}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(c.id)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No coupons yet</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Claims tracking dialog - keeping as dialog since it's view-only */}
      <Dialog open={claimsDialogOpen} onOpenChange={setClaimsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Coupon Claims Tracking</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>User ID</TableHead><TableHead>Target Exam</TableHead><TableHead>Source</TableHead><TableHead>Claimed At</TableHead></TableRow></TableHeader>
            <TableBody>
              {claims.map((cl) => (
                <TableRow key={cl.id}>
                  <TableCell className="font-mono text-xs">{cl.user_id.slice(0, 8)}...</TableCell>
                  <TableCell>{cl.target_exam || "—"}</TableCell>
                  <TableCell>{cl.login_source || "—"}</TableCell>
                  <TableCell>{new Date(cl.claimed_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {claims.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No claims yet</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
