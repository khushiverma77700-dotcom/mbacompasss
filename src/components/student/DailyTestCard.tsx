import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight, CheckCircle2, Clock } from "lucide-react";

export default function DailyTestCard() {
  const [today, setToday] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_today_daily_test").then(({ data }) => {
      setToday((data as any[])?.[0] ?? null);
      setLoading(false);
    });
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
            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
              <span className="truncate">{today.test_name}</span>
              {today.exam_code && <Badge variant="outline" className="text-[10px] border-sky-200">{today.exam_code}</Badge>}
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
