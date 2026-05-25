// Admin-only: scan all sectional mock tests where the section is passage- or
// caselet-bearing (VARC / DILR family) but has 0 passages, then re-queue the
// section job with proper sets / questions_per_set so the worker rebuilds
// the section WITH passages.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERBAL_CODES = ["VARC", "VALR", "LS", "GE", "LC", "VABI"];
const DILR_CODES = ["DILR", "LRDI", "DI", "LR", "AR", "QADI", "QADS"];

function deriveSets(sectionCode: string, totalQuestions: number) {
  const sc = String(sectionCode || "").toUpperCase();
  if (VERBAL_CODES.includes(sc)) {
    return { sets: Math.max(1, Math.min(4, Math.floor(totalQuestions / 4))), qPerSet: 4 };
  }
  if (DILR_CODES.includes(sc)) {
    return { sets: Math.max(1, Math.min(4, Math.floor(totalQuestions / 5))), qPerSet: 5 };
  }
  return { sets: 0, qPerSet: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, serviceKey, { global: { headers: { Authorization: auth } } });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const testId = body?.test_id as string | undefined;

    // Pull candidate sectional tests
    let testsQuery = admin
      .from("mock_tests")
      .select("id, name, exam_code, test_type, category")
      .or("test_type.eq.sectional,category.eq.sectional");
    if (testId) testsQuery = admin.from("mock_tests").select("id, name, exam_code, test_type, category").eq("id", testId);
    const { data: tests, error: testsErr } = await testsQuery;
    if (testsErr) return json({ error: testsErr.message }, 500);

    const candidates: any[] = [];
    for (const t of tests ?? []) {
      const { data: sections } = await admin
        .from("mock_sections")
        .select("id, code, name, total_questions")
        .eq("test_id", t.id);
      for (const sec of sections ?? []) {
        const sc = String(sec.code || "").toUpperCase();
        if (!VERBAL_CODES.includes(sc) && !DILR_CODES.includes(sc)) continue;

        const { count: passageCount } = await admin
          .from("mock_passages")
          .select("id", { count: "exact", head: true })
          .eq("section_id", sec.id);
        if ((passageCount ?? 0) > 0) continue;

        const { sets, qPerSet } = deriveSets(sec.code, sec.total_questions || 0);
        if (sets <= 0) continue;
        candidates.push({ test: t, section: sec, sets, qPerSet });
      }
    }

    if (dryRun) {
      return json({
        candidates: candidates.map((c) => ({
          test_id: c.test.id,
          test_name: c.test.name,
          exam_code: c.test.exam_code,
          section_code: c.section.code,
          section_id: c.section.id,
          total_questions: c.section.total_questions,
          will_set_sets: c.sets,
          will_set_qps: c.qPerSet,
        })),
        total: candidates.length,
      });
    }

    let requeued = 0;
    const workerUrl = `${url}/functions/v1/retry-mock-section`;
    const internalSecret = Deno.env.get("LOVABLE_API_KEY") || serviceKey;

    for (const c of candidates) {
      // Find the existing job for this section (latest)
      const { data: jobs } = await admin
        .from("mock_section_jobs")
        .select("id, generation_id")
        .eq("section_id", c.section.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const job = jobs?.[0];
      if (!job) continue;

      // Wipe old questions for this section so the worker regenerates cleanly
      await admin.from("mock_questions").delete().eq("section_id", c.section.id);

      // Re-arm the job with proper sets
      await admin.from("mock_section_jobs").update({
        sets: c.sets,
        questions_per_set: c.qPerSet,
        status: "pending",
        attempts: 0,
        questions_done: 0,
        worker_lock_until: null,
        current_step: "Requeued for passage repair",
        error_message: null,
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);

      // Kick the worker
      fetch(workerUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${internalSecret}`,
          apikey: internalSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: job.id, auto: true, service: true, internal_secret: internalSecret }),
      }).catch((e) => console.error("[repair] worker kickoff failed", e));

      requeued++;
      // Small stagger so we don't slam the AI API
      await new Promise((r) => setTimeout(r, 400));
    }

    return json({ found: candidates.length, requeued });
  } catch (e) {
    console.error("[repair-sectional-passages]", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
