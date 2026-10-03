import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SENDER_DOMAIN = "notify.mail.mbacompass.in";
const SENDER_EMAIL = "no-reply@notify.mail.mbacompass.in";
const SITE_URL = "https://mbacompass.in";

export type EmailAudience = "all" | "enrolled" | "selected" | "list" | "test";
export interface EmailCta { label: string; url: string }

interface SendInput {
  name: string;
  fromName?: string;
  subject: string;
  heading?: string;
  bodyHtml: string;
  ctas?: EmailCta[];
  audience: EmailAudience;
  listId?: string;
  selectedEmails?: string[];
  testEmail?: string;
  templateId?: string;
  templateName?: string;
  intervalSeconds?: number;
  batchSize?: number;
  senderIdentityId?: string;
}

interface Recipient { email: string; name?: string | null; vars: Record<string, string>; isTest?: boolean }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Replace {{var}} / {{var|fallback}} tokens. */
export function personalize(input: string, vars: Record<string, string>, html: boolean): string {
  return (input || "").replace(/\{\{\s*([\w.-]+)\s*(?:\|\s*([^}]*))?\}\}/g, (_m, key: string, fb?: string) => {
    const v = vars[key.toLowerCase()] ?? "";
    const out = String(v).trim() || (fb ?? "").trim();
    return html ? escapeHtml(out) : out;
  });
}

function extractLinks(html: string, ctas: EmailCta[]): string[] {
  const set = new Set<string>();
  for (const m of (html || "").matchAll(/href\s*=\s*"([^"]+)"/gi)) set.add(m[1].replaceAll("&amp;", "&"));
  for (const c of ctas) if (c.url) set.add(c.url);
  return [...set].filter((u) => /^https?:\/\//i.test(u));
}

function trackUrl(token: string, url: string) {
  return `${SITE_URL}/api/public/email/click/${token}?u=${encodeURIComponent(url)}`;
}

function buildHtml(opts: {
  heading: string; bodyHtml: string; ctas: EmailCta[]; token: string; preheader: string;
}): string {
  const body = opts.bodyHtml
    .replace(/href\s*=\s*"(https?:\/\/[^"]+)"/gi, (_m, u: string) => `href="${trackUrl(opts.token, u.replaceAll("&amp;", "&"))}"`)
    .replace(/<img (?![^>]*style=)/gi, '<img style="max-width:100%;height:auto;border-radius:8px" ');
  const ctas = opts.ctas
    .filter((c) => c.url && c.label)
    .map((c, i) => `<a href="${trackUrl(opts.token, c.url)}" style="display:inline-block;margin:6px;${i === 0 ? "background:#2563eb;color:#ffffff" : "background:#ffffff;color:#2563eb;border:1px solid #2563eb"};text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:600;font-size:15px">${escapeHtml(c.label)}</a>`)
    .join("");
  const bg = /data-bg="(#[0-9a-fA-F]{3,8})"/.exec(opts.bodyHtml)?.[1] || "#ffffff";
  const card = /data-card="(#[0-9a-fA-F]{3,8})"/.exec(opts.bodyHtml)?.[1] || "#ffffff";
  return `<!doctype html><html><body style="margin:0;padding:0;background:${bg};font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
  <div style="background:${card};border:1px solid #e2e8f0;border-radius:16px;padding:32px">
    ${opts.heading ? `<h1 style="margin:0 0 16px;font-size:22px;color:#0f172a">${opts.heading}</h1>` : ""}
    <div style="color:#475569;line-height:1.7;font-size:15px">${body}</div>
    ${ctas ? `<div style="text-align:center;margin:28px 0 8px">${ctas}</div>` : ""}
    <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:24px;color:#64748b;font-size:13px;line-height:1.6">
      Need help? Write to <a href="mailto:admin@mbacompass.in" style="color:#2563eb">admin@mbacompass.in</a>.<br/>Team MBA Compass
    </div>
  </div>
</div>
<img src="${SITE_URL}/api/public/email/open/${opts.token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />
</body></html>`;
}

