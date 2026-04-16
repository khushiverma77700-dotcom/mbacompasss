import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";

const AdminInquiries = () => {
  const [inquiries, setInquiries] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
      if (data) setInquiries(data);
    };
    fetch();
  }, []);

  const { sortedItems, sortConfig, handleSort } = useTableSort(inquiries);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6 text-foreground">Inquiries</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <SortableTableHead label="Name" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Email" sortKey="email" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Phone" sortKey="phone" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Type" sortKey="type" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead>Message</TableHead>
                <SortableTableHead label="Date" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((inq, idx) => (
                <TableRow key={inq.id}>
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{inq.name}</TableCell>
                  <TableCell>{inq.email}</TableCell>
                  <TableCell>{inq.phone}</TableCell>
                  <TableCell><Badge variant="secondary">{inq.type}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{inq.message}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(inq.created_at), "dd MMM yyyy")}
                    <br/><span className="text-[10px]">{format(new Date(inq.created_at), "hh:mm a")}</span>
                  </TableCell>
                </TableRow>
              ))}
              {inquiries.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No inquiries yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInquiries;
