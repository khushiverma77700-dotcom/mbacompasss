// Server-side scoring: evaluates responses, computes per-section + total + percentile.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normaliseTita(s: string) {
  return (s ?? "").toString().trim().toLowerCase().replace(/\s+/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { attempt_id, reason } = body ?? {};
    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "attempt_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: attempt } = await admin
      .from("mock_attempts")
      .select("*")
      .eq("id", attempt_id)
      .maybeSingle();
    if (!attempt || attempt.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Attempt not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (attempt.status !== "in_progress") {
      return new Response(JSON.stringify({ attempt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load test, sections, questions, options, responses
    const [{ data: sections }, { data: questions }, { data: options }, { data: responses }] =
      await Promise.all([
        admin.from("mock_sections").select("id, code, name").eq("test_id", attempt.test_id),
        admin
          .from("mock_questions")
          .select(
            "id, section_id, question_type, positive_marks, negative_marks, tita_correct_answers, tita_numeric_tolerance, topic",
          )
          .in(
            "section_id",
            (
              await admin
                .from("mock_sections")
                .select("id")
                .eq("test_id", attempt.test_id)
            ).data?.map((s: any) => s.id) ?? [],
          ),
        admin
          .from("mock_question_options")
          .select("id, question_id, is_correct"),
        admin.from("mock_responses").select("*").eq("attempt_id", attempt_id),
      ]);

    const qById = new Map<string, any>((questions ?? []).map((q: any) => [q.id, q]));
    const correctOptionByQ = new Map<string, string>();
    for (const o of options ?? []) {
      if (o.is_correct && qById.has(o.question_id)) {
        correctOptionByQ.set(o.question_id, o.id);
      }
    }
    const sectionMap = new Map<string, any>((sections ?? []).map((s: any) => [s.id, s]));

    const sectionAgg: Record<
      string,
      { code: string; name: string; score: number; max: number; attempted: number; correct: number; incorrect: number }
    > = {};
    for (const s of sections ?? []) {
      sectionAgg[s.id] = { code: s.code, name: s.name, score: 0, max: 0, attempted: 0, correct: 0, incorrect: 0 };
    }
    for (const q of questions ?? []) {
      if (sectionAgg[q.section_id]) sectionAgg[q.section_id].max += Number(q.positive_marks ?? 3);
    }

    const topicAgg: Record<string, { attempted: number; correct: number }> = {};
    let totalScore = 0;
    let totalMax = 0;
    let totalAttempted = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    const updates: any[] = [];
    for (const r of responses ?? []) {
      const q = qById.get(r.question_id);
      if (!q) continue;
      const seg = sectionAgg[q.section_id];
      const pos = Number(q.positive_marks ?? 3);
      const neg = Number(q.negative_marks ?? 1);
      let isCorrect: boolean | null = null;
      let marks = 0;
      const answered = r.status === "answered" || r.status === "answered_marked";

      if (answered) {
        if (q.question_type === "mcq") {
          const correctId = correctOptionByQ.get(q.id);
          isCorrect = !!(correctId && r.selected_option_id === correctId);
        } else {
          // TITA
          const ans = normaliseTita(r.tita_answer ?? "");
          const accepted = (q.tita_correct_answers ?? []).map(normaliseTita);
          let ok = accepted.includes(ans);
          if (!ok && q.tita_numeric_tolerance != null && ans !== "") {
            const numAns = Number(ans);
            if (!Number.isNaN(numAns)) {
              for (const a of (q.tita_correct_answers ?? [])) {
                const numA = Number(a);
                if (!Number.isNaN(numA) && Math.abs(numA - numAns) <= Number(q.tita_numeric_tolerance)) {
                  ok = true;
                  break;
                }
              }
            }
          }
          isCorrect = ok;
        }
        if (isCorrect) {
          marks = pos;
          seg.correct += 1;
          totalCorrect += 1;
        } else {
          marks = q.question_type === "tita" ? 0 : -neg; // CAT: no negative for TITA
          seg.incorrect += 1;
          totalIncorrect += 1;
        }
        seg.attempted += 1;
        totalAttempted += 1;
        if (q.topic) {
          if (!topicAgg[q.topic]) topicAgg[q.topic] = { attempted: 0, correct: 0 };
          topicAgg[q.topic].attempted += 1;
          if (isCorrect) topicAgg[q.topic].correct += 1;
        }
      }
      seg.score += marks;
      totalScore += marks;
      updates.push({ id: r.id, is_correct: isCorrect, marks_awarded: marks });
    }
    totalMax = Object.values(sectionAgg).reduce((a, s) => a + s.max, 0);

    // Persist response evaluations
    for (const u of updates) {
      await admin
        .from("mock_responses")
        .update({ is_correct: u.is_correct, marks_awarded: u.marks_awarded })
        .eq("id", u.id);
    }

    // Percentile (simple: % of submitted attempts on this test with lower score)
    const { data: peerScores } = await admin
      .from("mock_attempts")
      .select("total_score")
      .eq("test_id", attempt.test_id)
      .in("status", ["submitted", "auto_submitted"]);
    const peers = (peerScores ?? []).map((p: any) => Number(p.total_score ?? 0));
    let percentile = 100;
    if (peers.length > 0) {
      const lower = peers.filter((s) => s < totalScore).length;
      percentile = Math.round((lower / peers.length) * 10000) / 100;
    }

    const accuracy = totalAttempted > 0
      ? Math.round((totalCorrect / totalAttempted) * 10000) / 100
      : 0;

    const { data: updated } = await admin
      .from("mock_attempts")
      .update({
        status: reason ? "auto_submitted" : "submitted",
        submitted_at: new Date().toISOString(),
        auto_submitted_reason: reason ?? null,
        total_score: totalScore,
        max_score: totalMax,
        sectional_scores: sectionAgg,
        total_attempted: totalAttempted,
        total_correct: totalCorrect,
        total_incorrect: totalIncorrect,
        accuracy,
        percentile,
        topic_breakdown: topicAgg,
      })
      .eq("id", attempt_id)
      .select("*")
      .single();

    return new Response(JSON.stringify({ attempt: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
