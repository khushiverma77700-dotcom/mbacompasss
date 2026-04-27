import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pin, PinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminStudentAnnouncements() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", link_url: "", link_label: "", pinned: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("student_announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("student_announcements").insert(form);
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setForm({ title: "", body: "", link_url: "", link_label: "", pinned: false });
    toast({ title: "Posted" });
    load();
  };

  const togglePin = async (id: string, pinned: boolean) => {
    await supabase.from("student_announcements").update({ pinned: !pinned }).eq("id", id);
    load();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("student_announcements").update({ is_active: !is_active }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("student_announcements").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Student Announcements</h1>
        <p className="text-sm text-muted-foreground">Push updates that appear on the student dashboard.</p>
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">New announcement</h2>
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Link URL (optional)</Label>
            <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
          </div>
          <div>
            <Label>Link label</Label>
            <Input value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="e.g. Read more" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
          <Label className="!mb-0">Pin to top</Label>
        </div>
        <Button onClick={create} disabled={saving || !form.title.trim()}>Post announcement</Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">All announcements ({items.length})</h2>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">None yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {i.pinned && <Badge variant="secondary" className="text-[10px]">Pinned</Badge>}
                    {!i.is_active && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                    <div className="font-medium">{i.title}</div>
                  </div>
                  {i.body && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{i.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(i.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => togglePin(i.id, i.pinned)}>
                    {i.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(i.id, i.is_active)}>
                    <Switch checked={i.is_active} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(i.id)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
