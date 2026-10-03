import { useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { openLoginDialog } from "@/hooks/useCtaGate";
import SiteBreadcrumbs from "@/components/SiteBreadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  Timer,
  Wallet,
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
import { APPLICATION_BASE, APPLICATION_YEAR, collegeUrl } from "@/lib/applicationSeo";
import { buildExpenseBreakdown } from "@/lib/applicationExpenses";
import ExpenseBreakdownView from "@/components/application/ExpenseBreakdown";

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

/**
 * Dedicated public application-tracking portal at
 * /mba-application/my-applications. Deliberately separate from the student LMS
 * dashboard — students who came in through the application tracker stay inside
 * the tracker.
 */
export default function MyApplicationsPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

  const appsQuery = useQuery({
    queryKey: ["portal-applications", user?.id],
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
    queryKey: ["portal-application-activity", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from("application_activity")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
  });

  const apps = useMemo(() => appsQuery.data ?? [], [appsQuery.data]);

  const stats = useMemo(() => {
    let inProgress = 0;
    let submitted = 0;
    let upcoming = 0;
    let feesPaid = 0;
    let applicationStage = 0;
    let projectedTotal = 0;
    for (const a of apps) {
      if (["started", "in_progress"].includes(a.status)) inProgress += 1;
      if (["submitted", "completed", "offer_received", "fee_paid"].includes(a.status)) submitted += 1;
      if (a.fee_paid) feesPaid += Number(a.fee_amount ?? a.tracker?.application_fee ?? 0);
      const days = a.tracker ? deadlineInfo(a.tracker).daysLeft : null;
      if (days !== null && days >= 0 && days <= 15) upcoming += 1;
      if (a.tracker) {
        const breakdown = buildExpenseBreakdown(a.tracker);
        applicationStage += breakdown.applicationStageTotal;
        projectedTotal += breakdown.grandTotal ?? 0;
      }
    }
    return {
      total: apps.length,
      inProgress,
      submitted,
      upcoming,
      feesPaid,
      applicationStage,
      projectedTotal,
    };
  }, [apps]);

  const updateStatus = async (row: Joined, status: string) => {
    setSavingId(row.id);
    const patch: Record<string, unknown> = { status, last_activity_at: new Date().toISOString() };
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
        metadata: { status, source: "application_portal" },
      });
    }
    toast({ title: "Status updated", description: `${row.tracker?.name ?? "Application"} → ${statusLabel(status)}` });
    void queryClient.invalidateQueries({ queryKey: ["portal-applications", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["portal-application-activity", user?.id] });
  };

  const breadcrumbItems = [
    { name: `MBA College & Exam Application ${APPLICATION_YEAR}`, url: APPLICATION_BASE },
    { name: "My applications", url: `${APPLICATION_BASE}/my-applications` },
  ];

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 pb-20 md:p-6">
        <SiteBreadcrumbs items={breadcrumbItems} />
        <Card>
          <CardContent className="space-y-3 p-10 text-center">
            <h1 className="text-[1.375rem] font-semibold text-slate-900">
              Sign in to open your application portal
            </h1>
            <p className="text-sm text-slate-600">
              Your portal keeps every MBA college and exam application you started, with live last
              dates, status and a full expense breakdown.
            </p>
            <div className="flex flex-col justify-center gap-2 pt-1 sm:flex-row">
              <Button onClick={() => openLoginDialog("Sign in to open your MBA application portal.")}>
                Sign in
              </Button>
              <Button asChild variant="outline">
                <Link to={APPLICATION_BASE}>Browse applications</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summaryCards = [
    { label: "Applications tracked", value: String(stats.total), icon: ClipboardList },
    { label: "In progress", value: String(stats.inProgress), icon: Timer },
    { label: "Submitted / completed", value: String(stats.submitted), icon: CheckCircle2 },
    { label: "Last dates in 15 days", value: String(stats.upcoming), icon: CalendarClock },
    { label: "Form fees paid", value: formatFee(stats.feesPaid), icon: IndianRupee },
    { label: "Projected total spend", value: formatFee(stats.projectedTotal), icon: Wallet },
  ];

  return (
    <div className="application-directory min-h-screen">
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-20 md:p-6">
      <SiteBreadcrumbs items={breadcrumbItems} />

      <header className="space-y-3 rounded-lg border border-application-line bg-application-panel p-6 shadow-sm md:p-8">
        <div aria-hidden className="pointer-events-none" />
        <h1 className="text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
          My MBA applications {APPLICATION_YEAR}
        </h1>
        <p className="max-w-3xl text-base text-slate-600">
          Every college and exam form you started, with live last dates, the stage you are at and a
          detailed breakdown of what each application will cost you.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="gap-1.5">
            <Link to={APPLICATION_BASE}>
              Add another application <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <c.icon className="h-4 w-4 text-sky-600" />
              {c.label}
            </div>
            <p className="pt-1 text-base font-semibold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <section aria-label="Tracked applications" className="space-y-3">
        <h2 className="text-[1.375rem] font-semibold text-slate-900">Applications</h2>
        {appsQuery.isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : appsQuery.isError ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-600">
              We could not load your applications right now. Please refresh the page.
            </CardContent>
          </Card>
        ) : apps.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 p-10 text-center">
              <p className="text-base font-medium text-slate-900">No applications tracked yet</p>
              <p className="text-sm text-slate-600">
                Hit Apply Now on any college or exam and it appears here automatically.
              </p>
              <Button asChild>
                <Link to={APPLICATION_BASE}>Browse MBA applications</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          apps.map((row) => {
            const tracker = row.tracker;
            const info = tracker ? deadlineInfo(tracker) : null;
            const applyUrl = tracker ? buildApplyUrl(tracker) : null;
            const breakdown = tracker ? buildExpenseBreakdown(tracker) : null;
            return (
              <article key={row.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">
                      {tracker ? (
                        <Link to={collegeUrl(tracker)} className="hover:text-sky-700">
                          {tracker.name}
                        </Link>
                      ) : (
                        "College"
                      )}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Last date {formatDate(tracker?.application_deadline ?? null)} · Form fee{" "}
                      {formatFee(row.fee_amount ?? tracker?.application_fee ?? null)}
                      {row.fee_paid ? " · Fee paid" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {info && <Badge variant="outline">{info.label}</Badge>}
                    <Select value={row.status} onValueChange={(v) => void updateStatus(row, v)}>
                      <SelectTrigger className="h-9 w-[210px]">
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
                          Continue form <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Progress value={STATUS_PROGRESS[row.status] ?? 10} className="h-2" />
                  <span className="whitespace-nowrap text-sm text-slate-500">
                    {savingId === row.id ? "Saving…" : statusLabel(row.status)}
                  </span>
                </div>

                {breakdown && tracker && (
                  <ExpenseBreakdownView name={tracker.name} breakdown={breakdown} compact />
                )}
              </article>
            );
          })
        )}
      </section>

      <section aria-label="Application activity" className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-[1.375rem] font-semibold text-slate-900">
          <History className="h-4 w-4 text-sky-600" /> Activity log
        </h2>
        {activityQuery.isLoading ? (
          <Skeleton className="mt-3 h-32 w-full rounded-xl" />
        ) : (activityQuery.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-2 pt-3">
            {(activityQuery.data ?? []).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span className="text-slate-900">
                  {activityLabel(a.activity_type)}
                  {a.tracker_name ? ` — ${a.tracker_name}` : ""}
                </span>
                <span className="text-slate-500">{new Date(a.created_at).toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
    </div>
  );
}
