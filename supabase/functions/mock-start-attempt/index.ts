// Server-authoritative attempt creation: sets section deadlines on the server.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const { test_id } = body ?? {};
    if (!test_id || typeof test_id !== "string") {
      return new Response(JSON.stringify({ error: "test_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for trusted writes
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auto-enroll free tests
    const { data: test, error: testErr } = await admin
      .from("mock_tests")
      .select("id, pricing_type, total_duration_minutes, is_published, access_validity_days")
      .eq("id", test_id)
      .maybeSingle();
    if (testErr || !test) {
      return new Response(JSON.stringify({ error: "Test not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!test.is_published) {
      return new Response(JSON.stringify({ error: "Test not published" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingEnrollment } = await admin
      .from("mock_enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("test_id", test_id)
      .maybeSingle();

    if (!existingEnrollment) {
      if (test.pricing_type !== "free") {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      await admin.from("mock_enrollments").insert({
        user_id: user.id,
        test_id,
        source: "free",
        expires_at: new Date(
          Date.now() + (test.access_validity_days ?? 30) * 86400000,
        ).toISOString(),
      });
    }

    // Resume in-progress attempt if any
    const { data: existingAttempt } = await admin
      .from("mock_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("test_id", test_id)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .maybeSingle();

    if (existingAttempt) {
      return new Response(JSON.stringify({ attempt: existingAttempt, resumed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build server-side section deadlines
    const { data: sections } = await admin
      .from("mock_sections")
      .select("id, code, duration_minutes, sort_order")
      .eq("test_id", test_id)
      .order("sort_order", { ascending: true });

    const now = Date.now();
    const sectionDeadlines: Record<string, string> = {};
    let cursor = now;
    for (const s of sections ?? []) {
      cursor += (s.duration_minutes ?? 40) * 60000;
      sectionDeadlines[s.id] = new Date(cursor).toISOString();
    }
    const overallDeadline = new Date(
      now + (test.total_duration_minutes ?? 120) * 60000,
    ).toISOString();

    const firstSectionId = sections?.[0]?.id ?? null;

    const { data: attempt, error: attemptErr } = await admin
      .from("mock_attempts")
      .insert({
        user_id: user.id,
        test_id,
        status: "in_progress",
        started_at: new Date(now).toISOString(),
        section_deadlines: sectionDeadlines,
        overall_deadline: overallDeadline,
        current_section_id: firstSectionId,
      })
      .select("*")
      .single();

    if (attemptErr) {
      return new Response(JSON.stringify({ error: attemptErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment counter
    await admin.rpc("noop").catch(() => {});
    await admin
      .from("mock_tests")
      .update({ total_attempts: (test as any).total_attempts ? undefined : undefined })
      .eq("id", test_id);

    return new Response(JSON.stringify({ attempt, resumed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
