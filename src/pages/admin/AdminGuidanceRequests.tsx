import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { useFilteredList } from "@/hooks/useFilteredList";
import { Download } from "lucide-react";

const statusBadge = (status: string) => {
  switch (status) {
    case "new": return <Badge variant="default">New</Badge>;
    case "contacted": return <Badge variant="secondary">Contacted</Badge>;
    case "resolved": return <Badge variant="outline">Resolved</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

const AdminGuidanceRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase.from("guidance_requests" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setRequests(data);
    };
    fetch();
  }, []);

  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      (r.help_topics || []).forEach((t: string) => set.add(t));
    });
    return Array.from(set).sort().map((v) => ({ label: v, value: v }));
  }, [requests]);

  const { filtered, filters, setFilter, clearAll, activeCount } = useFilteredList(requests, {
    storageKey: "admin.guidance_requests.filters",
    defaults: { search: "", topic: "all", status: "all" },
    searchFields: [
      (r) => r.name, (r) => r.email, (r) => r.phone, (r) => r.query,
      (r) => (r.help_topics || []).join(" "), (r) => r.exam,
    ],
    fieldFilters: {},
    customPredicates: {
      topic: (val, r) =>
        val === "all" ? true : (r.help_topics || []).includes(val),
      status: (val, r) => (val === "all" ? true : r.status === val),
    },
  });

  const { sortedItems, sortConfig, handleSort } = useTableSort(filtered);

  const exportCsv = () => {
    const headers = [
      "Name", "Email", "Phone", "Graduation Year", "Exam", "Score",
      "Work Experience", "Specialisation", "Help Topics", "Query", "Status", "Created At",
    ];
    const rows = sortedItems.map((r) => [
      r.name, r.email, r.phone, r.graduation_year || "", r.exam || "", r.score || "",
      r.work_experience || "", r.specialisation || "",
      (r.help_topics || []).join("; "), (r.query || "").replace(/"/g, '""'),
      r.status, format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guidance-requests-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const markStatus = async (id: string, status: string) => {
    await (supabase.from("guidance_requests" as any) as any)
      .update({ status })
      .eq("id", id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Free MBA Guidance Requests</h1>
        <Button variant="outline" onClick={exportCsv} disabled={sortedItems.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <AdminFilterBar
        searchValue={filters.search}
        onSearchChange={(v) => setFilter("search", v)}
        searchPlaceholder="Search name, email, phone, query, topics…"
        values={filters}
        onFilterChange={setFilter}
        onClearAll={clearAll}
        activeCount={activeCount}
        filters={[
          ...(topicOptions.length > 0 ? [{
            type: "select" as const, key: "topic", label: "Help Topic", width: "w-48",
            options: [{ label: "All Topics", value: "all" }, ...topicOptions],
          }] : []),
          {
            type: "select", key: "status", label: "Status", width: "w-36",
            options: [
              { label: "All", value: "all" },
              { label: "New", value: "new" },
              { label: "Contacted", value: "contacted" },
              { label: "Resolved", value: "resolved" },
            ],
          },
        ]}
        resultsHint={`${sortedItems.length} of ${requests.length} requests`}
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <SortableTableHead label="Name" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Email" sortKey="email" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Phone" sortKey="phone" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Exam" sortKey="exam" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead>Help Topics</TableHead>
                <TableHead>Query</TableHead>
                <SortableTableHead label="Date" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((req, idx) => (
                <TableRow key={req.id}>
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{req.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{req.email}</TableCell>
                  <TableCell className="whitespace-nowrap">{req.phone}</TableCell>
                  <TableCell>{req.exam || "—"}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {(req.help_topics || []).slice(0, 3).map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px] font-normal">{t}</Badge>
                      ))}
                      {(req.help_topics || []).length > 3 && (
                        <Badge variant="outline" className="text-[10px] font-normal">+{(req.help_topics || []).length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{req.query || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(req.created_at), "dd MMM yyyy")}
                    <br /><span className="text-[10px]">{format(new Date(req.created_at), "hh:mm a")}</span>
                  </TableCell>
                  <TableCell>{statusBadge(req.status)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {req.status === "new" ? (
                      <Button size="sm" variant="outline" onClick={() => markStatus(req.id, "contacted")}>
                        Mark Contacted
                      </Button>
                    ) : req.status === "contacted" ? (
                      <Button size="sm" variant="outline" onClick={() => markStatus(req.id, "resolved")}>
                        Mark Resolved
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => markStatus(req.id, "new")}>Re-open</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sortedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    {requests.length === 0 ? "No guidance requests yet" : "No requests match the current filters"}
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

export default AdminGuidanceRequests;
