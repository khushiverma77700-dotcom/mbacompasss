import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, ChevronDown, ChevronRight } from "lucide-react";
import { type ActivityRow, activityLabel, statusLabel } from "@/lib/applicationTracker";

type SummaryRow = {
  user_id: string;
  student_name: string | null;
  student_email: string | null;
  views: number;
  apply_clicks: number;
  started: number;
  in_progress: number;
  completed: number;
  last_activity: string | null;
};

const HIGH_INTENT_CLICKS = 3;

export default function StudentsTab() {
  const [search, setSearch] = useState("");
  const [highIntentOnly, setHighIntentOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ["admin-application-student-summary"],
    queryFn: async (): Promise<SummaryRow[]> => {
      const { data, error } = await supabase.rpc("application_student_summary");
      if (error) throw error;
      return ((data ?? []) as unknown as SummaryRow[]).sort(
        (a, b) => (b.apply_clicks ?? 0) - (a.apply_clicks ?? 0),
      );
    },
  });

  const detail = useQuery({
    queryKey: ["admin-student-detail", expanded],
    enabled: !!expanded,
    queryFn: async () => {
      const [{ data: acts }, { data: apps }] = await Promise.all([
        supabase
          .from("application_activity")
          .select("*")
          .eq("user_id", expanded!)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("student_applications")
          .select("status, tracker:application_trackers(name)")
          .eq("user_id", expanded!),
      ]);
      return {
        activity: (acts ?? []) as unknown as ActivityRow[],
        applications: (apps ?? []) as unknown as { status: string; tracker: { name: string } | null }[],
      };
    },
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = summary.data ?? [];
    if (highIntentOnly) list = list.filter((r) => (r.apply_clicks ?? 0) >= HIGH_INTENT_CLICKS);
    if (s) {
      list = list.filter((r) =>
        `${r.student_name ?? ""} ${r.student_email ?? ""} ${r.user_id}`.toLowerCase().includes(s),
      );
    }
    return list;
  }, [summary.data, search, highIntentOnly]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle className="text-base">Students &amp; intent</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name or email"
            className="md:w-72"
          />
          <Button
            variant={highIntentOnly ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => setHighIntentOnly((v) => !v)}
          >
            <Flame className="h-4 w-4" /> High intent ({HIGH_INTENT_CLICKS}+ apply clicks)
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No student activity yet.</p>
        ) : (
          <div className="overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Colleges viewed</th>
                  <th className="px-3 py-2 font-medium">Apply clicks</th>
                  <th className="px-3 py-2 font-medium">Started</th>
                  <th className="px-3 py-2 font-medium">In progress</th>
                  <th className="px-3 py-2 font-medium">Completed</th>
                  <th className="px-3 py-2 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = expanded === r.user_id;
                  return (
                    <>
                      <tr
                        key={r.user_id}
                        className="cursor-pointer border-t border-border hover:bg-muted/40"
                        onClick={() => setExpanded(isOpen ? null : r.user_id)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <div>
                              <span className="font-medium text-foreground">{r.student_name || "Student"}</span>
                              <span className="block text-muted-foreground">
                                {r.student_email || r.user_id.slice(0, 8)}
                              </span>
                            </div>
                            {(r.apply_clicks ?? 0) >= HIGH_INTENT_CLICKS && (
                              <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                                High intent
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">{r.views ?? 0}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{r.apply_clicks ?? 0}</td>
                        <td className="px-3 py-2">{r.started ?? 0}</td>
                        <td className="px-3 py-2">{r.in_progress ?? 0}</td>
                        <td className="px-3 py-2">{r.completed ?? 0}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {r.last_activity ? new Date(r.last_activity).toLocaleString("en-IN") : "—"}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${r.user_id}-detail`} className="border-t border-border bg-muted/20">
                          <td colSpan={7} className="px-4 py-4">
                            {detail.isLoading ? (
                              <Skeleton className="h-24 w-full rounded-lg" />
                            ) : (
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="pb-2 text-sm font-medium text-foreground">
                                    Colleges in this student’s journey
                                  </p>
                                  <ul className="space-y-1 text-sm">
                                    {(detail.data?.applications ?? []).length === 0 ? (
                                      <li className="text-muted-foreground">No tracked applications yet.</li>
                                    ) : (
                                      (detail.data?.applications ?? []).map((a, i) => (
                                        <li key={i} className="flex items-center justify-between gap-2">
                                          <span className="text-foreground">{a.tracker?.name ?? "College"}</span>
                                          <Badge variant="outline">{statusLabel(a.status)}</Badge>
                                        </li>
                                      ))
                                    )}
                                  </ul>
                                </div>
                                <div>
                                  <p className="pb-2 text-sm font-medium text-foreground">Recent activity</p>
                                  <ul className="max-h-56 space-y-1 overflow-auto text-sm">
                                    {(detail.data?.activity ?? []).map((a) => (
                                      <li key={a.id} className="flex items-center justify-between gap-2">
                                        <span className="text-foreground">
                                          {activityLabel(a.activity_type)}
                                          {a.tracker_name ? ` — ${a.tracker_name}` : ""}
                                        </span>
                                        <span className="whitespace-nowrap text-muted-foreground">
                                          {new Date(a.created_at).toLocaleDateString("en-IN")}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
