import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Lock, Users, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ensureStudentMode, mockResultPath } from "@/lib/studentModeNav";

type Attempt = {
  id: string;
  test_id: string;
  total_score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  test?: { name?: string; exam_code?: string } | null;
};

type RankResult = {
  locked: boolean;
  unlocks_at?: string;
  projected_air?: number;
  air_bucket?: string;
  projected_percentile?: number;
  students_ahead?: number;
  students_behind?: number;
  topper_score?: number;
  difficulty?: string;
  sectional?: Record<string, any>;
  pool_size?: number;
  real_pool_size?: number;
};

function fmtCountdown(target: string) {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "Unlocking…";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function AttemptRow({ attempt }: { attempt: Attempt }) {
  const [data, setData] = useState<RankResult | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: res } = await supabase.functions.invoke("projected-air", {
        body: { attempt_id: attempt.id },
      });
      if (alive) setData((res as RankResult) ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [attempt.id]);

  const submittedFmt = attempt.submitted_at
    ? new Date(attempt.submitted_at).toLocaleDateString()
    : "—";

  if (!data) {
    return (
      <Card className="p-4">
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

  if (data.locked) {
    return (
      <Card className="p-4 border-sky-100 bg-gradient-to-br from-white to-sky-50/40">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-semibold truncate">{attempt.test?.name ?? "Mock"}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Submitted {submittedFmt} · Score {attempt.total_score ?? 0}/{attempt.max_score ?? 0}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sky-700">
            <Lock className="h-4 w-4" />
            <div className="text-sm font-semibold">
              Unlocks in {data.unlocks_at ? fmtCountdown(data.unlocks_at) : "7 days"}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          All India Rank is calculated 7 days after submission, once the national benchmark pool is finalized.
        </p>
      </Card>
    );
  }

  const sectional = data.sectional ?? {};
  const sectionalEntries = Object.entries(sectional);

  return (
    <Card className="p-4 border-sky-100">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold truncate">{attempt.test?.name ?? "Mock"}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Submitted {submittedFmt} · Score {attempt.total_score ?? 0}/{attempt.max_score ?? 0} · {data.difficulty}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Projected AIR</div>
          <div className="text-xl font-bold text-sky-700">{data.air_bucket}</div>
          <div className="text-[10px] text-muted-foreground">of {data.pool_size?.toLocaleString()} aspirants</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
        <Stat label="Est. Percentile" value={`${data.projected_percentile?.toFixed(1)}%`} />
        <Stat label="Students Ahead" value={(data.students_ahead ?? 0).toLocaleString()} />
        <Stat label="Students Behind" value={(data.students_behind ?? 0).toLocaleString()} />
        <Stat
          label="Gap from Topper"
          value={`${Math.max(0, Number(data.topper_score ?? 0) - Number(attempt.total_score ?? 0)).toFixed(0)} marks`}
        />
      </div>

      {sectionalEntries.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] text-sky-700 hover:underline inline-flex items-center gap-1"
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Sectional Projected AIR
          </button>
          {open && (
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {sectionalEntries.map(([k, v]: any) => (
                <div key={k} className="rounded border border-sky-100 bg-sky-50/40 p-2">
                  <div className="text-[11px] font-semibold text-sky-800">{v.section ?? k}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {v.air_bucket} · {v.projected_percentile?.toFixed(1)}% · {v.difficulty}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border/40">
        <Badge variant="secondary" className="text-[10px]">
          Based on projected benchmarking from {data.pool_size?.toLocaleString()}+ aspirants
        </Badge>
        <Link
          to={mockResultPath(attempt.id)}
          onClick={ensureStudentMode}
          onPointerDown={ensureStudentMode}
          className="text-[11px] text-sky-700 hover:underline"
        >
          View full report →
        </Link>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-sky-100 bg-white p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

export default function AllIndiaRankTab({ attempts }: { attempts: Attempt[] }) {
  const sorted = useMemo(
    () =>
      attempts
        .filter((a) => !!a.submitted_at)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.submitted_at!).getTime() -
            new Date(a.submitted_at!).getTime()
        ),
    [attempts]
  );

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-br from-sky-50 via-white to-white border-sky-200">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-700" />
          <h3 className="font-semibold text-sm">AI-Powered National Ranking Engine</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Your Projected All India Rank is benchmarked against a 2,000-aspirant national pool. Rankings are released
          7 days after each mock submission to ensure the cohort is finalized.
        </p>
      </Card>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="h-6 w-6 mx-auto text-sky-600 mb-2" />
          <div className="text-sm font-semibold">No submitted mocks yet</div>
          <p className="text-xs text-muted-foreground mt-1">
            Submit a mock to unlock your Projected All India Rank in 7 days.
          </p>
        </Card>
      ) : (
        sorted.map((a) => <AttemptRow key={a.id} attempt={a} />)
      )}

      <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center pt-2">
        <Users className="h-3 w-3" /> Projected ranks use a stable, seeded benchmark — values do not change on refresh.
      </div>
    </div>
  );
}
