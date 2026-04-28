import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight, CheckCircle2, Clock, ListChecks, Gauge } from "lucide-react";

export default function DailyTestCard() {
  const [today, setToday] = useState<any>(null);
  const [meta, setMeta] = useState<{ qCount: number; difficulty: string | null }>({ qCount: 0, difficulty: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_today_daily_test");
      const t = (data as any[])?.[0] ?? null;
      setToday(t);
      if (t?.test_id) {
        const [{ data: secs }, { data: m }] = await Promise.all([
          supabase.from("mock_sections").select("total_questions").eq("test_id", t.test_id),
          supabase.from("mock_tests").select("difficulty").eq("id", t.test_id).maybeSingle(),
        ]);
        const q = (secs ?? []).reduce((acc: number, s: any) => acc + (s.total_questions || 0), 0);
        setMeta({ qCount: q, difficulty: (m as any)?.difficulty ?? null });
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !today) return null;
  const done = !!today.completed_at;

  return (
    <Card className="p-5 border-sky-200 bg-gradient-to-r from-sky-50 via-white to-blue-50">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shrink-0">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-sky-700 font-semibold uppercase tracking-wider">Daily test</div>
            <div className="font-semibold truncate">{today.title}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
              {meta.qCount > 0 && (
                <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{meta.qCount} questions</span>
              )}
              {meta.difficulty && (
                <Badge variant="outline" className="text-[10px] border-sky-200 capitalize gap-1">
                  <Gauge className="h-3 w-3" /> {meta.difficulty}
                </Badge>
              )}
              {today.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{today.duration} min</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {done ? (
            <>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Done today</Badge>
              <Link to="/student/daily-test"><Button size="sm" variant="outline">View</Button></Link>
            </>
          ) : (
            <Link to={`/mocks/${today.test_slug}`}>
              <Button size="sm" className="gap-1 bg-sky-600 hover:bg-sky-700">Start now <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
