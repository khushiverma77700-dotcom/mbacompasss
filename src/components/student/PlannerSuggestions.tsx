import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, ArrowRight, FileText, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { todayStr } from "@/lib/plannerRecurrence";

interface Suggestion {
  key: string;
  title: string;
  hint: string;
  cta: string;
  icon: any;
  to: string;
  linked_action: string;
  linked_ref?: string;
  category: string;
  estimated_minutes: number;
}

interface Props {
  /** Title of tasks already on today's plan — used to dedupe suggestions. */
  existingTitles: string[];
  onAdded: () => void;
}

/**
 * Smart suggestions strip — surfaces 1–3 contextual cards that connect the
 * planner to live platform data (today's daily test, mocks not attempted).
 */
export default function PlannerSuggestions({ existingTitles, onAdded }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const out: Suggestion[] = [];

      // 1. Today's daily test, if scheduled & not yet completed
      const { data: dt } = await supabase.rpc("get_today_daily_test");
      const today = (dt as any[])?.[0];
      if (today && !today.completed_at && today.test_slug) {
        out.push({
          key: `daily:${today.test_id}`,
          title: `Daily Test — ${today.title || today.test_name}`,
          hint: "Today's mentor-picked mock is waiting",
          cta: "Start now",
          icon: FileText,
          to: `/mocks/${today.test_slug}`,
          linked_action: "daily_test",
          linked_ref: today.test_slug,
          category: "mock",
          estimated_minutes: today.duration ?? 30,
        });
      }

      // 2. Last unfinished mock attempt
      const { data: openAttempt } = await supabase
        .from("mock_attempts")
        .select("id, status, test:mock_tests(name, slug, total_duration_minutes)")
        .eq("user_id", user.id)
        .in("status", ["in_progress"])
        .order("started_at", { ascending: false })
        .limit(1);
      const att = (openAttempt as any[])?.[0];
      if (att?.test?.slug) {
        out.push({
          key: `resume:${att.id}`,
          title: `Resume mock — ${att.test.name}`,
          hint: "You have an unfinished mock attempt",
          cta: "Resume",
          icon: ArrowRight,
          to: `/mocks/attempt/${att.id}`,
          linked_action: `mock`,
          linked_ref: att.test.slug,
          category: "mock",
          estimated_minutes: att.test.total_duration_minutes ?? 60,
        });
      }

      // 3. Personalized hub if user hasn't used it today
      const { data: hubCount } = await supabase.rpc("personalized_hub_today_count", { _user_id: user.id });
      if ((hubCount ?? 0) === 0) {
        out.push({
          key: "hub:today",
          title: "Personalized Hub session",
          hint: "AI-picked questions on your weak topics",
          cta: "Open hub",
          icon: Brain,
          to: "/student/personalized-hub",
          linked_action: "personalized_hub",
          category: "custom",
          estimated_minutes: 20,
        });
      }

      // dedupe vs existing today titles
      const lc = new Set(existingTitles.map((t) => t.toLowerCase()));
      setItems(out.filter((s) => !lc.has(s.title.toLowerCase())).slice(0, 3));
    })();
  }, [user, existingTitles.join("|")]);

  const addAsTask = async (s: Suggestion) => {
    if (!user) return;
    const { error } = await supabase.from("student_planner_tasks").insert({
      user_id: user.id,
      title: s.title,
      description: s.hint,
      category: s.category,
      priority: "high",
      scheduled_date: todayStr(),
      estimated_minutes: s.estimated_minutes,
      status: "pending",
      auto_rollover: true,
      original_date: todayStr(),
      linked_action: s.linked_action,
      linked_ref: s.linked_ref ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Added to today's plan");
    onAdded();
  };

  if (items.length === 0) return null;

  return (
    <Card className="p-4 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50/50 dark:from-sky-500/10 dark:to-blue-500/5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold">Recommended for you today</div>
          <div className="text-xs text-muted-foreground">Tap to add to your plan or jump straight in.</div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className="group relative rounded-lg border border-border bg-card p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-md bg-sky-500/10 grid place-items-center shrink-0">
                  <Icon className="h-4 w-4 text-sky-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{s.hint}</div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2">
                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] flex-1" onClick={() => addAsTask(s)}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
                <Link to={s.to} className="flex-1">
                  <Button size="sm" className="h-7 px-2 text-[11px] w-full bg-sky-600 hover:bg-sky-700">
                    {s.cta} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
