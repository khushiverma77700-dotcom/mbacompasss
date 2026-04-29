import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Users, Image as ImageIcon, X, Upload, Trash2, ExternalLink } from "lucide-react";

const TYPES = [
  { value: "info",    label: "General Update" },
  { value: "success", label: "Good News" },
  { value: "alert",   label: "Important Alert" },
  { value: "mock",    label: "New Mock Launch" },
  { value: "exam",    label: "Exam Update" },
  { value: "college", label: "College Update" },
];

export default function AdminStudentNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState<"all" | "enrolled">("all");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("student_notifications").select("*").order("created_at", { ascending: false }).limit(30);
    setRecent(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const onPickFile = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `notifications/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, { cacheControl: "3600", upsert: false });
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("uploads").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    toast.success("Image uploaded");
  };

  const send = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (linkLabel && !linkUrl) return toast.error("Add a link URL or remove the button label");
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
    const rows = userIds.map(uid => ({
      user_id: uid,
      title,
      message: message || null,
      type,
      link_url: linkUrl || null,
      link_label: linkLabel || null,
      image_url: imageUrl || null,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const slice = rows.slice(i, i + 500);
      const { error } = await supabase.from("student_notifications").insert(slice);
      if (error) { toast.error(error.message); break; }
    }
    setSending(false);
    setTitle(""); setMessage(""); setLinkUrl(""); setLinkLabel(""); setImageUrl("");
    toast.success(`Sent to ${userIds.length} students`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this notification for the recipient?")) return;
    const { error } = await supabase.from("student_notifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Updates Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">Push announcements, new mock launches, exam alerts and more — with optional image and CTA button.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Compose */}
        <Card className="p-6 border-sky-100">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="New CAT mock just dropped!" />
            </div>
            <div className="sm:col-span-2">
              <Label>Message</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Optional details students will read in the timeline." />
            </div>

            <div>
              <Label>Type</Label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full h-10 px-3 rounded-md border bg-background">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Send to</Label>
              <div className="flex gap-2 mt-1">
                <Button variant={target === "all" ? "default" : "outline"} size="sm" onClick={() => setTarget("all")}>All students</Button>
                <Button variant={target === "enrolled" ? "default" : "outline"} size="sm" onClick={() => setTarget("enrolled")}>Enrolled only</Button>
              </div>
            </div>

            {/* Optional CTA button */}
            <div className="sm:col-span-2 rounded-lg border border-dashed p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="h-4 w-4 text-sky-600" />
                <div className="text-sm font-medium">Optional CTA button</div>
                <span className="text-xs text-muted-foreground">— shows only if URL is set</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="/student/mocks or https://…" />
                <Input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Button label (e.g. Take Mock)" />
              </div>
            </div>

            {/* Optional image */}
            <div className="sm:col-span-2 rounded-lg border border-dashed p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="h-4 w-4 text-sky-600" />
                <div className="text-sm font-medium">Optional image</div>
                <span className="text-xs text-muted-foreground">— shows only if uploaded</span>
              </div>
              {imageUrl ? (
                <div className="relative inline-block">
                  <img src={imageUrl} alt="preview" className="max-h-40 rounded-md border" style={{ maxWidth: "100%", height: "auto" }} />
                  <button onClick={() => setImageUrl("")} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white grid place-items-center shadow"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onPickFile(e.target.files[0])} />
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading…" : "Upload image"}
                  </Button>
                  <span className="text-xs text-muted-foreground">PNG / JPG up to 5 MB</span>
                </div>
              )}
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <Button onClick={send} disabled={sending} className="bg-sky-600 hover:bg-sky-700">
                <Send className="h-4 w-4 mr-1" /> {sending ? "Sending…" : "Send to timeline"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Live preview */}
        <Card className="p-4 border-sky-100 h-fit sticky top-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Live preview</div>
          <div className="rounded-xl border ring-1 ring-sky-200/60 overflow-hidden">
            <div className="p-4 bg-gradient-to-br from-sky-50 to-white">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-100 text-sky-700">{TYPES.find(t => t.value === type)?.label}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500 text-white">New</span>
              </div>
              <div className="font-semibold">{title || "Notification title"}</div>
              {message && <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{message}</div>}
              {imageUrl && <img src={imageUrl} alt="" className="mt-3 rounded-md border" style={{ maxWidth: "100%", height: "auto" }} />}
              {linkUrl && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                    {linkLabel || "View details"} <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Recent (last 30)</h2>
        <div className="space-y-2">
          {recent.map(n => (
            <Card key={n.id} className="p-3 border-sky-100 text-sm">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{n.title}</div>
                  {n.message && <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="uppercase font-semibold">{n.type}</span>
                    {n.image_url && <span>· image</span>}
                    {n.link_url && <span>· button</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleString()}</div>
                  <Button size="sm" variant="ghost" className="text-rose-600 h-7 px-2" onClick={() => remove(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
