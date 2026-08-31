// Public "magic link" content editor backend.
// A share token (created by an admin) grants edit rights to ONE college /
// article / exam record. All reads and writes go through this function, which
// validates the token server-side with the service-role key. The token holder
// never gets direct database access.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";
import { callAIGateway } from "../_shared/aiGateway.ts";

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

type EntityType = "college" | "article" | "exam";

const CONFIG: Record<EntityType, {
  table: string;
  titleField: string;
  bodyField: string;
  extraFields: string[];
  publicPath: (slug: string) => string;
  label: string;
}> = {
  college: {
    table: "colleges",
    titleField: "name",
    bodyField: "description",
    extraFields: ["fees", "admission_process", "placement_avg", "placement_median", "placement_highest", "website"],
    publicPath: (slug) => `/college/${slug}`,
    label: "College",
  },
  article: {
    table: "articles",
    titleField: "title",
    bodyField: "content",
    extraFields: ["excerpt", "intro", "category", "author"],
    publicPath: (slug) => `/article/${slug}`,
    label: "Article",
  },
  exam: {
    table: "exams",
    titleField: "name",
    bodyField: "description",
    extraFields: ["full_name", "eligibility", "conducting_body", "official_website", "exam_date", "registration_deadline"],
    publicPath: (slug) => `/exam/${slug}`,
    label: "Exam",
  },
};

const SEO_FIELDS = ["meta_title", "meta_description", "h1_tag", "primary_keyword", "keywords"];

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

function fieldsFor(type: EntityType) {
  const cfg = CONFIG[type];
  return ["id", "slug", cfg.titleField, cfg.bodyField, ...cfg.extraFields, ...SEO_FIELDS];
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
        .select(fieldsFor(type).join(", "))
        .eq("id", link.entity_id)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
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
        entityType: type,
        label: cfg.label,
        titleField: cfg.titleField,
        bodyField: cfg.bodyField,
        extraFields: cfg.extraFields,
        seoFields: SEO_FIELDS,
        publicUrl: `https://mbacompass.in${cfg.publicPath(record.slug)}`,
        record,
      });
    }

    // ── SAVE ──────────────────────────────────────────────────────────────
    if (action === "save") {
      const patch = (body?.values || {}) as Record<string, any>;
      const allowed = new Set([cfg.titleField, cfg.bodyField, ...cfg.extraFields, ...SEO_FIELDS]);
      const update: Record<string, any> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (!allowed.has(k)) continue;
        if (k === "keywords") {
          update[k] = Array.isArray(v)
            ? v.map((x) => String(x).trim()).filter(Boolean)
            : String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
        } else {
          update[k] = typeof v === "string" ? v : v ?? null;
        }
      }
      if (!Object.keys(update).length) return json({ error: "Nothing to save" }, 400);
      update.updated_at = new Date().toISOString();

      const { error } = await sb.from(cfg.table).update(update).eq("id", link.entity_id);
      if (error) throw error;

      await sb
        .from("content_magic_links")
        .update({ saved_count: (link.saved_count || 0) + 1, last_saved_at: new Date().toISOString() })
        .eq("id", link.id);

      const record = await loadRecord();
      return json({ ok: true, record });
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