function htmlToText(html: string) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|h\d|li|div)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

async function requireAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

async function listAuthUsers(admin: any): Promise<Map<string, { email: string; name?: string }>> {
  const map = new Map<string, { email: string; name?: string }>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    const users = data?.users ?? [];
    for (const u of users) if (u.email) map.set(u.id, { email: u.email.toLowerCase(), name: u.user_metadata?.full_name || u.user_metadata?.name });
    if (users.length < 1000) break;
  }
  return map;
}

async function resolveRecipients(admin: any, d: SendInput): Promise<Recipient[]> {
  const out = new Map<string, Recipient>();
  const add = (email: string, name?: string | null, vars: Record<string, string> = {}) => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e) || out.has(e)) return;
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(vars)) lower[k.toLowerCase()] = String(v ?? "");
    lower.email = e;
    if (name) lower.name = lower.name || name;
    lower.first_name = lower.first_name || (lower.name || "").split(" ")[0];
    out.set(e, { email: e, name: name ?? null, vars: lower });
  };
  if (d.audience === "test") add(d.testEmail || "", "Test", {});
  else if (d.audience === "selected") (d.selectedEmails ?? []).forEach((e) => add(e));
  else if (d.audience === "list") {
    if (!d.listId) throw new Error("Choose a contact list");
    for (let from = 0; ; from += 1000) {
      const { data } = await admin.from("email_contacts").select("email,name,vars").eq("list_id", d.listId).range(from, from + 999);
      (data ?? []).forEach((c: any) => add(c.email, c.name, c.vars ?? {}));
      if (!data || data.length < 1000) break;
    }
  } else {
    const users = await listAuthUsers(admin);
    if (d.audience === "enrolled") {
      const { data } = await admin.from("mock_enrollments").select("user_id");
      const ids = new Set((data ?? []).map((r: any) => r.user_id));
      for (const id of ids) { const u = users.get(id as string); if (u) add(u.email, u.name); }
    } else for (const u of users.values()) add(u.email, u.name);
  }
  return [...out.values()];
}

async function tokensFor(admin: any, emails: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 200) {
    const chunk = emails.slice(i, i + 200);
    const { data } = await admin.from("email_unsubscribe_tokens").select("token,email").in("email", chunk);
    (data ?? []).forEach((r: any) => map.set(String(r.email).toLowerCase(), r.token));
  }
  const missing = emails.filter((e) => !map.has(e));
  for (let i = 0; i < missing.length; i += 200) {
    const rows = missing.slice(i, i + 200).map((email) => ({ email, token: crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "") }));
    const { error } = await admin.from("email_unsubscribe_tokens").insert(rows);
    if (!error) rows.forEach((r) => map.set(r.email, r.token));
    else for (const r of rows) {
      const { error: e1 } = await admin.from("email_unsubscribe_tokens").insert(r);
      if (!e1) map.set(r.email, r.token);
      else {
        const { data } = await admin.from("email_unsubscribe_tokens").select("token").eq("email", r.email).maybeSingle();
        if (data?.token) map.set(r.email, data.token);
      }
    }
  }
  return map;
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

