// Mentor-style AI analysis for a mock attempt.
// Computes deterministic diagnostics from responses+questions, then asks the
// AI to produce a structured, human, coach-tone report.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { attempt_id } = await req.json();
    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "attempt_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: attempt } = await admin
      .from("mock_attempts").select("*").eq("id", attempt_id).maybeSingle();
    if (!attempt || attempt.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: test } = await admin
      .from("mock_tests").select("name, exam_code, category, total_duration_minutes")
      .eq("id", attempt.test_id).maybeSingle();

    const { data: sections } = await admin
      .from("mock_sections").select("id,name,sort_order,duration_minutes,marks_per_correct,negative_marks")
      .eq("test_id", attempt.test_id).order("sort_order");

    const { data: questions } = await admin
      .from("mock_questions").select("id,section_id,topic,difficulty,question_type,positive_marks,negative_marks")
      .eq("test_id", attempt.test_id);

    const { data: responses } = await admin
      .from("mock_responses").select("question_id,section_id,status,is_correct,marks_awarded,time_spent_seconds,visit_count")
      .eq("attempt_id", attempt_id);

    // Index helpers
    const qById = new Map((questions ?? []).map((q: any) => [q.id, q]));
    const secById = new Map((sections ?? []).map((s: any) => [s.id, s]));

    // Aggregate deterministic diagnostics
    const sectionAgg: Record<string, any> = {};
    const topicAgg: Record<string, any> = {};
    const diffAgg: Record<string, any> = { easy: { tot: 0, att: 0, cor: 0, time: 0, marks: 0 }, medium: { tot: 0, att: 0, cor: 0, time: 0, marks: 0 }, hard: { tot: 0, att: 0, cor: 0, time: 0, marks: 0 } };

    for (const q of questions ?? []) {
      const s = secById.get(q.section_id);
      const sname = s?.name ?? "Section";
      sectionAgg[sname] ||= { name: sname, total: 0, attempted: 0, correct: 0, incorrect: 0, marks: 0, time: 0, easy_total: 0, easy_cor: 0, med_total: 0, med_cor: 0, hard_total: 0, hard_cor: 0 };
      sectionAgg[sname].total++;
      const d = (q.difficulty || "medium").toLowerCase();
      if (d === "easy") sectionAgg[sname].easy_total++;
      else if (d === "hard") sectionAgg[sname].hard_total++;
      else sectionAgg[sname].med_total++;

      const t = q.topic || "General";
      topicAgg[t] ||= { topic: t, total: 0, attempted: 0, correct: 0, time: 0, marks: 0 };
      topicAgg[t].total++;

      if (diffAgg[d]) diffAgg[d].tot++;
    }

    let sillyMistakes = 0;     // wrong on easy
    let conceptualGaps = 0;    // wrong on medium/hard
    let revisitWrong = 0;      // visited >=2 and still wrong
    let timeTraps = 0;         // >120s and wrong
    let easyMissed = 0;        // unattempted easy
    let lostMarksAvoidable = 0; // negative marks on easy/medium + missed easy upside

    for (const r of responses ?? []) {
      const q: any = qById.get(r.question_id);
      if (!q) continue;
      const s = secById.get(q.section_id);
      const sname = s?.name ?? "Section";
      const t = q.topic || "General";
      const d = (q.difficulty || "medium").toLowerCase();
      const sa = sectionAgg[sname];
      const ta = topicAgg[t];
      const da = diffAgg[d] ?? diffAgg.medium;

      const time = r.time_spent_seconds || 0;
      sa.time += time; ta.time += time; da.time += time;

      const attempted = r.status === "answered" || r.status === "marked_answered";
      if (attempted) {
        sa.attempted++; ta.attempted++; da.att++;
        if (r.is_correct) {
          sa.correct++; ta.correct++; da.cor++;
          if (d === "easy") sa.easy_cor++;
          else if (d === "hard") sa.hard_cor++;
          else sa.med_cor++;
        } else {
          sa.incorrect++;
          if (d === "easy") sillyMistakes++;
          else conceptualGaps++;
          if ((r.visit_count || 0) >= 2) revisitWrong++;
          if (time > 120) timeTraps++;
          // negative marks lost
          const neg = Number(s?.negative_marks || q.negative_marks || 0);
          lostMarksAvoidable += d === "hard" ? 0 : neg;
        }
        sa.marks += Number(r.marks_awarded || 0);
        ta.marks += Number(r.marks_awarded || 0);
        da.marks += Number(r.marks_awarded || 0);
      } else if (d === "easy") {
        easyMissed++;
        const pos = Number(s?.marks_per_correct || q.positive_marks || 3);
        lostMarksAvoidable += pos * 0.6; // expected upside on easy unattempted
      }
    }

    const sectionList = Object.values(sectionAgg).map((s: any) => ({
      ...s,
      accuracy: pct(s.correct, s.attempted),
      attempt_rate: pct(s.attempted, s.total),
      avg_time_sec: s.attempted ? Math.round(s.time / s.attempted) : 0,
      easy_accuracy: pct(s.easy_cor, s.easy_total),
      medium_accuracy: pct(s.med_cor, s.med_total),
      hard_accuracy: pct(s.hard_cor, s.hard_total),
    }));

    const topicList = Object.values(topicAgg).map((t: any) => ({
      ...t,
      accuracy: pct(t.correct, t.attempted),
      attempt_rate: pct(t.attempted, t.total),
      avg_time_sec: t.attempted ? Math.round(t.time / t.attempted) : 0,
    })).sort((a: any, b: any) => b.total - a.total);

    const topStrengths = [...topicList].filter((t: any) => t.attempted >= 2).sort((a: any, b: any) => b.accuracy - a.accuracy).slice(0, 4);
    const topWeak = [...topicList].filter((t: any) => t.total >= 2).sort((a: any, b: any) => a.accuracy - b.accuracy).slice(0, 5);

    const totalTime = (responses ?? []).reduce((a, r) => a + (r.time_spent_seconds || 0), 0);
    const totalQ = (questions ?? []).length;
    const totalAtt = (responses ?? []).filter((r: any) => r.status === "answered" || r.status === "marked_answered").length;
    const totalCor = (responses ?? []).filter((r: any) => r.is_correct).length;

    // Strategy classification
    const attemptRate = pct(totalAtt, totalQ);
    const overallAccuracy = pct(totalCor, totalAtt);
    let strategyLabel = "Balanced";
    if (attemptRate >= 75 && overallAccuracy < 55) strategyLabel = "Aggressive (over-attempting)";
    else if (attemptRate < 55 && overallAccuracy >= 70) strategyLabel = "Conservative (under-attempting)";
    else if (attemptRate < 55 && overallAccuracy < 55) strategyLabel = "Underperforming (low attempts + low accuracy)";

    const diagnostics = {
      exam: test?.exam_code,
      test: test?.name,
      score: attempt.total_score, max_score: attempt.max_score, percentile: attempt.percentile,
      accuracy: overallAccuracy, attempt_rate: attemptRate,
      total_questions: totalQ, total_attempted: totalAtt, total_correct: totalCor,
      time_used_minutes: Math.round(totalTime / 60),
      duration_minutes: test?.total_duration_minutes,
      strategy_label: strategyLabel,
      mistake_patterns: {
        silly_mistakes_easy: sillyMistakes,
        conceptual_gaps_med_hard: conceptualGaps,
        revisited_then_wrong: revisitWrong,
        time_trap_wrong_over_2min: timeTraps,
        easy_questions_skipped: easyMissed,
        avoidable_marks_lost_estimate: Math.round(lostMarksAvoidable * 10) / 10,
      },
      difficulty: diffAgg,
      sections: sectionList,
      top_strengths_topics: topStrengths,
      top_weak_topics: topWeak,
    };

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = `You are an elite MBA entrance exam mentor (CAT/XAT/SNAP/NMAT/IIFT/CMAT/MAT) with 10+ years coaching toppers. Speak like a sharp, honest human coach — direct, specific, never generic, never robotic. Avoid filler like "keep practicing" or "stay consistent". Reference the student's actual numbers, topics, and patterns. Use Indian MBA exam terminology (RC, PJ, LRDI sets, TITA, percentile, sectional cutoff).

Return STRICT JSON ONLY with this exact shape:
{
  "diagnosis": { "headline": string, "core_problem": string, "evidence": string[] },
  "mistake_patterns": [{ "pattern": string, "evidence": string, "fix": string }],
  "time_management": { "verdict": string, "over_invested": string[], "under_utilized": string[], "fix": string },
  "strategy_evaluation": { "label": string, "what_went_wrong": string, "section_order_advice": string, "attempt_advice": string },
  "strengths": [{ "area": string, "why": string, "leverage": string }],
  "weaknesses": [{ "area": string, "why": string, "fix": string, "priority": "high"|"medium"|"low" }],
  "score_leakage": { "total_lost_marks_estimate": number, "breakdown": [{ "source": string, "marks": number, "fix": string }] },
  "behavioral_insights": [{ "behavior": string, "evidence": string, "advice": string }],
  "improvement_plan": {
    "seven_day": [{ "day": number, "focus": string, "hours": number, "tasks": string[] }],
    "thirty_day": { "mock_frequency": string, "sectional_focus": string[], "strategy_shifts": string[], "milestones": string[] }
  },
  "score_potential": { "current": number, "achievable": number, "delta": number, "from_accuracy": number, "from_time": number, "from_strategy": number, "rationale": string },
  "smart_alerts": [{ "type": "warning"|"info"|"success", "message": string }],
  "mentor_note": string
}

Rules:
- Every claim must reference numbers from the diagnostics (e.g. "QA accuracy 38% on 21 attempts").
- mistake_patterns: 3-6 items, each tied to actual evidence.
- weaknesses: 3-5 items with priority.
- strengths: 2-4 items.
- behavioral_insights: 2-4 items (panic, risk avoidance, overconfidence, etc).
- smart_alerts: 3-6 punchy one-liners.
- seven_day plan: exactly 7 days, each with 3-5 concrete tasks (topic + drill + count).
- score_potential.delta = from_accuracy + from_time + from_strategy.
- mentor_note: 2-3 sentences, honest and motivating, no clichés.
- No prose outside the JSON.`;

    const user_msg = "Diagnostics:\n" + JSON.stringify(diagnostics, null, 2);

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user_msg },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 8000,
        reasoning_effort: "minimal",
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({ error: aiRes.status === 429 ? "Rate limit exceeded, please try again in a minute." : aiRes.status === 402 ? "AI credits exhausted. Please add credits in Settings." : "AI failed", detail: txt }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { mentor_note: content }; }

    return new Response(JSON.stringify({ insights: parsed, diagnostics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
