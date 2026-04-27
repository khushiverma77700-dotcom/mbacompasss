import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";

interface N { id: string; title: string; message: string | null; type: string; link_url: string | null; is_read: boolean; created_at: string; }

export default function StudentNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("student_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("student_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bell className="h-6 w-6 text-sky-600" /> Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Updates from MBA Compass and your study activity.</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAll}><CheckCheck className="h-4 w-4 mr-1" /> Mark all read</Button>
      </div>

      {loading ? <div className="text-muted-foreground">Loading…</div> : items.length === 0 ? (
        <Card className="p-12 text-center border-sky-100">
          <Bell className="h-10 w-10 mx-auto text-sky-300 mb-3" />
          <div className="font-medium">You're all caught up</div>
          <div className="text-sm text-muted-foreground mt-1">New mocks, streak alerts and announcements will show up here.</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(n => {
            const body = (
              <Card className={`p-4 border-sky-100 ${!n.is_read ? "bg-sky-50/60 border-sky-200" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${!n.is_read ? "bg-sky-500" : "bg-gray-300"}`} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{n.title}</div>
                    {n.message && <div className="text-sm text-muted-foreground mt-1">{n.message}</div>}
                    <div className="text-[11px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </Card>
            );
            return n.link_url ? <Link key={n.id} to={n.link_url}>{body}</Link> : <div key={n.id}>{body}</div>;
          })}
        </div>
      )}
    </div>
  );
}
