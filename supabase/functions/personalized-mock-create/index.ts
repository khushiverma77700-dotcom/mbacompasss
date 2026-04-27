// Student: create a personalized mock attempt by picking fresh questions
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

    const { exam_code, sections, difficulty, num_questions } = await req.json();
    if (!exam_code || !Array.isArray(sections) || !sections.length || !difficulty || !num_questions) {
      return json({ error: "Missing fields" }, 400);
    }
    const count = Math.min(Math.max(parseInt(num_questions), 5), 100);

    // Access check
    const { data: access } = await admin
      .from("personalized_hub_access")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!access) return json({ error: "no_access" }, 403);
    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return json({ error: "access_expired" }, 403);
    }

    // Daily quota
    const { data: todayCountData } = await admin.rpc("personalized_hub_today_count", { _user_id: user.id });
    const todayCount = (todayCountData as number) ?? 0;
    if (todayCount >= access.daily_quota) {
      return json({ error: "quota_exceeded", limit: access.daily_quota }, 429);
    }

    // Pick fresh questions
    const { data: picked, error: pickErr } = await admin.rpc("pick_personalized_questions", {
      _user_id: user.id,
      _exam_code: exam_code,
      _sections: sections,
      _difficulty: difficulty,
      _count: count,
    });
    if (pickErr) return json({ error: pickErr.message }, 500);

    if (!picked || picked.length < count) {
      return json({
        error: "insufficient_questions",
        available: picked?.length ?? 0,
        requested: count,
      }, 422);
    }

    // Strip correct answers for client-side
    const questionsForClient = picked.map((q: any) => ({
      id: q.id,
      section: q.section,
      difficulty: q.difficulty,
      question_text: q.question_text,
      options: q.options,
      topic: q.topic,
    }));

    const duration = count; // 1 min per question

    const { data: attempt, error: attemptErr } = await admin
      .from("personalized_mock_attempts")
      .insert({
        user_id: user.id,
        exam_code,
        sections,
        difficulty,
        num_questions: count,
        duration_minutes: duration,
        questions: questionsForClient,
      })
      .select("*")
      .single();

    if (attemptErr) return json({ error: attemptErr.message }, 500);

    // Mark as seen
    const seenRows = picked.map((q: any) => ({ user_id: user.id, question_id: q.id }));
    await admin.from("personalized_question_seen").upsert(seenRows, { onConflict: "user_id,question_id" });

    return json({ attempt });
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
