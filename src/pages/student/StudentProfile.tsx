import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function StudentProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ display_name: "", phone: "", city: "", target_exam: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        display_name: data.display_name || "",
        phone: data.phone || "",
        city: (data as any).city || "",
        target_exam: (data as any).target_exam || "",
      });
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Keep your details up to date.</p>
      </div>
      <Card className="p-5 space-y-3">
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div>
          <Label>Display name</Label>
          <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <Label>Target exam</Label>
          <Input value={form.target_exam} onChange={(e) => setForm({ ...form, target_exam: e.target.value })} placeholder="e.g. CAT 2026" />
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </Card>
    </div>
  );
}
