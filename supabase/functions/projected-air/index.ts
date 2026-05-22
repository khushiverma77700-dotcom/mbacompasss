// Projected AIR engine — computes a stable, synthetic-population-based
// All India Rank for a given mock attempt. Unlocks 7 days after submission.
// Also returns a deterministic leaderboard (top + window around the user)
// blending real cohort names with seeded synthetic aspirants.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POOL_MIN = 1000;
const POOL_MAX = 2500;
const POOL_GROWTH_PER_DAY = 55; // ~27 days to reach the ceiling
const UNLOCK_DAYS = 7;
const AIR_BUCKET = 50;

// ---------- seeded RNG ----------
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
// Dynamic, deterministic pool size — starts small, grows daily, capped.
function computePoolSize(submittedAt: Date, seedKey: string): number {
  const daysSince = Math.max(
    0,
    Math.floor((Date.now() - submittedAt.getTime()) / 86400000)
  );
  const base = POOL_MIN + daysSince * POOL_GROWTH_PER_DAY;
  const jitter = Math.floor(mulberry32(hashStr(seedKey + ":pool"))() * 121) - 60;
  return Math.max(POOL_MIN, Math.min(POOL_MAX, base + jitter));
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
  // Synthetic mean is set slightly BELOW student baseline so percentiles
  // reflect a realistic competitive aspirant pool (most candidates score lower
  // than serious test-takers using the platform).
  if (d >= 0.65) return 0.82;
  if (d <= 0.3) return 0.95;
  return 0.88;
}
function bucketLabel(rank: number, pool: number) {
  if (rank <= 10) return `AIR ${rank}`;
  const lo = Math.floor((rank - 1) / AIR_BUCKET) * AIR_BUCKET + 1;
  const hi = Math.min(pool, lo + AIR_BUCKET - 1);
  return `Approx AIR ${lo}–${hi}`;
}

// ---------- synthetic identities ----------
const FIRST = [
  "Aarav","Aditi","Aman","Ananya","Arjun","Diya","Ishaan","Kabir","Kavya","Krish",
  "Meera","Neha","Nikhil","Priya","Rahul","Riya","Rohan","Sanya","Siddharth","Tanvi",
  "Vihaan","Aisha","Dev","Ira","Reyansh","Saanvi","Yash","Zara","Aryan","Ayaan",
  "Anika","Vivaan","Ojas","Pari","Naina","Mira","Lakshya","Karan","Jiya","Hari",
  "Esha","Dhruv","Chaitra","Bhavya","Atharv","Aanya","Aarush","Advik","Ahaan","Akshay",
];
const LAST_INIT = ["S.","K.","M.","R.","P.","G.","J.","B.","N.","T.","V.","C.","D.","A.","H."];

function synthName(rand: () => number) {
  const f = FIRST[Math.floor(rand() * FIRST.length) % FIRST.length];
  const l = LAST_INIT[Math.floor(rand() * LAST_INIT.length) % LAST_INIT.length];
  return `${f} ${l}`;
}

// ---------- pool builder (returns scores + tagged entries) ----------
type PoolEntry = {
  score: number;
  is_real: boolean;
  user_id?: string;
  display_name?: string;
};

function buildPoolTagged(
  realEntries: { score: number; user_id: string; display_name: string }[],
  maxScore: number,
  seedKey: string,
  targetPool: number
) {
  const realScores = realEntries.map((e) => e.score);
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

  const syntheticCount = Math.max(0, targetPool - realScores.length);
  const rand = mulberry32(hashStr(seedKey));
  const entries: PoolEntry[] = realEntries.map((e) => ({
    score: e.score,
    is_real: true,
    user_id: e.user_id,
    display_name: e.display_name,
  }));
  for (let i = 0; i < syntheticCount; i++) {
    let s = gaussian(rand, adjMean, std);
    s = Math.max(0, Math.min(maxScore, s));
    entries.push({
      score: +s.toFixed(2),
      is_real: false,
      display_name: synthName(rand),
    });
  }
  entries.sort((a, b) => b.score - a.score);
  return { entries, difficulty };
}

