import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import {
  ACTIVITY_TYPES,
  type ActivityRow,
  type TrackerRow,
  activityLabel,
} from "@/lib/applicationTracker";

export default function ActivityLogTab({ trackers }: { trackers: TrackerRow[] }) {
  const [student, setStudent] = useState("");
  const [type, setType] = useState("all");
  const [trackerId, setTrackerId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = useQuery({
    queryKey: ["admin-application-activity", type, trackerId, from, to],
    refetchInterval: 60_000,
    queryFn: async (): Promise<ActivityRow[]> => {
      let q = supabase
        .from("application_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (type !== "all") q = q.eq("activity_type", type);
      if (trackerId !== "all") q = q.eq("tracker_id", trackerId);
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) q = q.lte("created_at", new Date(`${to}T23:59:59`).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
  });

  const rows = useMemo(() => {
    const s = student.trim().toLowerCase();
    const all = query.data ?? [];
    if (!s) return all;
    return all.filter((r) =>
      `${r.student_name ?? ""} ${r.student_email ?? ""} ${r.user_id}`.toLowerCase().includes(s),
    );
  }, [query.data, student]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Activity log</CardTitle>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void query.refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-sm">Student</Label>
            <Input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="Name or email" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Activity type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ACTIVITY_TYPES.map((a) => (
                  <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">College / Exam</Label>
            <Select value={trackerId} onValueChange={setTrackerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All colleges</SelectItem>
                {trackers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {query.isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No activity for these filters.</p>
        ) : (
          <div className="max-h-[32rem] overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Activity</th>
                  <th className="px-3 py-2 font-medium">College / Exam</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">{r.student_name || "Student"}</span>
                      <span className="block text-muted-foreground">{r.student_email || r.user_id.slice(0, 8)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{activityLabel(r.activity_type)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-foreground">{r.tracker_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
