import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Users } from "lucide-react";

export default function AdminStudentNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState<"all" | "enrolled">("all");
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("student_notifications").select("*").order("created_at", { ascending: false }).limit(30);
    setRecent(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!title.trim()) return toast.error("Title required");
    setSending(true);
    let userIds: string[] = [];
    if (target === "all") {
      const { data } = await supabase.from("profiles").select("user_id").not("user_id", "is", null).limit(5000);
      userIds = (data ?? []).map((p: any) => p.user_id);
    } else {
      const { data } = await supabase.from("mock_enrollments").select("user_id");
      userIds = Array.from(new Set((data ?? []).map((e: any) => e.user_id)));
    }
    if (!userIds.length) { setSending(false); return toast.error("No recipients"); }
    const rows = userIds.map(uid => ({ user_id: uid, title, message: message || null, type, link_url: linkUrl || null }));
    // chunk insert
    for (let i = 0; i < rows.length; i += 500) {
      const slice = rows.slice(i, i + 500);
      const { error } = await supabase.from("student_notifications").insert(slice);
      if (error) { toast.error(error.message); break; }
    }
    setSending(false);
    setTitle(""); setMessage(""); setLinkUrl("");
    toast.success(`Sent to ${userIds.length} students`);
    load();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">Send announcements straight to the student dashboard bell.</p>
      </div>

      <Card className="p-6 border-sky-100">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="New CAT mock available!" />
          </div>
          <div className="sm:col-span-2">
            <Label>Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Optional details" />
          </div>
          <div>
            <Label>Link URL (optional)</Label>
            <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="/student/mocks" />
          </div>
          <div>
            <Label>Type</Label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full h-10 px-3 rounded-md border">
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="alert">Alert</option>
              <option value="mock">New Mock</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Send to</Label>
            <div className="flex gap-2 mt-1">
              <Button variant={target === "all" ? "default" : "outline"} size="sm" onClick={() => setTarget("all")}>All registered students</Button>
              <Button variant={target === "enrolled" ? "default" : "outline"} size="sm" onClick={() => setTarget("enrolled")}>Only enrolled in mocks</Button>
            </div>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={send} disabled={sending} className="bg-sky-600 hover:bg-sky-700">
              <Send className="h-4 w-4 mr-1" /> {sending ? "Sending…" : "Send notification"}
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Recent (last 30)</h2>
        <div className="space-y-2">
          {recent.map(n => (
            <Card key={n.id} className="p-3 border-sky-100 text-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-medium">{n.title}</div>
                  {n.message && <div className="text-xs text-muted-foreground">{n.message}</div>}
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
