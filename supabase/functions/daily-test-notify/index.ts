import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const date = body?.date ?? new Date().toISOString().slice(0, 10);

    // Look up today's daily test
    const { data: assignment, error: aErr } = await supabase
      .from("daily_test_assignments")
      .select("id, assigned_date, test_id, title, note, test:mock_tests(name, slug)")
      .eq("assigned_date", date)
      .maybeSingle();

    if (aErr) throw aErr;
    if (!assignment) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no assignment for date" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recipients = all students with mock enrollments OR existing student_rewards
    const [{ data: enrolled }, { data: rewarded }] = await Promise.all([
      supabase.from("mock_enrollments").select("user_id"),
      supabase.from("student_rewards").select("user_id"),
    ]);
    const userIds = new Set<string>();
    enrolled?.forEach((r: any) => r.user_id && userIds.add(r.user_id));
    rewarded?.forEach((r: any) => r.user_id && userIds.add(r.user_id));

    if (userIds.size === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip users who already completed
    const { data: doneRows } = await supabase
      .from("student_daily_test_progress")
      .select("user_id")
      .eq("assigned_date", date)
      .not("completed_at", "is", null);
    const done = new Set((doneRows ?? []).map((r: any) => r.user_id));

    const title = assignment.title || `Today's daily mock is live`;
    const message = assignment.note || `Complete "${(assignment.test as any)?.name ?? "today's mock"}" to keep your streak alive.`;
    const link = "/student/daily-test";

    const rows = Array.from(userIds)
      .filter((uid) => !done.has(uid))
      .map((uid) => ({
        user_id: uid,
        title,
        message,
        type: "daily_test",
        link_url: link,
        is_read: false,
      }));

    let sent = 0;
    // chunk inserts of 500
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from("student_notifications").insert(chunk);
      if (error) throw error;
      sent += chunk.length;
    }

    return new Response(JSON.stringify({ ok: true, sent, date }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
