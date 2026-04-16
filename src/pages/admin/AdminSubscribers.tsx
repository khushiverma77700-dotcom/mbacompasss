import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2 } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import { format } from "date-fns";

const AdminSubscribers = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchSubscribers = async () => {
    const { data } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
    if (data) setSubscribers(data);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const exportCSV = () => {
    const csv = "Email,Subscribed At\n" + subscribers.map(s => `${s.email},${s.created_at}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this subscriber?")) return;
    await supabase.from("newsletter_subscribers").delete().eq("id", id);
    fetchSubscribers();
    toast({ title: "Subscriber removed" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Newsletter Subscribers</h1>
        <Button variant="outline" onClick={exportCSV} disabled={subscribers.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label="Email" sortKey="email" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Subscribed At" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell>{format(new Date(s.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {subscribers.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No subscribers yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscribers;
