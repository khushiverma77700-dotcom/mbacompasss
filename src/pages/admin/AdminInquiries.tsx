import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const AdminInquiries = () => {
  const [inquiries, setInquiries] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
      if (data) setInquiries(data);
    };
    fetch();
  }, []);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6 text-foreground">Inquiries</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inq) => (
                <TableRow key={inq.id}>
                  <TableCell className="font-medium">{inq.name}</TableCell>
                  <TableCell>{inq.email}</TableCell>
                  <TableCell>{inq.phone}</TableCell>
                  <TableCell><Badge variant="secondary">{inq.type}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{inq.message}</TableCell>
                  <TableCell>{format(new Date(inq.created_at), "dd MMM yyyy")}</TableCell>
                </TableRow>
              ))}
              {inquiries.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No inquiries yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInquiries;