function rankOfScore(sorted: PoolEntry[], score: number) {
  let lo = 0,
    hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid].score > score) lo = mid + 1;
    else hi = mid;
  }
  return lo + 1;
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

    const { data: attempt, error: aErr } = await admin
      .from("mock_attempts")
      .select(
        "id, user_id, test_id, total_score, max_score, submitted_at, status, sectional_scores, test:mock_tests(test_type)"
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AIR is only for full-length mocks
    const testType = (attempt as any).test?.test_type ?? "full_length";
    if (testType !== "full_length") {
      return new Response(
        JSON.stringify({ locked: true, reason: "not_full_length", message: "All India Rank is calculated only for full-length mocks." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only the FIRST submitted attempt of this test counts towards AIR
    const { data: firstAttempt } = await admin
      .from("mock_attempts")
      .select("id, submitted_at")
      .eq("user_id", user.id)
      .eq("test_id", attempt.test_id)
      .in("status", ["submitted", "auto_submitted"])
      .order("submitted_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstAttempt && firstAttempt.id !== attempt.id) {
      return new Response(
        JSON.stringify({
          locked: true,
          reason: "not_first_attempt",
          first_attempt_id: firstAttempt.id,
          message: "Only your first attempt of a mock counts towards All India Rank. View the report of your first attempt to see your AIR.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const submittedAt = new Date(attempt.submitted_at);
    const unlocksAt = new Date(submittedAt.getTime() + UNLOCK_DAYS * 86400 * 1000);
    if (Date.now() < unlocksAt.getTime()) {
      return new Response(
        JSON.stringify({
          locked: true,
          unlocks_at: unlocksAt.toISOString(),
          submitted_at: attempt.submitted_at,
          reason: "cooldown",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Build cohort (FIRST submitted attempt per user for this test) ---
    const { data: cohortRaw } = await admin
      .from("mock_attempts")
      .select("user_id, total_score, sectional_scores, submitted_at")
      .eq("test_id", attempt.test_id)
      .in("status", ["submitted", "auto_submitted"])
      .lte("submitted_at", unlocksAt.toISOString())
      .order("submitted_at", { ascending: true });

    // Dedupe: keep earliest attempt per user
    const firstByUser = new Map<string, any>();
    (cohortRaw ?? []).forEach((r: any) => {
      if (r.user_id && !firstByUser.has(r.user_id)) firstByUser.set(r.user_id, r);
    });
    const cohort = Array.from(firstByUser.values());

    const realUserIds = Array.from(
      new Set((cohort ?? []).map((c: any) => c.user_id).filter(Boolean))
    );
    const { data: profs } = realUserIds.length
      ? await admin
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", realUserIds)
      : { data: [] as any[] };
    const nameMap = new Map<string, string>();
    (profs ?? []).forEach((p: any) =>
      nameMap.set(p.user_id, p.display_name || "Aspirant")
    );

    const maxScore = Number(attempt.max_score ?? 0) || 100;
    const realEntries = (cohort ?? [])
      .map((c: any) => ({
        score: Number(c.total_score ?? 0),
        user_id: c.user_id as string,
        display_name: nameMap.get(c.user_id) || "Aspirant",
      }))
      .filter((e) => Number.isFinite(e.score));

    // Dynamic pool size — grows over time, capped at 2,500.
    const targetPool = computePoolSize(submittedAt, `${attempt.test_id}`);

    const { entries: pool, difficulty } = buildPoolTagged(
      realEntries,
      maxScore,
      `${attempt.test_id}`,
      targetPool
    );

    const myScore = Number(attempt.total_score ?? 0);
    // Motivational ranking — student is never placed near the bottom.
    // Position scales with score: high score → top ranks, low score → middle.
    // Range: top 12% (best) … 60% (worst). Student is always above the median tail.
    const scoreRatio = maxScore > 0 ? Math.max(0, Math.min(1, myScore / maxScore)) : 0;
    const targetPct = 0.60 - 0.48 * scoreRatio; // 0.60 → 0.12
    let myRank = Math.max(1, Math.min(pool.length, Math.round(targetPct * pool.length)));
    // Tiny deterministic jitter so two equal scores don't collide
    const jitter = Math.floor(mulberry32(hashStr(`${attempt.id}:rank`))() * 9) - 4;
    myRank = Math.max(1, Math.min(pool.length, myRank + jitter));

    const studentsAhead = myRank - 1;
    const studentsBehind = pool.length - myRank;
    const topperScore = pool[0]?.score ?? maxScore;
    const projectedPercentile = +(
      ((pool.length - myRank) / pool.length) * 100
    ).toFixed(2);

    // Replace my row in the pool with my actual identity
    const myIdx = Math.min(pool.length - 1, Math.max(0, myRank - 1));
    pool[myIdx] = {
      score: myScore,
      is_real: true,
      user_id: user.id,
      display_name: nameMap.get(user.id) || "You",
    };

    // Top 10 + window of ±5 around the user
    const top = pool.slice(0, 10).map((e, i) => ({
      rank: i + 1,
      name: e.display_name,
      score: e.score,
      is_self: e.user_id === user.id,
      is_real: e.is_real,
    }));
    const winStart = Math.max(0, myIdx - 5);
    const winEnd = Math.min(pool.length, myIdx + 6);
    const window = pool.slice(winStart, winEnd).map((e, i) => ({
      rank: winStart + i + 1,
      name: e.display_name,
      score: e.score,
      is_self: e.user_id === user.id,
      is_real: e.is_real,
    }));

    // Sectional projections
    const sectional: Record<string, any> = {};
    const ssRaw: any = attempt.sectional_scores ?? {};
    for (const key of Object.keys(ssRaw)) {
      const my = ssRaw[key] ?? {};
      const myScoreS = Number(my.score ?? 0);
      const maxS = Number(my.max ?? my.max_score ?? 0) || Math.max(myScoreS, 30);
      const realS = (cohort ?? [])
        .map((c: any) => ({
          score: Number((c.sectional_scores ?? {})?.[key]?.score ?? NaN),
          user_id: c.user_id,
          display_name: nameMap.get(c.user_id) || "Aspirant",
        }))
        .filter((e: any) => Number.isFinite(e.score));
      const { entries: poolS, difficulty: dS } = buildPoolTagged(
        realS,
        maxS,
        `${attempt.test_id}:${key}`,
        targetPool
      );
      const rS = rankOfScore(poolS, myScoreS);
      sectional[key] = {
        section: key,
        score: myScoreS,
        max: maxS,
        projected_air: rS,
        air_bucket: bucketLabel(rS, poolS.length),
        projected_percentile: +(
          ((poolS.length - rS) / poolS.length) * 100
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
      real_pool_size: realEntries.length,
    };

    // Cache the stable per-attempt row
    await admin.from("mock_projected_ranks").upsert(row, {
      onConflict: "attempt_id",
    });

    return new Response(
      JSON.stringify({
        locked: false,
        ...row,
        leaderboard: { top, window, my_rank: myRank, pool_size: pool.length },
        unlocks_at: unlocksAt.toISOString(),
        computed_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
