import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { useFilteredList } from "@/hooks/useFilteredList";

const AdminInquiries = () => {
  const [inquiries, setInquiries] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
      if (data) setInquiries(data);
    };
    fetch();
  }, []);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    inquiries.forEach((i) => { if (i.type) set.add(i.type); });
    return Array.from(set).sort().map((v) => ({ label: v, value: v }));
  }, [inquiries]);

  const { filtered, filters, setFilter, clearAll, activeCount } = useFilteredList(inquiries, {
    storageKey: "admin.inquiries.filters",
    defaults: { search: "", type: "all", read: "all" },
    searchFields: [(i) => i.name, (i) => i.email, (i) => i.phone, (i) => i.message],
    fieldFilters: { type: (i) => i.type },
    customPredicates: {
      read: (val, i) => (val === "read" ? !!i.read : val === "unread" ? !i.read : true),
    },
  });

  const { sortedItems, sortConfig, handleSort } = useTableSort(filtered);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6 text-foreground">Inquiries</h1>
      <AdminFilterBar
        searchValue={filters.search}
        onSearchChange={(v) => setFilter("search", v)}
        searchPlaceholder="Search name, email, phone, message…"
        values={filters}
        onFilterChange={setFilter}
        onClearAll={clearAll}
        activeCount={activeCount}
        filters={[
          ...(typeOptions.length > 0 ? [{ type: "select" as const, key: "type", label: "Type", width: "w-40", options: [{ label: "All Types", value: "all" }, ...typeOptions] }] : []),
          { type: "select", key: "read", label: "Status", width: "w-36", options: [
            { label: "All", value: "all" },
            { label: "Unread", value: "unread" },
            { label: "Read", value: "read" },
          ]},
        ]}
        resultsHint={`${sortedItems.length} of ${inquiries.length} inquiries`}
      />
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
              {sortedItems.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{inquiries.length === 0 ? "No inquiries yet" : "No inquiries match the current filters"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInquiries;