export const sendEmailCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendInput) => {
    if (!input?.subject?.trim()) throw new Error("Subject is required");
    if (!input?.bodyHtml?.replace(/<[^>]+>/g, "").trim() && !/<img/i.test(input?.bodyHtml || "")) throw new Error("Email body is required");
    if (!["all", "enrolled", "selected", "list", "test"].includes(input.audience)) throw new Error("Invalid audience");
    if ((input.ctas ?? []).length > 4) throw new Error("Maximum 4 buttons");
    for (const c of input.ctas ?? []) if (c.url && !/^https?:\/\//i.test(c.url)) throw new Error("Button links must start with http(s)://");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const ctas = (data.ctas ?? []).filter((c) => c.label?.trim() && c.url?.trim());

    const recipients = await resolveRecipients(admin, data);
    // Every real campaign also goes to the admin's Test Inboxes so placement can be checked by hand.
    if (data.audience !== "test") {
      const { data: seedLists } = await admin.from("email_contact_lists").select("id").eq("is_test_inbox", true);
      const ids = (seedLists ?? []).map((l: any) => l.id);
      if (ids.length) {
        const { data: seeds } = await admin.from("email_contacts").select("email,name").in("list_id", ids).limit(50);
        const have = new Map(recipients.map((r) => [r.email, r]));
        for (const c of seeds ?? []) {
          const e = String(c.email).trim().toLowerCase();
          if (!EMAIL_RE.test(e)) continue;
          const ex = have.get(e);
          if (ex) { ex.isTest = true; continue; }
          const r: Recipient = { email: e, name: c.name ?? "Test inbox", vars: { email: e, name: c.name || "Test inbox", first_name: (c.name || "Test").split(" ")[0] }, isTest: true };
          recipients.push(r); have.set(e, r);
        }
      }
    }
    if (!recipients.length) throw new Error("No valid recipients found");
    if (recipients.length > 20000) throw new Error("Maximum 20,000 recipients per campaign");

    const emails = recipients.map((r) => r.email);
    const suppressed = new Set<string>();
    for (let i = 0; i < emails.length; i += 200) {
      const { data: rows } = await admin.from("suppressed_emails").select("email").in("email", emails.slice(i, i + 200));
      (rows ?? []).forEach((r: any) => suppressed.add(String(r.email).toLowerCase()));
    }
    const sendable = recipients.filter((r) => !suppressed.has(r.email));
    const tokens = await tokensFor(admin, sendable.map((r) => r.email));

    const campaignId = crypto.randomUUID();
    let listName: string | null = null;
    if (data.audience === "list" && data.listId) {
      const { data: l } = await admin.from("email_contact_lists").select("name").eq("id", data.listId).maybeSingle();
      listName = l?.name ?? null;
    } else listName = { all: "All users", enrolled: "Enrolled students", selected: "Selected emails", test: "Test send" }[data.audience as "all"] ?? null;

    let fromName = (data.fromName || "MBA Compass").replace(/[<>"]/g, "").trim() || "MBA Compass";
    let fromEmail = SENDER_EMAIL;
    let sender: any = null;
    if (data.senderIdentityId) {
      const { data: sid } = await admin.from("email_sender_identities").select("*").eq("id", data.senderIdentityId).maybeSingle();
      if (!sid) throw new Error("Selected sender identity no longer exists");
      if (sid.status === "paused" && data.audience !== "test") throw new Error(`Sender "${sid.label}" is paused: ${sid.paused_reason || "resume it under Senders first"}`);
      sender = sid;
      fromName = String(sid.from_name).replace(/[<>"]/g, "").trim() || fromName;
      fromEmail = `${sid.local_part}@${SENDER_DOMAIN}`;
    }
    const { error: campErr } = await admin.from("email_campaigns").insert({
      id: campaignId,
      name: data.name?.trim() || data.subject,
      from_name: fromName,
      sender_identity_id: sender?.id ?? null,
      sender_label: sender?.label ?? null,
      subject: data.subject,
      heading: data.heading || null,
      body: htmlToText(data.bodyHtml),
      body_html: data.bodyHtml,
      ctas,
      cta_url: ctas[0]?.url ?? null,
      cta_label: ctas[0]?.label ?? null,
      audience: data.audience,
      list_id: data.listId || null,
      list_name: listName,
      template_id: data.templateId || null,
      template_name: data.templateName || null,
      recipient_count: 0,
      failed_count: suppressed.size,
      status: "sending",
      created_by: context.userId,
    });
    if (campErr) throw new Error(`Could not save campaign: ${campErr.message}`);

    let queued = 0;
    let failed = suppressed.size;
    const errors: string[] = [];
    if (suppressed.size) errors.push(`${suppressed.size} address(es) skipped: previously unsubscribed, bounced or complained.`);
    const recRows: any[] = [];
    for (const r of sendable) {
      const unsub = tokens.get(r.email);
      if (!unsub) { failed++; errors.push(`${r.email}: could not create an unsubscribe link, so it was not sent.`); continue; }
      const trackingToken = crypto.randomUUID().replaceAll("-", "");
      const messageId = `admin_campaign_${campaignId}_${r.email}`;
      const subject = personalize(data.subject, r.vars, false);
      const heading = personalize(data.heading || "", r.vars, true);
      const bodyHtml = personalize(data.bodyHtml, r.vars, true);
      const pCtas = ctas.map((c) => ({ label: personalize(c.label, r.vars, false), url: c.url }));
      const html = buildHtml({ heading, bodyHtml, ctas: pCtas, token: trackingToken, preheader: htmlToText(bodyHtml).slice(0, 120) });
      const text = `${htmlToText(heading)}\n\n${htmlToText(bodyHtml)}\n\n${pCtas.map((c) => `${c.label}: ${c.url}`).join("\n")}\n\nTeam MBA Compass`;
      queued++;
      recRows.push({
        campaign_id: campaignId, email: r.email, name: r.name ?? null, message_id: messageId, tracking_token: trackingToken,
        status: "waiting", queued_at: null, is_test_inbox: !!r.isTest,
        payload: {
          unsubscribe_token: unsub, to: r.email, from: `${fromName} <${fromEmail}>`, sender_domain: SENDER_DOMAIN,
          subject, html, text, purpose: "transactional", label: "admin_campaign",
          idempotency_key: messageId, message_id: messageId, queued_at: new Date().toISOString(),
        },
      });
    }
    for (let i = 0; i < recRows.length; i += 200) {
      const { error: recErr } = await admin.from("email_campaign_recipients").insert(recRows.slice(i, i + 200));
      if (recErr) { console.error("campaign recipients insert failed", recErr.message); errors.push(`Could not save ${recRows.slice(i, i + 200).length} recipient(s): ${recErr.message}`); queued -= recRows.slice(i, i + 200).length; failed += recRows.slice(i, i + 200).length; }
    }

    const isTest = data.audience === "test";
    await admin.from("email_campaigns").update({
      recipient_count: queued, failed_count: failed,
      status: queued === 0 ? "failed" : "running",
      last_error: errors.length ? errors.slice(0, 20).join("\n") : null,
      interval_seconds: isTest ? 5 : clampInt(data.intervalSeconds, 5, 86400, 30),
      batch_size: isTest ? 10 : clampInt(data.batchSize, 1, 2000, 100),
      next_send_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    }).eq("id", campaignId);
    if (queued === 0) throw new Error(`Campaign not sent. ${errors.join(" ") || "No recipient could be prepared."}`);
    const { error: wakeErr } = await admin.rpc("email_campaign_wake");
    if (wakeErr) errors.push(`Could not start the sending timer: ${wakeErr.message}`);
    const { error: tickErr } = await admin.rpc("email_campaign_tick");
    if (tickErr) errors.push(`First batch failed: ${tickErr.message}`);
    if (wakeErr || tickErr) await admin.from("email_campaigns").update({ last_error: errors.join("\n") }).eq("id", campaignId);
    return { queued, failed, suppressed: suppressed.size, campaignId, errors };
  });

function clampInt(v: unknown, min: number, max: number, fb: number) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
}

/** Change speed or pause/resume/stop a campaign. Speed changes apply to the remaining emails immediately. */
export const updateCampaignDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { campaignId: string; intervalSeconds?: number; batchSize?: number; action?: "pause" | "resume" | "stop" }) => {
    if (!i?.campaignId) throw new Error("campaignId required");
    return i;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: c } = await admin.from("email_campaigns").select("status,next_send_at").eq("id", data.campaignId).maybeSingle();
    if (!c) throw new Error("Campaign not found");
    const patch: Record<string, unknown> = {};
    if (data.intervalSeconds != null) patch.interval_seconds = clampInt(data.intervalSeconds, 5, 86400, 30);
    if (data.batchSize != null) patch.batch_size = clampInt(data.batchSize, 1, 2000, 100);
    if (data.intervalSeconds != null && c.status === "running") {
      // Re-time the next batch against the new interval so a faster speed takes effect right away.
      patch.next_send_at = new Date(Date.now() + Math.min(5, Number(patch.interval_seconds)) * 1000).toISOString();
    }
    if (data.action === "pause" && c.status === "running") patch.status = "paused";
    if (data.action === "resume" && c.status === "paused") { patch.status = "running"; patch.next_send_at = new Date().toISOString(); }
    if (data.action === "stop" && ["running", "paused", "queued", "sending"].includes(c.status)) {
      patch.status = "completed"; patch.completed_at = new Date().toISOString(); patch.next_send_at = null;
      await admin.from("email_campaign_recipients").update({ status: "cancelled", payload: null }).eq("campaign_id", data.campaignId).eq("status", "waiting");
    }
    const { error } = await admin.from("email_campaigns").update(patch).eq("id", data.campaignId);
    if (error) throw new Error(error.message);
    if (patch.status === "running") await admin.rpc("email_campaign_wake");
    return { ok: true };
  });

