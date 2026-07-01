import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsDemo } from "@/contexts/DemoModeContext";
import { DEMO_REWARDS } from "@/lib/demoData";
import { Card } from "@/components/ui/card";
import { Coins, Flame, Trophy, Star, Award, Zap, Target, BookOpenCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

import SectionSkeleton from "@/components/student/SectionSkeleton";
interface Rewards {
  coins: number; xp: number; level: number;
  streak_days: number; longest_streak: number;
  total_mocks_completed: number;
}
interface Badge { id: string; badge_key: string; badge_name: string; badge_description: string | null; earned_at: string; }

const ALL_BADGES = [
  { key: "first_mock", name: "First Step", desc: "Completed first mock", icon: BookOpenCheck },
  { key: "streak_7", name: "7-Day Streak", desc: "Practised 7 days in a row", icon: Flame },
  { key: "streak_30", name: "Iron Will", desc: "30-day streak", icon: Flame },
  { key: "score_90", name: "90+ Percentile", desc: "Hit 90 percentile in any mock", icon: Trophy },
  { key: "score_99", name: "Elite Aspirant", desc: "Hit 99 percentile", icon: Star },
  { key: "mocks_10", name: "Consistent", desc: "10 mocks completed", icon: Target },
  { key: "mocks_25", name: "Marathoner", desc: "25 mocks completed", icon: Award },
  { key: "fast_solver", name: "Speedster", desc: "Completed mock under 75% time", icon: Zap },
];

export default function StudentRewards() {
  const { user } = useAuth();
  const isDemo = useIsDemo();
  const [rewards, setRewards] = useState<Rewards | null>(() => isDemo ? ({ ...DEMO_REWARDS, total_mocks_completed: 8 } as Rewards) : null);
  const [badges, setBadges] = useState<Badge[]>(() => isDemo ? [
    { id: "demo-b1", badge_key: "first_mock", badge_name: "First Step", badge_description: null, earned_at: new Date().toISOString() },
    { id: "demo-b2", badge_key: "streak_7", badge_name: "7-Day Streak", badge_description: null, earned_at: new Date().toISOString() },
    { id: "demo-b3", badge_key: "score_90", badge_name: "90+ Percentile", badge_description: null, earned_at: new Date().toISOString() },
    { id: "demo-b4", badge_key: "mocks_10", badge_name: "Consistent", badge_description: null, earned_at: new Date().toISOString() },
  ] : []);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) {
      setRewards({ ...DEMO_REWARDS, total_mocks_completed: 8 } as Rewards);
      setBadges([
        { id: "demo-b1", badge_key: "first_mock", badge_name: "First Step", badge_description: null, earned_at: new Date().toISOString() },
        { id: "demo-b2", badge_key: "streak_7", badge_name: "7-Day Streak", badge_description: null, earned_at: new Date().toISOString() },
        { id: "demo-b3", badge_key: "score_90", badge_name: "90+ Percentile", badge_description: null, earned_at: new Date().toISOString() },
        { id: "demo-b4", badge_key: "mocks_10", badge_name: "Consistent", badge_description: null, earned_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }
    if (!user) return;
    (async () => {
      const [{ data: r }, { data: b }] = await Promise.all([
        supabase.from("student_rewards").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_badges").select("*").eq("user_id", user.id).order("earned_at", { ascending: false }),
      ]);
      setRewards(r as any);
      setBadges((b ?? []) as any);
      setLoading(false);
    })();
  }, [user, isDemo]);

  const xp = rewards?.xp ?? 0;
  const level = rewards?.level ?? 1;
  const xpForNext = level * 500;
  const progressPct = Math.min(100, ((xp % 500) / 500) * 100);

  if (loading && !isDemo) return <SectionSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rewards & Achievements</h1>
        <p className="text-sm text-muted-foreground mt-1">Stay consistent — earn coins, climb levels, unlock badges.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Coins className="h-5 w-5 text-amber-500" />} label="Coins" value={rewards?.coins ?? 0} sub="Spend on mocks" />
        <StatCard icon={<Zap className="h-5 w-5 text-sky-500" />} label="XP" value={xp} sub={`${xp % 500} / 500 to next level`} />
        <StatCard icon={<Trophy className="h-5 w-5 text-purple-500" />} label="Level" value={level} sub="Keep grinding" />
        <StatCard icon={<Flame className="h-5 w-5 text-orange-500" />} label="Streak" value={`${rewards?.streak_days ?? 0}d`} sub={`Longest: ${rewards?.longest_streak ?? 0}d`} />
      </div>

      <Card className="p-5 border-sky-100">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-gray-900">Level {level} progress</div>
          <div className="text-sm text-muted-foreground">{xp % 500}/500 XP</div>
        </div>
        <Progress value={progressPct} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2">Earn 100 XP per submitted mock + 25 XP per daily task completed.</p>
      </Card>

      <Card className="p-5 border-sky-100">
        <div className="font-semibold text-gray-900 mb-4">Badges</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_BADGES.map(b => {
            const earned = badges.find(x => x.badge_key === b.key);
            const Icon = b.icon;
            return (
              <div key={b.key} className={`p-4 rounded-xl border text-center transition-all ${earned ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm" : "bg-gray-50/60 border-gray-200 opacity-60"}`}>
                <Icon className={`h-8 w-8 mx-auto mb-2 ${earned ? "text-amber-600" : "text-gray-400"}`} />
                <div className="text-sm font-semibold text-gray-900">{b.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{b.desc}</div>
                {earned ? (
                  <div className="text-[10px] text-amber-700 mt-2 font-medium">Earned</div>
                ) : (
                  <div className="text-[10px] text-gray-500 mt-2">Locked</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: any; sub: string }) {
  return (
    <Card className="p-4 border-sky-100">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </Card>
  );
}
