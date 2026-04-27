// Student: submit a personalized mock attempt and compute score
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { attempt_id, answers, time_taken_seconds } = await req.json();
    if (!attempt_id) return json({ error: "attempt_id required" }, 400);

    const { data: attempt } = await admin
      .from("personalized_mock_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!attempt) return json({ error: "Not found" }, 404);
    if (attempt.status === "submitted") return json({ attempt });

    const ids = (attempt.questions as any[]).map((q) => q.id);
    const { data: full } = await admin
      .from("personalized_questions")
      .select("id, correct_index, explanation")
      .in("id", ids);
    const map = new Map((full ?? []).map((q) => [q.id, q]));

    let correct = 0, wrong = 0, unattempted = 0;
    const review: any[] = [];
    for (const q of attempt.questions as any[]) {
      const ans = answers?.[q.id];
      const truth = map.get(q.id);
      if (ans === undefined || ans === null) {
        unattempted++;
        review.push({ id: q.id, picked: null, correct: truth?.correct_index, explanation: truth?.explanation });
      } else if (ans === truth?.correct_index) {
        correct++;
        review.push({ id: q.id, picked: ans, correct: truth?.correct_index, isCorrect: true, explanation: truth?.explanation });
      } else {
        wrong++;
        review.push({ id: q.id, picked: ans, correct: truth?.correct_index, isCorrect: false, explanation: truth?.explanation });
      }
    }
    const total = (attempt.questions as any[]).length;
    const score = correct * 3 - wrong * 1;
    const accuracy = correct + wrong > 0 ? (correct / (correct + wrong)) * 100 : 0;

    const { data: updated } = await admin
      .from("personalized_mock_attempts")
      .update({
        answers: { ...answers, _review: review },
        status: "submitted",
        total_correct: correct,
        total_wrong: wrong,
        total_unattempted: unattempted,
        score,
        accuracy: Math.round(accuracy * 100) / 100,
        time_taken_seconds: time_taken_seconds ?? 0,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", attempt_id)
      .select("*")
      .single();

    return json({ attempt: updated, summary: { total, correct, wrong, unattempted, score, accuracy, review } });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