interface AnalyticsInput { from?: string; to?: string; campaignId?: string }

async function latestStatuses(admin: any, messageIds: string[]) {
  const map = new Map<string, { status: string; error: string | null }>();
  for (let i = 0; i < messageIds.length; i += 200) {
    const { data } = await admin.from("email_send_log").select("message_id,status,error_message,created_at")
      .in("message_id", messageIds.slice(i, i + 200)).order("created_at", { ascending: true });
    (data ?? []).forEach((r: any) => map.set(r.message_id, { status: r.status, error: r.error_message }));
  }
  return map;
}

/** Aggregated campaign analytics (sent, delivered, opened, clicked, bounced, failed). */
export const getEmailAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: AnalyticsInput) => i ?? {})
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    let q = admin.from("email_campaigns").select("id,name,subject,from_name,sender_label,audience,list_name,template_name,recipient_count,failed_count,status,created_at,interval_seconds,batch_size,sent_count,next_send_at,started_at,completed_at,last_error").order("created_at", { ascending: false }).limit(500);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.campaignId) q = q.eq("id", data.campaignId);
    const { data: campaigns } = await q;
    const ids = (campaigns ?? []).map((c: any) => c.id);
    const recs: any[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      for (let from = 0; ; from += 1000) {
        const { data: r } = await admin.from("email_campaign_recipients").select("id,campaign_id,email,name,is_test_inbox,message_id,status,queued_at,first_opened_at,first_clicked_at,open_count,click_count").in("campaign_id", ids.slice(i, i + 50)).range(from, from + 999);
        recs.push(...(r ?? []));
        if (!r || r.length < 1000) break;
      }
    }
    const statuses = await latestStatuses(admin, recs.filter((r) => r.status !== "waiting" && r.status !== "cancelled").map((r) => r.message_id));
    const blank = () => ({ total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0, pending: 0, remaining: 0 });
    const per = new Map<string, ReturnType<typeof blank>>();
    const daily = new Map<string, ReturnType<typeof blank>>();
    const hourly = new Map<string, ReturnType<typeof blank>>();
    const since24 = Date.now() - 864e5;
    const day = (s: string) => s.slice(0, 10);
    const hour = (s: string) => s.slice(0, 13);
    const bump = (m: Map<string, any>, k: string, f: string) => { if (!m.has(k)) m.set(k, blank()); m.get(k)[f]++; };
    const bumpH = (s: string, f: string) => { if (new Date(s).getTime() >= since24) bump(hourly, hour(new Date(s).toISOString()), f); };
    for (const r of recs) {
      if (r.status === "cancelled") continue;
      bump(per, r.campaign_id, "total");
      if (r.status === "waiting" || !r.queued_at) { bump(per, r.campaign_id, "remaining"); continue; }
      const st = r.status === "failed" ? "failed" : statuses.get(r.message_id)?.status ?? "pending";
      bump(per, r.campaign_id, "sent"); bump(daily, day(r.queued_at), "sent"); bumpH(r.queued_at, "sent");
      const bucket = st === "sent" ? "delivered" : st === "bounced" || st === "complained" ? "bounced" : st === "dlq" || st === "failed" || st === "suppressed" ? "failed" : "pending";
      bump(per, r.campaign_id, bucket); bump(daily, day(r.queued_at), bucket); bumpH(r.queued_at, bucket);
      if (r.first_opened_at) { bump(per, r.campaign_id, "opened"); bump(daily, day(r.first_opened_at), "opened"); bumpH(r.first_opened_at, "opened"); }
      if (r.first_clicked_at) { bump(per, r.campaign_id, "clicked"); bump(daily, day(r.first_clicked_at), "clicked"); bumpH(r.first_clicked_at, "clicked"); }
    }
    // Per-recipient engagement from tracking events (last activity, distinct devices for possible forwards).
    const act = new Map<string, { last: string; uas: Set<string> }>();
    for (let i = 0; i < ids.length; i += 50) {
      for (let from = 0; ; from += 1000) {
        const { data: ev } = await admin.from("email_tracking_events").select("recipient_id,event_type,user_agent,created_at").in("campaign_id", ids.slice(i, i + 50)).order("created_at").range(from, from + 999);
        for (const e of ev ?? []) {
          if (!e.recipient_id) continue;
          const a = act.get(e.recipient_id) ?? { last: e.created_at, uas: new Set<string>() };
          if (e.created_at > a.last) a.last = e.created_at;
          if (e.user_agent) a.uas.add(String(e.user_agent).replace(/\d+/g, ""));
          act.set(e.recipient_id, a);
        }
        if (!ev || ev.length < 1000) break;
      }
    }
    const cname = new Map((campaigns ?? []).map((c: any) => [c.id, c.name || c.subject]));
    const engagement = recs.filter((r) => r.status !== "cancelled").map((r) => {
      const sent = r.status !== "waiting" && !!r.queued_at;
      const st = !sent ? "waiting" : r.status === "failed" ? "failed" : statuses.get(r.message_id)?.status ?? "pending";
      const delivery = !sent ? "waiting" : st === "sent" ? "delivered" : st === "bounced" || st === "complained" ? "bounced" : st === "dlq" || st === "failed" || st === "suppressed" ? "failed" : "pending";
      const a = act.get(r.id);
      const opens = r.open_count ?? 0, clicks = r.click_count ?? 0;
      return {
        id: r.id, campaign_id: r.campaign_id, campaign: cname.get(r.campaign_id) ?? "", name: r.name, email: r.email, test: !!r.is_test_inbox,
        sent, sent_at: r.queued_at, delivery, opened: !!r.first_opened_at, open_count: opens, first_opened_at: r.first_opened_at,
        // "Read" = opened and engaged beyond a single (possibly pre-fetched) pixel load.
        read: !!r.first_opened_at && (opens >= 2 || clicks > 0),
        clicked: !!r.first_clicked_at, click_count: clicks,
        devices: a?.uas.size ?? 0, possible_forward: (a?.uas.size ?? 0) >= 3,
        last_activity: a?.last ?? r.first_clicked_at ?? r.first_opened_at ?? r.queued_at ?? null,
      };
    }).sort((x, y) => String(y.last_activity ?? "").localeCompare(String(x.last_activity ?? "")));
    const rows = (campaigns ?? []).map((c: any) => ({ ...c, stats: per.get(c.id) ?? blank() }));
    const totals = rows.reduce((a: any, r: any) => { for (const k of Object.keys(a)) a[k] += r.stats[k]; return a; }, blank());
    let cum = blank();
    const series = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, s]) => {
      cum = Object.fromEntries(Object.keys(cum).map((k) => [k, (cum as any)[k] + (s as any)[k]])) as any;
      return { date, ...s, cumSent: cum.sent, cumDelivered: cum.delivered, cumOpened: cum.opened, cumClicked: cum.clicked, cumFailed: cum.failed + cum.bounced };
    });
    const hourlySeries = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(Date.now() - (23 - i) * 36e5);
      const k = d.toISOString().slice(0, 13);
      return { hour: `${String(d.getHours()).padStart(2, "0")}:00`, ...(hourly.get(k) ?? blank()) };
    });
    return { campaigns: rows, totals, series, hourlySeries, engagement };
  });

