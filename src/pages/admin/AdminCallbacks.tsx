import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Eye, EyeOff, CheckCheck, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminCallbacks = () => {
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCallbacks = async () => {
    const { data } = await supabase
      .from("inquiries")
      .select("*")
      .eq("type", "general")
      .order("created_at", { ascending: false });
    if (data) setCallbacks(data);
    setLoading(false);
  };

  useEffect(() => { fetchCallbacks(); }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from("inquiries").update({ read: true } as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCallbacks(prev => prev.map(c => c.id === id ? { ...c, read: true } : c));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = callbacks.filter(c => !c.read).map(c => c.id);
    if (unreadIds.length === 0) return;
    const { error } = await supabase.from("inquiries").update({ read: true } as any).eq("type", "general").eq("read", false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCallbacks(prev => prev.map(c => ({ ...c, read: true })));
      toast({ title: "Done", description: `Marked ${unreadIds.length} callbacks as read.` });
    }
  };

  const unreadCount = callbacks.filter(c => !c.read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Phone className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-2xl font-bold text-foreground">Callback Requests</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="rounded-full px-2.5 py-0.5 text-xs font-bold animate-pulse">
              {unreadCount} New
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-20">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callbacks.map((cb) => (
                <TableRow key={cb.id} className={!cb.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}>
                  <TableCell>
                    {!cb.read ? (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                      </span>
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className={`font-medium ${!cb.read ? "font-bold" : ""}`}>{cb.name}</TableCell>
                  <TableCell>{cb.email}</TableCell>
                  <TableCell>{cb.phone || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{cb.message || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(cb.created_at), "dd MMM yyyy, hh:mm a")}</TableCell>
                  <TableCell>
                    {!cb.read && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => markAsRead(cb.id)}>
                        <Eye className="w-3.5 h-3.5" /> Read
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && callbacks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No callback requests yet. They'll appear here when visitors submit the contact form.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCallbacks;
