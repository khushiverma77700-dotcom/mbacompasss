import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Building2, Globe, Sparkles, RefreshCw, FileText } from "lucide-react";
import { slugify } from "@/lib/slugify";
import AICoachingInstituteDialog from "@/components/admin/AICoachingInstituteDialog";

type Institute = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  institute_type: "city" | "hybrid";
  featured: boolean | null;
  created_at: string;
};

const AdminCoachingInstitutes = () => {
  const [items, setItems] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"city" | "hybrid">("city");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"city" | "hybrid">("city");
  const [showAI, setShowAI] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("institutes")
      .select("id, name, slug, city, institute_type, featured, created_at")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const slug = slugify(newName);
    const { data, error } = await supabase
      .from("institutes")
      .insert({ name: newName.trim(), slug, institute_type: newType, sections: {} })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Institute created", description: "Now add sections and details." });
    setShowCreate(false);
    setNewName("");
    window.location.href = `/admin/coaching-institutes/${data.id}`;
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this institute? This cannot be undone.")) return;
    const { error } = await supabase.from("institutes").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  const filtered = items.filter(
    (i) => i.institute_type === tab && (!search || i.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coaching Institutes</h1>
          <p className="text-sm text-muted-foreground">Manage city-wise and hybrid (online + offline) institutes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAI(true)}>
            <Sparkles className="w-4 h-4 mr-1" /> Generate via AI
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Institute
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="city" className="gap-1">
            <Building2 className="w-3.5 h-3.5" /> City-wise
          </TabsTrigger>
          <TabsTrigger value="hybrid" className="gap-1">
            <Globe className="w-3.5 h-3.5" /> Hybrid (Online + Offline)
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </div>
        <TabsContent value="city" className="mt-4">
          <InstituteTable items={filtered} loading={loading} onDelete={remove} />
        </TabsContent>
        <TabsContent value="hybrid" className="mt-4">
          <InstituteTable items={filtered} loading={loading} onDelete={remove} />
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new institute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Institute Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. IMS Learning Resources" autoFocus />
            </div>
            <div>
              <Label>Type *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setNewType("city")}
                  className={`border rounded-lg p-3 text-left ${newType === "city" ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="font-semibold text-sm flex items-center gap-1">
                    <Building2 className="w-4 h-4" /> City-wise
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Has physical centers in specific cities.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewType("hybrid")}
                  className={`border rounded-lg p-3 text-left ${newType === "hybrid" ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="font-semibold text-sm flex items-center gap-1">
                    <Globe className="w-4 h-4" /> Hybrid
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Online + offline, pan-India access.</div>
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={create} disabled={creating || !newName.trim()}>
                {creating ? "Creating…" : "Create & open editor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AICoachingInstituteDialog
        open={showAI}
        onOpenChange={setShowAI}
        onGenerated={async ({ basic, sections, brief }) => {
          const slug = (basic.slug || slugify(basic.name || brief.name)).slice(0, 80);
          const { data, error } = await supabase
            .from("institutes")
            .insert({
              name: basic.name || brief.name,
              slug,
              institute_type: brief.instituteType || "hybrid",
              city: basic.city || brief.city || null,
              state: basic.state || brief.state || null,
              description: basic.description || null,
              website: basic.website || brief.website || null,
              phone: basic.phone || null,
              email: basic.email || null,
              meta_title: basic.meta_title || null,
              meta_description: basic.meta_description || null,
              rating: basic.rating || 0,
              students_count: basic.students_count || 0,
              success_rate: basic.success_rate || 0,
              sections,
            })
            .select("id")
            .single();
          if (error) {
            toast({ title: "Failed to save", description: error.message, variant: "destructive" });
            return;
          }
          window.location.href = `/admin/coaching-institutes/${data.id}`;
        }}
      />
    </div>
  );
};

const InstituteTable = ({ items, loading, onDelete }: any) => (
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
          )}
          {!loading && items.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No institutes yet.</TableCell></TableRow>
          )}
          {items.map((i: Institute) => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{i.slug}</TableCell>
              <TableCell>{i.city || "—"}</TableCell>
              <TableCell>{i.featured ? <Badge>Featured</Badge> : <span className="text-muted-foreground text-xs">No</span>}</TableCell>
              <TableCell className="text-right">
                <Link to={`/admin/coaching-institutes/${i.id}`}>
                  <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => onDelete(i.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export default AdminCoachingInstitutes;
