// Public "magic link" content editor backend.
// A share token (created by an admin) grants edit rights to ONE college /
// article / exam record. All reads and writes go through this function, which
// validates the token server-side with the service-role key. The token holder
// never gets direct database access.
//
// Every save (manual or AI SEO) is logged to public.magic_link_edits and
// emailed to the master admin so nothing changes silently.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";
import { callAIGateway } from "../_shared/aiGateway.ts";
import { CONFIG, coercePatch, diffFields, editableKeys, selectKeys, type EntityType } from "./fields.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SEO_FIELDS = ["meta_title", "meta_description", "h1_tag", "primary_keyword", "keywords"];
const ADMIN_EMAIL = Deno.env.get("MASTER_ADMIN_EMAIL") || "admin@mbacompass.in";
const SENDER_DOMAIN = "notify.mbacompass.in";
const SENDER_FROM = `MBA Compass <no-reply@${SENDER_DOMAIN}>`;

const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

async function resolveLink(token: string) {
  const sb = admin();
  const { data: link, error } = await sb
    .from("content_magic_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!link) return { error: json({ error: "This edit link does not exist." }, 404) };
  if (!link.active) return { error: json({ error: "This edit link has been switched off by the site admin." }, 403) };
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return { error: json({ error: "This edit link has expired." }, 403) };
  }
  return { link, sb };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const pretty = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Log the change and email the master admin. Never throws. */
async function notifyAdmin(sb: any, opts: {
  link: any;
  cfg: typeof CONFIG[EntityType];
  type: EntityType;
  diff: Record<string, { old: unknown; new: unknown }>;
  source: string;
  slug: string;
  title: string;
}) {
  const { link, cfg, type, diff, source, slug, title } = opts;
  const keys = Object.keys(diff);
  if (!keys.length) return;
  try {
    const { data: logRow } = await sb
      .from("magic_link_edits")
      .insert({
        link_id: link.id,
        entity_type: type,
        entity_id: link.entity_id,
        entity_title: title || link.entity_title || null,
        entity_slug: slug || link.entity_slug || null,
        source,
        field_count: keys.length,
        changed_fields: diff,
      })
      .select("id")
      .single();

    const publicUrl = `https://mbacompass.in${cfg.publicPath(slug)}`;
    const rows = keys.map((k) => {
      const d = diff[k];
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e6eef7;font-weight:600;vertical-align:top">${esc(pretty(k))}</td>
        <td style="padding:8px;border-bottom:1px solid #e6eef7;color:#64748b;vertical-align:top">${esc(String(d.old ?? "—"))}</td>
        <td style="padding:8px;border-bottom:1px solid #e6eef7;vertical-align:top">${esc(String(d.new ?? "—"))}</td>
      </tr>`;
    }).join("");

    const subject = `Magic link edit: ${title || slug} (${keys.length} field${keys.length > 1 ? "s" : ""})`;
    const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f9ff;padding:24px">
<div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #dbe9f8;border-radius:12px;padding:24px">
  <h1 style="font-size:22px;margin:0 0 8px">${esc(cfg.label)} updated via magic link</h1>
  <p style="margin:0 0 4px"><strong>${esc(title || slug)}</strong></p>
  <p style="margin:0 0 4px;color:#475569">Page: <a href="${publicUrl}">${publicUrl}</a></p>
  <p style="margin:0 0 4px;color:#475569">Shared with: ${esc(link.note || "not noted")}</p>
  <p style="margin:0 0 16px;color:#475569">Change type: ${esc(source === "ai_seo" ? "AI SEO applied" : "Manual save")} · ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead><tr style="background:#eff6ff;text-align:left">
      <th style="padding:8px">Field</th><th style="padding:8px">Before</th><th style="padding:8px">After</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin:16px 0 0;color:#64748b;font-size:13px">Review or revert in Admin → ${esc(cfg.label)}s.</p>
</div></body></html>`;

    const text = `${cfg.label} updated via magic link: ${title || slug}\n${publicUrl}\n\n` +
      keys.map((k) => `${pretty(k)}\n  before: ${diff[k].old ?? "—"}\n  after: ${diff[k].new ?? "—"}`).join("\n\n");

    const messageId = `magic_edit_${logRow?.id ?? crypto.randomUUID()}`;
    const { error: mailErr } = await sb.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: ADMIN_EMAIL,
        from: SENDER_FROM,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
        label: "magic_link_edit_notification",
        idempotency_key: messageId,
        message_id: messageId,
        queued_at: new Date().toISOString(),
      },
    });
    if (mailErr) {
      console.error("[magic-edit] notify enqueue failed", mailErr);
      return;
    }
    try { await sb.rpc("email_queue_wake"); } catch { /* best effort */ }
    if (logRow?.id) await sb.from("magic_link_edits").update({ notified: true }).eq("id", logRow.id);
  } catch (e) {
    console.error("[magic-edit] notifyAdmin failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "load");
    const token = String(body?.token || "").trim();
    if (!token) return json({ error: "Missing token" }, 400);

    const resolved = await resolveLink(token);
    if (resolved.error) return resolved.error;
    const { link, sb } = resolved;
    const type = link.entity_type as EntityType;
    const cfg = CONFIG[type];
    if (!cfg) return json({ error: "Unsupported content type" }, 400);

    const loadRecord = async () => {
      const { data, error } = await sb
        .from(cfg.table)
        .select(selectKeys(cfg).join(", "))
        .eq("id", link.entity_id)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    };

    const meta = {
      entityType: type,
      label: cfg.label,
      titleField: cfg.titleField,
      bodyField: cfg.bodyField,
      editableFields: editableKeys(cfg),
      seoFields: SEO_FIELDS,
      note: link.note ?? null,
    };

    // ── LOAD ──────────────────────────────────────────────────────────────
    if (action === "load") {
      const record = await loadRecord();
      if (!record) return json({ error: "The linked page no longer exists." }, 404);
      await sb
        .from("content_magic_links")
        .update({ opened_count: (link.opened_count || 0) + 1, last_opened_at: new Date().toISOString() })
        .eq("id", link.id);
      return json({
        ...meta,
        publicUrl: `https://mbacompass.in${cfg.publicPath(record.slug)}`,
        record,
      });
    }

    // ── UPLOAD (images) ───────────────────────────────────────────────────
    // Magic-link holders are anonymous, so the file is streamed through this
    // function and written to the public `uploads` bucket with the service key.
    if (action === "upload") {
      const dataUrl = String(body?.file || "");
      const folder = String(body?.folder || "magic").replace(/[^a-zA-Z0-9/_-]/g, "");
      const m = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
      if (!m) return json({ error: "Invalid file payload" }, 400);
      const contentType = m[1];
      if (!contentType.startsWith("image/")) return json({ error: "Only image files are allowed." }, 400);
      const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
      if (bytes.byteLength > 6 * 1024 * 1024) return json({ error: "Image must be under 6 MB." }, 400);
      const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg").slice(0, 5);
      const path = `${folder}/magic-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await sb.storage.from("uploads").upload(path, bytes, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) return json({ error: upErr.message }, 500);
      const { data: pub } = sb.storage.from("uploads").getPublicUrl(path);
      return json({ ok: true, url: pub.publicUrl });
    }

    // ── SAVE ──────────────────────────────────────────────────────────────
    if (action === "save") {
      const before = await loadRecord();
      if (!before) return json({ error: "The linked page no longer exists." }, 404);

      const update = coercePatch(cfg, (body?.values || {}) as Record<string, any>);
      if (!Object.keys(update).length) return json({ error: "Nothing to save" }, 400);
      update.updated_at = new Date().toISOString();

      const { error } = await sb.from(cfg.table).update(update).eq("id", link.entity_id);
      if (error) throw error;

      await sb
        .from("content_magic_links")
        .update({ saved_count: (link.saved_count || 0) + 1, last_saved_at: new Date().toISOString() })
        .eq("id", link.id);

      const record = await loadRecord();
      const diff = diffFields(before, record || {}, editableKeys(cfg));
      await notifyAdmin(sb, {
        link, cfg, type, diff, source: "manual_save",
        slug: String(record?.slug || ""),
        title: String(record?.[cfg.titleField] || ""),
      });

      return json({ ok: true, record, changedFields: Object.keys(diff) });
    }

    // ── AI SEO ────────────────────────────────────────────────────────────
    if (action === "ai_seo") {
      const record = await loadRecord();
      if (!record) return json({ error: "The linked page no longer exists." }, 404);

      const title = String(record[cfg.titleField] || "");
      const plain = String(record[cfg.bodyField] || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 6000);

      const prompt = `You are an expert Indian MBA-education SEO/AEO/GEO strategist.
Optimise the page below for ONE primary keyword plus supporting keywords.

Page type: ${cfg.label}
Page title: ${title}
Page URL: https://mbacompass.in${cfg.publicPath(String(record.slug || ""))}
Current meta title: ${record.meta_title || "(none)"}
Current meta description: ${record.meta_description || "(none)"}
Content excerpt: ${plain || "(no content yet)"}

Return STRICT JSON only, no markdown:
{
  "primary_keyword": "high-intent keyword students actually search",
  "meta_title": "50-60 characters, primary keyword near the front",
  "meta_description": "150-160 characters, primary keyword in first 120 chars, ends with an action cue",
  "h1_tag": "unique from meta title, includes primary keyword naturally",
  "keywords": ["12 specific keywords, mix of short-tail and long-tail question phrases"],
  "notes": ["3 short, concrete improvement suggestions for this page"]
}`;

      const res = await callAIGateway(
        {
          model: "gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 1200,
        },
        { feature: "magic-edit-ai-seo", purpose: "structured" },
      );
      if (!res.ok) {
        const t = await res.text();
        console.error("[magic-edit] AI error", res.status, t.slice(0, 400));
        return json({ error: "AI SEO is busy right now. Please try again in a moment." }, 502);
      }
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content ?? "";
      let parsed: any = {};
      try {
        const cleaned = String(raw).replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
      } catch {
        return json({ error: "Could not read the AI response. Please retry." }, 502);
      }

      const suggestions = {
        primary_keyword: String(parsed.primary_keyword || "").slice(0, 120),
        meta_title: String(parsed.meta_title || "").slice(0, 70),
        meta_description: String(parsed.meta_description || "").slice(0, 200),
        h1_tag: String(parsed.h1_tag || "").slice(0, 160),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map((k: any) => String(k)).slice(0, 20) : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes.map((n: any) => String(n)).slice(0, 5) : [],
      };

      if (body?.apply === true) {
        const update: Record<string, any> = { updated_at: new Date().toISOString() };
        for (const k of ["primary_keyword", "meta_title", "meta_description", "h1_tag"] as const) {
          if (suggestions[k]) update[k] = suggestions[k];
        }
        if (suggestions.keywords.length) update.keywords = suggestions.keywords;
        const { error } = await sb.from(cfg.table).update(update).eq("id", link.entity_id);
        if (error) throw error;
        const fresh = await loadRecord();
        const diff = diffFields(record, fresh || {}, editableKeys(cfg));
        await notifyAdmin(sb, {
          link, cfg, type, diff, source: "ai_seo",
          slug: String(fresh?.slug || ""),
          title: String(fresh?.[cfg.titleField] || ""),
        });
        return json({ suggestions, applied: true, record: fresh });
      }

      return json({ suggestions, applied: false });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("[magic-edit] error", e);
    return json({ error: (e as Error)?.message || "Unexpected error" }, 500);
  }
});
