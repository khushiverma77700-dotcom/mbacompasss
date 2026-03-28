import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Institute = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  rating: number | null;
  featured: boolean | null;
  mode: string | null;
};

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  city: "",
  state: "",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  mode: "Offline",
  featured: false,
  discount: "",
  offer: "",
};

const AdminInstitutes = () => {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInstitutes = async () => {
    const { data } = await supabase.from("institutes").select("id, name, slug, city, rating, featured, mode").order("created_at", { ascending: false });
    if (data) setInstitutes(data);
  };

  useEffect(() => { fetchInstitutes(); }, []);

  const handleSave = async () => {
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = { ...form, slug, featured: form.featured };

    if (editId) {
      const { error } = await supabase.from("institutes").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Institute updated" });
    } else {
      const { error } = await supabase.from("institutes").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Institute added" });
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditId(null);
    fetchInstitutes();
  };

  const handleEdit = async (id: string) => {
    const { data } = await supabase.from("institutes").select("*").eq("id", id).single();
    if (data) {
      setForm({
        name: data.name,
        slug: data.slug,
        description: data.description ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        address: data.address ?? "",
        phone: data.phone ?? "",
        whatsapp: data.whatsapp ?? "",
        email: data.email ?? "",
        website: data.website ?? "",
        mode: data.mode ?? "Offline",
        featured: data.featured ?? false,
        discount: data.discount ?? "",
        offer: data.offer ?? "",
      });
      setEditId(id);
      setDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this institute?")) return;
    await supabase.from("institutes").delete().eq("id", id);
    fetchInstitutes();
    toast({ title: "Institute deleted" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Institutes</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Institute
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Add"} Institute</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Slug (auto-generated)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Discount (e.g. 10% off)" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                <Input placeholder="Offer text" value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                Featured Institute
              </label>
              <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"} Institute</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutes.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.name}</TableCell>
                  <TableCell>{inst.city}</TableCell>
                  <TableCell>{inst.mode}</TableCell>
                  <TableCell>{inst.rating}</TableCell>
                  <TableCell>{inst.featured ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(inst.id)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(inst.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {institutes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No institutes yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInstitutes;