/** Per-recipient report for one campaign. */
export const getCampaignRecipients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { campaignId: string }) => { if (!i?.campaignId) throw new Error("campaignId required"); return i; })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: recs } = await admin.from("email_campaign_recipients").select("id,email,name,message_id,status,error,is_test_inbox,placement,queued_at,first_opened_at,open_count,first_clicked_at,click_count").eq("campaign_id", data.campaignId).order("queued_at").limit(5000);
    const statuses = await latestStatuses(admin, (recs ?? []).map((r: any) => r.message_id));
    const { data: events } = await admin.from("email_tracking_events").select("event_type,url,created_at").eq("campaign_id", data.campaignId).order("created_at").limit(10000);
    const links = new Map<string, number>();
    (events ?? []).filter((e: any) => e.event_type === "click" && e.url).forEach((e: any) => links.set(e.url, (links.get(e.url) ?? 0) + 1));
    return {
      recipients: (recs ?? []).map((r: any) => ({ ...r, status: statuses.get(r.message_id)?.status ?? "pending", error: r.error ?? statuses.get(r.message_id)?.error ?? null })),
      events: events ?? [],
      links: [...links.entries()].map(([url, clicks]) => ({ url, clicks })).sort((a, b) => b.clicks - a.clicks),
    };
  });

