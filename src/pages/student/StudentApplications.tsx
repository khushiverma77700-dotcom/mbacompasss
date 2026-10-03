import { useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  History,
  IndianRupee,
  Loader2,
} from "lucide-react";
import {
  APPLICATION_STATUSES,
  type ActivityRow,
  type StudentApplicationRow,
  type TrackerRow,
  activityLabel,
  buildApplyUrl,
  deadlineInfo,
  formatDate,
  formatFee,
  logApplicationActivity,
  statusLabel,
} from "@/lib/applicationTracker";

type Joined = StudentApplicationRow & { tracker: TrackerRow | null };

const STATUS_PROGRESS: Record<string, number> = {
  not_started: 5,
  started: 20,
  in_progress: 40,
  submitted: 65,
  fee_paid: 75,
  interview: 85,
  waitlisted: 85,
  offer_received: 95,
  rejected: 100,
  completed: 100,
};

export default function StudentApplications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

  const appsQuery = useQuery({
    queryKey: ["student-applications", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Joined[]> => {
      const { data, error } = await supabase
        .from("student_applications")
        .select("*, tracker:application_trackers(*)")
        .eq("user_id", user!.id)
        .order("last_activity_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Joined[];
    },
  });

  const activityQuery = useQuery({
    queryKey: ["student-application-activity", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from("application_activity")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
  });

  const apps = useMemo(() => appsQuery.data ?? [], [appsQuery.data]);

  const stats = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    let fees = 0;
    let upcoming = 0;
    for (const a of apps) {
      if (["started", "in_progress"].includes(a.status)) inProgress += 1;
      if (["submitted", "completed", "offer_received", "fee_paid"].includes(a.status)) completed += 1;
      if (a.fee_paid) fees += Number(a.fee_amount ?? a.tracker?.application_fee ?? 0);
      const days = a.tracker ? deadlineInfo(a.tracker).daysLeft : null;
      if (days !== null && days >= 0 && days <= 15) upcoming += 1;
    }
    return { total: apps.length, inProgress, completed, fees, upcoming };
  }, [apps]);

  const updateStatus = async (row: Joined, status: string) => {
    setSavingId(row.id);
    const patch: Record<string, unknown> = {
      status,
      last_activity_at: new Date().toISOString(),
    };
    if (status === "fee_paid") patch["fee_paid"] = true;
    if (["submitted", "completed"].includes(status)) patch["submitted_at"] = new Date().toISOString();
    const { error } = await supabase.from("student_applications").update(patch as never).eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
      return;
    }
    if (user) {
      void logApplicationActivity({
        userId: user.id,
        activityType: "status_change",
        trackerId: row.tracker_id,
        trackerName: row.tracker?.name ?? null,
        studentEmail: user.email ?? null,
        studentName: (user.user_metadata?.["display_name"] as string | undefined) ?? null,
        metadata: { status },
      });
    }
    toast({ title: "Status updated", description: `${row.tracker?.name ?? "Application"} → ${statusLabel(status)}` });
    void queryClient.invalidateQueries({ queryKey: ["student-applications", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["student-application-activity", user?.id] });
  };

  const summaryCards = [
    { label: "Total applications", value: stats.total, icon: ClipboardList },
    { label: "In progress", value: stats.inProgress, icon: Loader2 },
    { label: "Submitted / completed", value: stats.completed, icon: CheckCircle2 },
    { label: "Deadlines in 15 days", value: stats.upcoming, icon: CalendarClock },
    { label: "Application fees recorded", value: formatFee(stats.fees), icon: IndianRupee },
  ];

  return (
    <div className="student-applications-page space-y-6">
      <header className="student-page-heading">
        <div className="student-eyebrow">Admissions workspace</div>
        <h1 className="text-2xl font-semibold text-foreground">My Applications</h1>
        <p className="text-sm text-muted-foreground">
          Every college and exam application you have started, with live deadlines and status tracking.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <c.icon className="h-4 w-4 text-primary" />
                {c.label}
              </div>
              <p className="pt-1 text-[1.375rem] font-semibold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Applications</CardTitle>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/my-mba-2027">
              Browse tracker <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {appsQuery.isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : apps.length === 0 ? (
            <div className="space-y-3 py-10 text-center">
              <p className="text-base font-medium text-foreground">You haven’t started any applications yet</p>
              <p className="text-sm text-muted-foreground">
                Open the application tracker and hit Apply Now — we’ll track it here automatically.
              </p>
              <Button asChild>
                <Link to="/my-mba-2027">Explore applications</Link>
              </Button>
            </div>
          ) : (
            apps.map((row) => {
              const info = row.tracker ? deadlineInfo(row.tracker) : null;
              const applyUrl = row.tracker ? buildApplyUrl(row.tracker) : null;
              return (
                <div key={row.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{row.tracker?.name ?? "College"}</p>
                      <p className="text-sm text-muted-foreground">
                        Deadline {formatDate(row.tracker?.application_deadline ?? null)} · Fee{" "}
                        {formatFee(row.fee_amount ?? row.tracker?.application_fee ?? null)}
                        {row.fee_paid ? " · Fee paid" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {info && <Badge variant="outline">{info.label}</Badge>}
                      <Select value={row.status} onValueChange={(v) => void updateStatus(row, v)}>
                        <SelectTrigger className="h-9 w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APPLICATION_STATUSES.map((s) => (
                            <SelectItem key={s.key} value={s.key}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {applyUrl && (
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                            Continue <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-3">
                    <Progress value={STATUS_PROGRESS[row.status] ?? 10} className="h-2" />
                    <span className="whitespace-nowrap text-sm text-muted-foreground">
                      {savingId === row.id ? "Saving…" : statusLabel(row.status)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" /> Application activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityQuery.isLoading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : (activityQuery.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {(activityQuery.data ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="text-foreground">
                    {activityLabel(a.activity_type)}
                    {a.tracker_name ? ` — ${a.tracker_name}` : ""}
                  </span>
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
