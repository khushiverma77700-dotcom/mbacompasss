// Projected AIR engine — computes a stable, synthetic-population-based
// All India Rank for a given mock attempt. Unlocks 7 days after submission.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TARGET_POOL = 2000;
const UNLOCK_DAYS = 7;
const AIR_BUCKET = 50;

// Seeded RNG so that for a given (test_id) the synthetic distribution is identical
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function gaussian(rand: () => number, mean: number, std: number) {
  const u = Math.max(1e-9, rand());
  const v = Math.max(1e-9, rand());
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * std;
}
function difficultyLabel(d: number) {
  if (d >= 0.65) return "Easy";
  if (d >= 0.45) return "Moderate";
  if (d >= 0.3) return "Moderate-Hard";
  return "Hard";
}
function adjustmentFactor(d: number) {
  if (d >= 0.65) return 0.95;
  if (d <= 0.3) return 1.1;
  return 1.05;
}
function bucketLabel(rank: number, pool: number) {
  if (rank <= 10) return `AIR ${rank}`;
  const lo = Math.floor((rank - 1) / AIR_BUCKET) * AIR_BUCKET + 1;
  const hi = Math.min(pool, lo + AIR_BUCKET - 1);
  return `Approx AIR ${lo}–${hi}`;
}

function buildPool(realScores: number[], maxScore: number, seedKey: string) {
  const realMean =
    realScores.length > 0
      ? realScores.reduce((a, b) => a + b, 0) / realScores.length
      : maxScore * 0.4;
  const realVar =
    realScores.length > 1
      ? realScores.reduce((a, b) => a + (b - realMean) ** 2, 0) /
        realScores.length
      : Math.pow(maxScore * 0.12, 2);
  const realStd = Math.sqrt(realVar);
  const difficulty = maxScore > 0 ? realMean / maxScore : 0.4;
  const adjMean = realMean * adjustmentFactor(difficulty);
  const std = Math.max(realStd, Math.max(8, maxScore * 0.08));

  const syntheticCount = Math.max(0, TARGET_POOL - realScores.length);
  const rand = mulberry32(hashStr(seedKey));
  const synth: number[] = [];
  for (let i = 0; i < syntheticCount; i++) {
    let s = gaussian(rand, adjMean, std);
    s = Math.max(0, Math.min(maxScore, s));
    synth.push(+s.toFixed(2));
  }
  return {
    pool: [...realScores, ...synth].sort((a, b) => b - a),
    difficulty,
  };
}

function rankOf(sorted: number[], score: number) {
  // 1-based rank using upper_bound (number strictly greater)
  let lo = 0,
    hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] > score) lo = mid + 1;
    else hi = mid;
  }
  return lo + 1; // first index where sorted[i] <= score, +1 for 1-based
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { attempt_id } = await req.json().catch(() => ({}));
    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "attempt_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Load attempt (verify ownership)
    const { data: attempt, error: aErr } = await admin
      .from("mock_attempts")
      .select(
        "id, user_id, test_id, total_score, max_score, submitted_at, status, sectional_scores"
      )
      .eq("id", attempt_id)
      .maybeSingle();
    if (aErr || !attempt) {
      return new Response(JSON.stringify({ error: "attempt not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (attempt.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!attempt.submitted_at) {
      return new Response(
        JSON.stringify({ locked: true, reason: "not_submitted" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const submittedAt = new Date(attempt.submitted_at);
    const unlocksAt = new Date(
      submittedAt.getTime() + UNLOCK_DAYS * 86400 * 1000
    );
    if (Date.now() < unlocksAt.getTime()) {
      return new Response(
        JSON.stringify({
          locked: true,
          unlocks_at: unlocksAt.toISOString(),
          submitted_at: attempt.submitted_at,
          reason: "cooldown",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cache hit?
    const { data: cached } = await admin
      .from("mock_projected_ranks")
      .select("*")
      .eq("attempt_id", attempt_id)
      .maybeSingle();
    if (cached) {
      return new Response(
        JSON.stringify({ locked: false, ...cached, unlocks_at: unlocksAt.toISOString() }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cohort = all real submitted attempts for this test up to unlock cutoff
    const { data: cohort } = await admin
      .from("mock_attempts")
      .select("total_score, sectional_scores")
      .eq("test_id", attempt.test_id)
      .in("status", ["submitted", "auto_submitted"])
      .lte("submitted_at", unlocksAt.toISOString());

    const maxScore = Number(attempt.max_score ?? 0) || 100;
    const realScores = (cohort ?? [])
      .map((c: any) => Number(c.total_score ?? 0))
      .filter((n) => Number.isFinite(n));

    const { pool, difficulty } = buildPool(
      realScores,
      maxScore,
      `${attempt.test_id}`
    );

    const myScore = Number(attempt.total_score ?? 0);
    const myRank = rankOf(pool, myScore);
    const studentsAhead = myRank - 1;
    const studentsBehind = pool.length - myRank;
    const topperScore = pool[0] ?? maxScore;
    const projectedPercentile = +(
      ((pool.length - myRank) / pool.length) *
      100
    ).toFixed(2);

    // Sectional projections (per section in sectional_scores)
    const sectional: Record<string, any> = {};
    const ssRaw: any = attempt.sectional_scores ?? {};
    for (const key of Object.keys(ssRaw)) {
      const my = ssRaw[key] ?? {};
      const myScoreS = Number(my.score ?? 0);
      const maxS = Number(my.max ?? my.max_score ?? 0) || Math.max(myScoreS, 30);
      const realS = (cohort ?? [])
        .map((c: any) => Number((c.sectional_scores ?? {})?.[key]?.score ?? NaN))
        .filter((n: number) => Number.isFinite(n));
      const { pool: poolS, difficulty: dS } = buildPool(
        realS,
        maxS,
        `${attempt.test_id}:${key}`
      );
      const rS = rankOf(poolS, myScoreS);
      sectional[key] = {
        section: key,
        score: myScoreS,
        max: maxS,
        projected_air: rS,
        air_bucket: bucketLabel(rS, poolS.length),
        projected_percentile: +(
          ((poolS.length - rS) / poolS.length) *
          100
        ).toFixed(2),
        difficulty: difficultyLabel(dS),
      };
    }

    const row = {
      attempt_id,
      user_id: user.id,
      test_id: attempt.test_id,
      projected_air: myRank,
      air_bucket: bucketLabel(myRank, pool.length),
      projected_percentile: projectedPercentile,
      students_ahead: studentsAhead,
      students_behind: studentsBehind,
      topper_score: topperScore,
      difficulty: difficultyLabel(difficulty),
      sectional,
      pool_size: pool.length,
      real_pool_size: realScores.length,
    };

    await admin.from("mock_projected_ranks").upsert(row, {
      onConflict: "attempt_id",
    });

    return new Response(
      JSON.stringify({
        locked: false,
        ...row,
        unlocks_at: unlocksAt.toISOString(),
        computed_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? "internal_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