export { extractLinks };

/** Sender identities with today's usage and 7-day health. */
export const getSenderIdentities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: ids } = await admin.from("email_sender_identities").select("*").order("created_at");
    const istMidnight = new Date(); istMidnight.setUTCHours(-5, -30, 0, 0);
    if (istMidnight.getTime() > Date.now()) istMidnight.setUTCDate(istMidnight.getUTCDate() - 1);
    const out = [];
    for (const s of ids ?? []) {
      const { data: camps } = await admin.from("email_campaigns").select("id").eq("sender_identity_id", s.id);
      const cids = (camps ?? []).map((c: any) => c.id);
      let today = 0; const recent: any[] = [];
      if (cids.length) {
        const { count } = await admin.from("email_campaign_recipients").select("id", { count: "exact", head: true }).in("campaign_id", cids).eq("status", "queued").eq("is_test_inbox", false).gte("queued_at", istMidnight.toISOString());
        today = count ?? 0;
        const { data: r } = await admin.from("email_campaign_recipients").select("message_id").in("campaign_id", cids).gte("queued_at", new Date(Date.now() - 7 * 864e5).toISOString()).limit(5000);
        recent.push(...(r ?? []));
      }
      const st = await latestStatuses(admin, recent.map((r) => r.message_id));
      let bounced = 0, complained = 0;
      st.forEach((v) => { if (v.status === "bounced") bounced++; if (v.status === "complained") complained++; });
      // All-time performance for the sender comparison report.
      const all: any[] = [];
      for (let i = 0; i < cids.length; i += 50) {
        for (let from = 0; ; from += 1000) {
          const { data: r } = await admin.from("email_campaign_recipients").select("message_id,status,first_opened_at,first_clicked_at").in("campaign_id", cids.slice(i, i + 50)).not("queued_at", "is", null).neq("status", "cancelled").neq("status", "waiting").range(from, from + 999);
          all.push(...(r ?? []));
          if (!r || r.length < 1000) break;
        }
      }
      const allSt = await latestStatuses(admin, all.map((r) => r.message_id).filter(Boolean));
      const perf = { sent: all.length, delivered: 0, opened: 0, clicked: 0, failed: 0 };
      for (const r of all) {
        const x = r.status === "failed" ? "failed" : allSt.get(r.message_id)?.status;
        if (x === "sent") perf.delivered++; else if (x && x !== "pending") perf.failed++;
        if (r.first_opened_at) perf.opened++;
        if (r.first_clicked_at) perf.clicked++;
      }
      out.push({ ...s, today, week: recent.length, bounced, complained, campaigns: cids.length, perf });
    }
    return out;
  });
