import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Clock, CheckCircle2, Play, Trophy, FileText, ShoppingBag, Calendar, Rocket, Sparkles } from "lucide-react";

const SERIES = ["CAT", "XAT", "SNAP", "NMAT", "IIFT", "CMAT", "TISSNET"];

export default function StudentMocks() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: e }, { data: a }] = await Promise.all([
        supabase.from("mock_enrollments")
          .select("id, test_id, source, expires_at, enrolled_at, admin_notes, test:mock_tests(name, slug, total_duration_minutes, difficulty, exam_code, category, is_live, scheduled_start_at, launch_date, banner_url)")
          .eq("user_id", user.id).order("enrolled_at", { ascending: false }),
        supabase.from("mock_attempts")
          .select("id, test_id, status, started_at, submitted_at, total_score, max_score, percentile, total_correct, total_attempted, test:mock_tests(name, slug)")
          .eq("user_id", user.id).order("started_at", { ascending: false }),
      ]);
      setEnrollments(e ?? []);
      setAttempts(a ?? []);
      setLoading(false);
    })();
  }, [user]);

  const items = useMemo(() => {
    return enrollments.map((e) => {
      const myAttempts = attempts.filter((a) => a.test_id === e.test_id);
      const inProgress = myAttempts.find((a) => a.status === "in_progress");
      const completed = myAttempts.find((a) => a.status === "submitted" || a.status === "auto_submitted");
      return { ...e, inProgress, completed, attemptCount: myAttempts.length };
    });
  }, [enrollments, attempts]);

  const filtered = items.filter((i) => !q || i.test?.name?.toLowerCase().includes(q.toLowerCase()));

  // Status buckets
  const now = Date.now();
  const launched = filtered.filter((i) => {
    const start = i.test?.scheduled_start_at ? new Date(i.test.scheduled_start_at).getTime() : null;
    return i.test?.is_live === true || (start && start <= now);
  });
  const scheduled = filtered.filter((i) => {
    const start = i.test?.scheduled_start_at ? new Date(i.test.scheduled_start_at).getTime() : null;
    return start && start > now && start - now <= 7 * 24 * 3600 * 1000;
  });
  const upcoming = filtered.filter((i) => {
    const start = i.test?.scheduled_start_at ? new Date(i.test.scheduled_start_at).getTime() : null;
    return start && start - now > 7 * 24 * 3600 * 1000;
  });

  // Series buckets
  const seriesMap: Record<string, any[]> = {};
  for (const s of SERIES) seriesMap[s] = [];
  for (const i of filtered) {
    const code = (i.test?.exam_code || i.test?.category || "").toString().toUpperCase();
    const matched = SERIES.find((s) => code.includes(s));
    if (matched) seriesMap[matched].push(i);
  }

  if (loading) return <div className="text-muted-foreground">Loading mocks…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My Mocks</h1>
          <p className="text-sm text-muted-foreground">All mocks assigned or purchased — sorted by status and series.</p>
        </div>
        <Link to="/student/buy-mocks">
          <Button className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Buy More Mocks
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mocks…" className="pl-9" />
        </div>
      </div>

      <Tabs defaultValue="launched">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="launched"><Rocket className="h-3 w-3 mr-1" /> Launched ({launched.length})</TabsTrigger>
          <TabsTrigger value="scheduled"><Calendar className="h-3 w-3 mr-1" /> Scheduled ({scheduled.length})</TabsTrigger>
          <TabsTrigger value="upcoming"><Sparkles className="h-3 w-3 mr-1" /> Upcoming ({upcoming.length})</TabsTrigger>
          {SERIES.map((s) => (
            <TabsTrigger key={s} value={s}>{s} ({seriesMap[s].length})</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="launched" className="mt-4">
          <BucketGrid items={launched} emptyKey="launched" />
        </TabsContent>
        <TabsContent value="scheduled" className="mt-4">
          <BucketGrid items={scheduled} emptyKey="scheduled" />
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4">
          <BucketGrid items={upcoming} emptyKey="upcoming" />
        </TabsContent>
        {SERIES.map((s) => (
          <TabsContent key={s} value={s} className="mt-4">
            <BucketGrid items={seriesMap[s]} emptyKey={s} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function BucketGrid({ items, emptyKey }: { items: any[]; emptyKey: string }) {
  if (!items.length) {
    const label = ["CAT", "XAT", "SNAP", "NMAT", "IIFT", "CMAT", "TISSNET"].includes(emptyKey)
      ? `You don't own any ${emptyKey} mocks yet.`
      : `No ${emptyKey} mocks right now.`;
    return (
      <Card className="p-8 text-center">
        <ShoppingBag className="h-8 w-8 text-sky-500 mx-auto mb-3" />
        <div className="font-medium">{label}</div>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Browse our mock catalog and add a series to your dashboard.
        </p>
        <Link to="/student/buy-mocks">
          <Button className="gap-2"><ShoppingBag className="h-4 w-4" /> Buy Mocks</Button>
        </Link>
      </Card>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((i) => (
        <Card key={i.id} className="p-4 hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="font-semibold leading-tight">{i.test?.name ?? "Mock"}</div>
            {i.source === "admin" && <Badge variant="secondary" className="shrink-0 text-[10px]">Assigned</Badge>}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
            {i.test?.exam_code && <div>{i.test.exam_code}</div>}
            <div>{i.test?.total_duration_minutes ?? "—"} min · {i.test?.difficulty ?? "—"}</div>
            {i.test?.scheduled_start_at && (
              <div>Starts {new Date(i.test.scheduled_start_at).toLocaleString()}</div>
            )}
            {i.expires_at && <div>Expires {new Date(i.expires_at).toLocaleDateString()}</div>}
          </div>
          {i.completed && i.completed.total_score != null && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-md p-2 mb-2 text-xs">
              <div className="flex justify-between"><span>Score</span><span className="font-semibold">{i.completed.total_score}/{i.completed.max_score}</span></div>
              <div className="flex justify-between"><span>Percentile</span><span className="font-semibold">{i.completed.percentile ?? 0}</span></div>
            </div>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            {i.inProgress ? (
              <Link to={`/mocks/attempt/${i.inProgress.id}`} className="flex-1">
                <Button size="sm" className="w-full gap-1"><Clock className="h-3 w-3" /> Resume</Button>
              </Link>
            ) : i.completed ? (
              <>
                <Link to={`/mocks/result/${i.completed.id}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full gap-1"><FileText className="h-3 w-3" /> Result</Button>
                </Link>
                <Link to={`/mocks/review/${i.completed.id}`} className="flex-1">
                  <Button size="sm" className="w-full gap-1"><CheckCircle2 className="h-3 w-3" /> Review</Button>
                </Link>
                {i.test?.slug && (
                  <Link to={`/mocks/leaderboard/${i.test.slug}`}>
                    <Button size="sm" variant="ghost"><Trophy className="h-4 w-4" /></Button>
                  </Link>
                )}
              </>
            ) : (
              i.test?.slug && (
                <Link to={`/mocks/${i.test.slug}`} className="flex-1">
                  <Button size="sm" className="w-full gap-1"><Play className="h-3 w-3" /> Start</Button>
                </Link>
              )
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
