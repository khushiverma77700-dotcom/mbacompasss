import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SENDER_DOMAIN = "notify.mail.mbacompass.in";
const SENDER_FROM = "MBA Compass <no-reply@notify.mail.mbacompass.in>";

export type EmailAudience = "all" | "enrolled" | "selected";

interface SendInput {
  subject: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  audience: EmailAudience;
  selectedEmails?: string[];
}

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHtml(subject: string, body: string, ctaUrl?: string, ctaLabel?: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;color:#475569;line-height:1.7">${escapeHtml(p).replaceAll("\n", "<br/>")}</p>`)
    .join("");
  const cta = ctaUrl
    ? `<div style="text-align:center;margin:28px 0 8px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">${escapeHtml(ctaLabel || "View details")} →</a></div>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05)">
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a">${escapeHtml(subject)}</h1>
    ${paragraphs}
    ${cta}
    <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:24px;color:#64748b;font-size:13px;line-height:1.6">
      Need help? Write to <a href="mailto:admin@mbacompass.in" style="color:#2563eb">admin@mbacompass.in</a>.<br/><br/>
      All the best,<br/>Team MBA Compass
    </div>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">© MBA Compass · India's #1 MBA Coaching Platform</p>
</div></body></html>`;
}

async function requireAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

async function resolveRecipients(admin: any, audience: EmailAudience, selectedEmails?: string[]) {
  if (audience === "selected") {
    return (selectedEmails ?? []).map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  }
  let userIds: string[] = [];
  if (audience === "enrolled") {
    const { data } = await admin.from("mock_enrollments").select("user_id");
    userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean)));
  } else {
    const { data } = await admin.from("profiles").select("user_id").not("user_id", "is", null).limit(10000);
    userIds = (data ?? []).map((p: any) => p.user_id).filter(Boolean);
  }
  const emails: string[] = [];
  for (const uid of userIds) {
    const { data } = await admin.auth.admin.getUserById(uid);
    if (data?.user?.email) emails.push(data.user.email.toLowerCase());
  }
  return Array.from(new Set(emails));
}

export const getEmailAudienceCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count: all }, { data: enrolledRows }] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }).not("user_id", "is", null),
      supabaseAdmin.from("mock_enrollments").select("user_id"),
    ]);
    const enrolled = new Set((enrolledRows ?? []).map((r: any) => r.user_id).filter(Boolean)).size;
    return { all: all ?? 0, enrolled };
  });

export const listEmailCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("email_campaigns")
      .select("id, subject, audience, recipient_count, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const sendEmailCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendInput) => {
    if (!input?.subject?.trim()) throw new Error("Subject is required");
    if (!input?.body?.trim()) throw new Error("Message body is required");
    if (!["all", "enrolled", "selected"].includes(input.audience)) throw new Error("Invalid audience");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const recipients = await resolveRecipients(supabaseAdmin, data.audience, data.selectedEmails);
    if (!recipients.length) throw new Error("No recipients found for this audience");

    const html = buildHtml(data.subject, data.body, data.ctaUrl, data.ctaLabel);
    const text = `${data.subject}\n\n${data.body}\n\n${data.ctaUrl ? `${data.ctaLabel || "View details"}: ${data.ctaUrl}\n\n` : ""}Team MBA Compass`;
    const campaignId = crypto.randomUUID();

    let queued = 0;
    let failed = 0;
    const { data: suppressedRows } = await (supabaseAdmin as any)
      .from("suppressed_emails")
      .select("email")
      .in("email", recipients);
    const suppressed = new Set((suppressedRows ?? []).map((r: any) => String(r.email).toLowerCase()));
    for (const email of recipients) {
      if (suppressed.has(email)) { failed++; continue; }
      // Every send needs an unsubscribe token (one per address).
      let unsubscribeToken: string | undefined;
      const { data: existing } = await (supabaseAdmin as any)
        .from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle();
      if (existing?.token) {
        unsubscribeToken = existing.token;
      } else {
        const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
        const { error: tokErr } = await (supabaseAdmin as any)
          .from("email_unsubscribe_tokens").insert({ token, email });
        if (tokErr) {
          const { data: again } = await (supabaseAdmin as any)
            .from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle();
          unsubscribeToken = again?.token;
        } else unsubscribeToken = token;
      }
      if (!unsubscribeToken) { failed++; continue; }
      const messageId = `admin_campaign_${campaignId}_${email}`;
      const { error } = await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          unsubscribe_token: unsubscribeToken,
          to: email,
          from: SENDER_FROM,
          sender_domain: SENDER_DOMAIN,
          subject: data.subject,
          html,
          text,
          purpose: "transactional",
          label: "admin_campaign",
          idempotency_key: messageId,
          message_id: messageId,
          queued_at: new Date().toISOString(),
        },
      });
      if (error) failed++; else queued++;
    }

    await (supabaseAdmin as any).from("email_campaigns").insert({
      id: campaignId,
      subject: data.subject,
      body: data.body,
      cta_url: data.ctaUrl || null,
      cta_label: data.ctaLabel || null,
      audience: data.audience,
      recipient_count: queued,
      failed_count: failed,
      status: failed > 0 && queued === 0 ? "failed" : "queued",
      created_by: context.userId,
    });

    try {
      await (supabaseAdmin as any).rpc("email_queue_wake");
    } catch {
      // non-fatal
    }

    return { queued, failed, campaignId };
  });
