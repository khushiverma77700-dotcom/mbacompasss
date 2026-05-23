import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Authorization: allow only service-role callers (other edge functions) or admin users.
  // External callers without service-role or admin JWT are rejected to prevent email abuse.
  const authHeader = req.headers.get("Authorization") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
  let isAdmin = false;
  if (!isServiceRole && authHeader.startsWith("Bearer ")) {
    try {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roleRow } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        isAdmin = !!roleRow;
      }
    } catch (_) { /* ignore */ }
  }
  if (!isServiceRole && !isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any = {};
  try {
    payload = await req.json();
    const {
      recipient_email,
      recipient_name = "",
      course_name = "",
      amount = "",
      password = "",
      user_id = null,
      test = false,
    } = payload;

    if (!recipient_email) throw new Error("recipient_email required");

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@mbacompass.in";
    const SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") || "MBA Compass";
    if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY not configured");

    const { data: tpl } = await admin
      .from("welcome_email_template")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (!tpl) throw new Error("Template not found");
    if (!tpl.enabled && !test) throw new Error("Welcome emails disabled");

    const vars = {
      name: recipient_name || "Student",
      email: recipient_email,
      password: password || "(use the password you set or reset it from login)",
      course: course_name || "your course",
      amount: String(amount ?? ""),
      dashboard_link: tpl.dashboard_link,
      support_email: tpl.support_email,
      support_phone: tpl.support_phone,
    };

    const subject = render(tpl.subject, vars);
    const htmlContent = render(tpl.body_html, vars);

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: recipient_email, name: recipient_name || undefined }],
        subject,
        htmlContent,
      }),
    });
    const brevoJson = await brevoRes.json();

    const status = brevoRes.ok ? "sent" : "failed";
    await admin.from("welcome_email_logs").insert({
      user_id,
      recipient_email,
      recipient_name,
      course_name,
      amount: amount ? Number(amount) : null,
      status,
      error_message: brevoRes.ok ? null : JSON.stringify(brevoJson),
      brevo_message_id: brevoJson?.messageId || null,
      metadata: { test, subject },
    });

    if (!brevoRes.ok) {
      return new Response(JSON.stringify({ success: false, error: brevoJson }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: brevoJson?.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-welcome-email error", e);
    try {
      await admin.from("welcome_email_logs").insert({
        recipient_email: payload?.recipient_email || "unknown",
        recipient_name: payload?.recipient_name || null,
        course_name: payload?.course_name || null,
        status: "failed",
        error_message: (e as Error).message,
      });
    } catch (_) {}
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
