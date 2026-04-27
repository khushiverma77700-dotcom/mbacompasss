import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Clock, CheckCircle2, Play, Trophy, FileText } from "lucide-react";

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
        supabase
          .from("mock_enrollments")
          .select("id, test_id, source, expires_at, enrolled_at, admin_notes, test:mock_tests(name, slug, total_duration_minutes, difficulty, exam_code)")
          .eq("user_id", user.id)
          .order("enrolled_at", { ascending: false }),
        supabase
          .from("mock_attempts")
          .select("id, test_id, status, started_at, submitted_at, total_score, max_score, percentile, total_correct, total_attempted, test:mock_tests(name, slug)")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false }),
      ]);
      setEnrollments(e ?? []);
      setAttempts(a ?? []);
      setLoading(false);
    })();
  }, [user]);

  // Group: each enrollment with latest attempt status
  const items = useMemo(() => {
    return enrollments.map((e) => {
      const myAttempts = attempts.filter((a) => a.test_id === e.test_id);
      const inProgress = myAttempts.find((a) => a.status === "in_progress");
      const completed = myAttempts.find((a) => a.status === "submitted" || a.status === "auto_submitted");
      return { ...e, inProgress, completed, attemptCount: myAttempts.length };
    });
  }, [enrollments, attempts]);

  const filtered = items.filter((i) => !q || i.test?.name?.toLowerCase().includes(q.toLowerCase()));
  const notStarted = filtered.filter((i) => !i.inProgress && !i.completed);
  const inProgressList = filtered.filter((i) => i.inProgress);
  const completedList = filtered.filter((i) => i.completed && !i.inProgress);

  if (loading) return <div className="text-muted-foreground">Loading mocks…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Mocks</h1>
        <p className="text-sm text-muted-foreground">All mocks assigned or purchased by you.</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mocks…" className="pl-9" />
        </div>
        <Link to="/mocks">
          <Button variant="outline">Browse all mocks</Button>
        </Link>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="ip">In Progress ({inProgressList.length})</TabsTrigger>
          <TabsTrigger value="ns">Not Started ({notStarted.length})</TabsTrigger>
          <TabsTrigger value="done">Completed ({completedList.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <MockGrid items={filtered} />
        </TabsContent>
        <TabsContent value="ip" className="mt-4"><MockGrid items={inProgressList} /></TabsContent>
        <TabsContent value="ns" className="mt-4"><MockGrid items={notStarted} /></TabsContent>
        <TabsContent value="done" className="mt-4"><MockGrid items={completedList} /></TabsContent>
      </Tabs>

      {filtered.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No mocks yet.{" "}
          <Link to="/mocks" className="text-sky-700 hover:underline">
            Browse the catalog →
          </Link>
        </Card>
      )}
    </div>
  );
}

function MockGrid({ items }: { items: any[] }) {
  if (!items.length)
    return <div className="text-sm text-muted-foreground py-6 text-center">Nothing here yet.</div>;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((i) => (
        <Card key={i.id} className="p-4 hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="font-semibold leading-tight">{i.test?.name ?? "Mock"}</div>
            {i.source === "admin" && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">Assigned</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
            {i.test?.exam_code && <div>{i.test.exam_code}</div>}
            <div>{i.test?.total_duration_minutes ?? "—"} min · {i.test?.difficulty ?? "—"}</div>
            {i.expires_at && <div>Expires {new Date(i.expires_at).toLocaleDateString()}</div>}
            {i.admin_notes && <div className="italic">"{i.admin_notes}"</div>}
          </div>

          {i.completed && i.completed.total_score != null && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-md p-2 mb-2 text-xs">
              <div className="flex justify-between">
                <span>Score</span>
                <span className="font-semibold">{i.completed.total_score}/{i.completed.max_score}</span>
              </div>
              <div className="flex justify-between">
                <span>Percentile</span>
                <span className="font-semibold">{i.completed.percentile ?? 0}</span>
              </div>
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
                  <Button size="sm" variant="outline" className="w-full gap-1">
                    <FileText className="h-3 w-3" /> Result
                  </Button>
                </Link>
                <Link to={`/mocks/review/${i.completed.id}`} className="flex-1">
                  <Button size="sm" className="w-full gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Review
                  </Button>
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
                  <Button size="sm" className="w-full gap-1">
                    <Play className="h-3 w-3" /> Start
                  </Button>
                </Link>
              )
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
