import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BarChart3, BookCheck, Target } from "lucide-react";

export default function StudentVocabularyAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  document.title = "Vocabulary Analytics | MBA Compass";

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [progress, attempts, streak] = await Promise.all([
        supabase.from("vocab_progress").select("mastery").eq("user_id", user.id),
        supabase.from("vocab_quiz_attempts").select("is_correct, quiz_type, created_at").eq("user_id", user.id),
        supabase.from("vocab_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      const total = progress.data?.length || 0;
      const learned = progress.data?.filter((p) => (p.mastery || 0) >= 3).length || 0;
      const totalAttempts = attempts.data?.length || 0;
      const correctAttempts = attempts.data?.filter((a) => a.is_correct).length || 0;
      const accuracy = totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
      const mastered = progress.data?.filter((p) => (p.mastery || 0) >= 5).length || 0;

      setStats({ total, learned, mastered, totalAttempts, correctAttempts, accuracy, streak: streak.data });
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto my-10" />;

  return (
    <div className="space-y-5 pb-20">
      <div>
        <Link to="/student/vocabulary" className="text-sm text-muted-foreground hover:text-foreground">← Vocabulary Hub</Link>
        <h1 className="font-heading text-2xl font-bold text-foreground mt-1 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> My Vocabulary Analytics
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BookCheck} label="Words seen" value={stats.total} />
        <StatCard icon={BookCheck} label="Words learned" value={stats.learned} hint="Mastery ≥ 3" />
        <StatCard icon={Target} label="Quiz accuracy" value={`${stats.accuracy}%`} hint={`${stats.correctAttempts}/${stats.totalAttempts}`} />
        <StatCard icon={BarChart3} label="Mastered" value={stats.mastered} hint="Mastery 5/5" />
      </div>

      {stats.streak && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-semibold text-foreground mb-3">Streak & XP</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-2xl font-bold text-primary">{stats.streak.current_streak || 0}</p><p className="text-xs text-muted-foreground">Current streak</p></div>
              <div><p className="text-2xl font-bold text-primary">{stats.streak.longest_streak || 0}</p><p className="text-xs text-muted-foreground">Longest streak</p></div>
              <div><p className="text-2xl font-bold text-primary">{stats.streak.total_xp || 0}</p><p className="text-xs text-muted-foreground">Total XP</p></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: any) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="w-4 h-4" /> {label}</div>
        <div className="font-heading font-bold text-xl text-foreground mt-1">{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
