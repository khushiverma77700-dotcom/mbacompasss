import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Pin } from "lucide-react";

export default function StudentAnnouncements() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("student_announcements")
      .select("*")
      .eq("is_active", true)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-sky-600" /> Announcements
        </h1>
        <p className="text-sm text-muted-foreground">Updates from your mentors and the MBA Compass team.</p>
      </div>
      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No announcements yet.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className="p-5">
              <div className="flex items-center gap-2 mb-1">
                {n.pinned && (
                  <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Pin className="h-3 w-3" /> Pinned
                  </Badge>
                )}
                <h3 className="font-semibold">{n.title}</h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
              {n.body && <p className="text-sm text-muted-foreground whitespace-pre-line">{n.body}</p>}
              {n.link_url && (
                <a href={n.link_url} target="_blank" rel="noreferrer" className="text-sm text-sky-700 hover:underline mt-2 inline-block">
                  {n.link_label || "Open link"} →
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
