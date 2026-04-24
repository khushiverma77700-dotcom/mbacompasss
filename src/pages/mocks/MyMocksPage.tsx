import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, BookOpen, BarChart3, Bookmark } from "lucide-react";

interface Enrollment {
  id: string;
  test_id: string;
  source: string;
  expires_at: string | null;
  test: { name: string; slug: string; total_duration_minutes: number; pricing_type: string } | null;
}
interface Attempt {
  id: string;
  test_id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  total_score: number | null;
  max_score: number | null;
  percentile: number | null;
  total_correct: number | null;
  total_attempted: number | null;
  test: { name: string; slug: string } | null;
}

export default function MyMocksPage() {
  const { user, loading: authLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const [{ data: enrolls }, { data: atts }, { data: bms }] = await Promise.all([
        supabase
          .from("mock_enrollments")
          .select("id, test_id, source, expires_at, test:mock_tests(name, slug, total_duration_minutes, pricing_type)")
          .eq("user_id", user.id)
          .order("enrolled_at", { ascending: false }),
        supabase
          .from("mock_attempts")
          .select("id, test_id, status, started_at, submitted_at, total_score, max_score, percentile, total_correct, total_attempted, test:mock_tests(name, slug)")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false }),
        supabase
          .from("mock_bookmarks")
          .select("id, question_id, notes, created_at, question:mock_questions(question_html, section_id, section:mock_sections(name, code, test_id, test:mock_tests(name, slug)))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setEnrollments((enrolls ?? []) as any);
      setAttempts((atts ?? []) as any);
      setBookmarks(bms ?? []);
      setLoading(false);
    })();
  }, [authLoading, user]);

  if (authLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <div className="container mx-auto p-8 max-w-md text-center">
        <p className="mb-4">Please sign in to view your mocks.</p>
        <Link to="/auth"><Button>Sign In</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">My Mocks</h1>
        <p className="text-muted-foreground mt-1">Your enrollments, attempts & bookmarks.</p>
      </header>

      <Tabs defaultValue="attempts">
        <TabsList>
          <TabsTrigger value="attempts"><BarChart3 className="h-4 w-4 mr-1" />Attempts</TabsTrigger>
          <TabsTrigger value="enrollments"><BookOpen className="h-4 w-4 mr-1" />Enrolled Mocks</TabsTrigger>
          <TabsTrigger value="bookmarks"><Bookmark className="h-4 w-4 mr-1" />Bookmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="attempts" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : attempts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No attempts yet. <Link className="text-primary" to="/mocks">Browse mocks →</Link></Card>
          ) : (
            <div className="space-y-3">
              {attempts.map((a) => (
                <Card key={a.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="font-semibold">{a.test?.name ?? "Unknown test"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Started {new Date(a.started_at).toLocaleString()}
                      {a.submitted_at && <> · Submitted {new Date(a.submitted_at).toLocaleString()}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={a.status} />
                    {a.status !== "in_progress" && (
                      <div className="text-right text-sm">
                        <div className="font-semibold">{a.total_score ?? 0} / {a.max_score ?? 0}</div>
                        <div className="text-xs text-muted-foreground">
                          %ile {a.percentile ?? 0} · {a.total_correct}/{a.total_attempted} correct
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {a.status === "in_progress" ? (
                        <Link to={`/mocks/attempt/${a.id}`}><Button size="sm">Resume</Button></Link>
                      ) : (
                        <>
                          <Link to={`/mocks/result/${a.id}`}><Button size="sm" variant="outline">Result</Button></Link>
                          <Link to={`/mocks/review/${a.id}`}><Button size="sm">Review</Button></Link>
                          {a.test?.slug && <Link to={`/mocks/leaderboard/${a.test.slug}`}><Button size="sm" variant="ghost"><Trophy className="h-4 w-4" /></Button></Link>}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : enrollments.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No enrollments yet.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {enrollments.map((e) => (
                <Card key={e.id} className="p-4">
                  <div className="font-semibold">{e.test?.name ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {e.test?.total_duration_minutes} min · {e.source}
                    {e.expires_at && <> · expires {new Date(e.expires_at).toLocaleDateString()}</>}
                  </div>
                  {e.test?.slug && (
                    <Link to={`/mocks/${e.test.slug}`} className="block mt-3">
                      <Button size="sm" className="w-full">Open</Button>
                    </Link>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookmarks" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : bookmarks.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No bookmarked questions.</Card>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((b: any) => (
                <Card key={b.id} className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">
                    {b.question?.section?.test?.name} · {b.question?.section?.code}
                  </div>
                  <div
                    className="prose prose-sm max-w-none line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: b.question?.question_html ?? "" }}
                  />
                  {b.notes && <div className="mt-2 text-sm italic text-muted-foreground">"{b.notes}"</div>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: any; label: string }> = {
    in_progress: { variant: "default", label: "In Progress" },
    submitted: { variant: "secondary", label: "Submitted" },
    auto_submitted: { variant: "destructive", label: "Auto-submitted" },
    abandoned: { variant: "outline", label: "Abandoned" },
  };
  const cfg = map[status] ?? { variant: "outline", label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
