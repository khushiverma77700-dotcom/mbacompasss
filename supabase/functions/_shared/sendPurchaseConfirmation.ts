// Shared helper: enqueue a purchase confirmation email with account credentials
// and a dashboard access link. Non-blocking — never throws to the caller.

const SENDER_DOMAIN = "alert.mbacompass.in";
const SENDER_FROM = "MBA Compass <no-reply@alert.mbacompass.in>";
const DASHBOARD_URL = "https://dashboard.mbacompass.in";

interface Args {
  admin: any;
  userId: string;
  productTitle: string;
  productKind: "course" | "bundle" | "mock";
  amount?: number | null;
  orderId?: string | null;
}

export async function sendPurchaseConfirmation({
  admin,
  userId,
  productTitle,
  productKind,
  amount,
  orderId,
}: Args): Promise<void> {
  try {
    // Get user email + profile name
    const { data: userRes } = await admin.auth.admin.getUserById(userId);
    const email = userRes?.user?.email;
    if (!email) {
      console.warn("purchase-conf: no email for user", userId);
      return;
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, first_name")
      .eq("id", userId)
      .maybeSingle();
    const displayName =
      profile?.full_name ||
      profile?.first_name ||
      (userRes?.user?.user_metadata?.full_name as string | undefined) ||
      (userRes?.user?.user_metadata?.name as string | undefined) ||
      email.split("@")[0];

    // Generate a magic sign-in link so they can access without password
    let magicLink = DASHBOARD_URL;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${DASHBOARD_URL}/student` },
      });
      if (linkData?.properties?.action_link) {
        magicLink = linkData.properties.action_link;
      }
    } catch (e) {
      console.warn("purchase-conf: magic link gen failed", e);
    }

    const kindLabel =
      productKind === "course" ? "course" : productKind === "bundle" ? "mock bundle" : "mock test";
    const subject = `${displayName}, your ${productTitle} is ready`;

    const priceLine =
      typeof amount === "number" && amount > 0
        ? `<tr><td style="padding:6px 0;color:#64748b">Amount paid</td><td style="padding:6px 0;text-align:right"><strong>₹${(amount / 100).toFixed(0)}</strong></td></tr>`
        : "";

    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05)">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a">Welcome, ${escapeHtml(displayName)} 🎉</h1>
    <p style="margin:0 0 20px;color:#475569;line-height:1.6">Your payment has been received and your ${kindLabel} is now active. Here are your account details and access link.</p>

    <div style="background:#f1f5f9;border-radius:12px;padding:16px 20px;margin:16px 0">
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#64748b">Purchased</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(productTitle)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Login (User ID)</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(email)}</strong></td></tr>
        ${priceLine}
        ${orderId ? `<tr><td style="padding:6px 0;color:#64748b">Order ID</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px">${escapeHtml(orderId)}</td></tr>` : ""}
      </table>
    </div>

    <div style="text-align:center;margin:28px 0 8px">
      <a href="${magicLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">Open my dashboard →</a>
    </div>
    <p style="text-align:center;margin:4px 0 24px;color:#94a3b8;font-size:12px">One-click sign-in — no password needed. Link valid for 1 hour.</p>

    <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:20px;color:#475569;font-size:14px;line-height:1.6">
      <strong style="color:#0f172a">Set or reset your password</strong><br/>
      Visit <a href="${DASHBOARD_URL}/forgot-password" style="color:#2563eb">${DASHBOARD_URL}/forgot-password</a> using this email to set a permanent password for future logins.
    </div>

    <div style="margin-top:24px;color:#64748b;font-size:13px;line-height:1.6">
      Need help? Reply to this email or write to <a href="mailto:admin@mbacompass.in" style="color:#2563eb">admin@mbacompass.in</a>.<br/><br/>
      All the best,<br/>Team MBA Compass
    </div>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">© MBA Compass · India's #1 MBA Coaching Platform</p>
</div></body></html>`;

    const text = `Welcome, ${displayName}!

Your payment was received and your ${kindLabel} "${productTitle}" is now active.

Login: ${email}
${orderId ? `Order ID: ${orderId}\n` : ""}
Open your dashboard (one-click sign-in): ${magicLink}

Set a permanent password: ${DASHBOARD_URL}/forgot-password

Need help? admin@mbacompass.in
Team MBA Compass`;

    const messageId = `purchase_${productKind}_${orderId ?? crypto.randomUUID()}`;

    const { error } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: email,
        from: SENDER_FROM,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
        label: "purchase_confirmation",
        idempotency_key: messageId,
        message_id: messageId,
        queued_at: new Date().toISOString(),
      },
    });
    if (error) {
      console.error("purchase-conf: enqueue_email failed", error);
      return;
    }

    // Wake the queue so the email goes out promptly
    try {
      await admin.rpc("email_queue_wake");
    } catch (e) {
      console.warn("purchase-conf: email_queue_wake failed (non-fatal)", e);
    }
  } catch (e) {
    console.error("purchase-conf: unexpected error", e);
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
