// Refresh Content — runs deep-research AI refresh on an existing entity
// (article / college / institute / course), produces a proposed snapshot + diff,
// and stores it as a pending content_refreshes row awaiting admin approval.
// Public endpoint (admin gate enforced by RLS on insert via service-role).

import { callAIGateway } from "../_shared/aiGateway.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext";

type EntityType = "article" | "college" | "college_section" | "institute" | "course";
type Mode = "full" | "smart";

interface Body {
  entity_type: EntityType;
  entity_id: string;
  mode?: Mode;
  requested_by?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "openai/gpt-5-mini";

// Fields that are tracked + diff'd per entity
const TRACKED_FIELDS: Record<EntityType, string[]> = {
  article: ["title", "excerpt", "intro", "content", "meta_title", "meta_description", "keywords", "h1_tag"],
  college: ["description", "fees", "fees_lakhs", "placement_avg", "placement_highest", "placement_median", "ranking", "top_recruiters", "exams_accepted", "accreditations", "highlights", "admission_process", "meta_title", "meta_description", "keywords", "h1_tag"],
  college_section: ["title", "content", "data"],
  institute: ["description", "fees_lakhs", "rating", "students_count", "success_rate", "features", "specializations", "meta_title", "meta_description", "keywords", "h1_tag"],
  course: ["description", "fees", "duration", "eligibility", "highlights", "curriculum", "batch_info", "discount_text"],
};

const TABLE: Record<EntityType, string> = {
  article: "articles",
  college: "colleges",
  college_section: "college_sections",
  institute: "institutes",
  course: "courses",
};

const HTML_FIELDS = new Set(["description", "admission_process", "intro", "content"]);
const SEO_FIELDS = new Set(["meta_title", "meta_description", "keywords", "h1_tag"]);

type QualityContext = {
  entityName: string;
  city?: string;
  state?: string;
  website?: string;
  todayIso: string;
  year: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeOfficialUrl(website?: string) {
  if (!website) return "";
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return "";
  }
}

function domainLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "official website";
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isWeakHtml(value: string) {
  const text = stripHtml(value);
  if (!text || /^refreshed\s+\d{4}\s+fields/i.test(text)) return true;
  if (/^(updated|refreshed)\s+(content|information|details)/i.test(text)) return true;
  const hasStructure = /<h2[\s>]/i.test(value) || /<h3[\s>]/i.test(value);
  const hasScanElements = /<(ul|ol|table)[\s>]/i.test(value);
  return text.length > 140 && (!hasStructure || !hasScanElements);
}

function enrichHtml(value: string, field: string, ctx: QualityContext) {
  let out = String(value || "").trim();
  if (!out) return out;

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(out);
  if (!hasHtml || isWeakHtml(out)) {
    const clean = stripHtml(out).replace(/^[-•*]\s*/gm, "");
    const sentences = clean
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6);
    const heading = field === "admission_process"
      ? `${ctx.entityName} Admission ${ctx.year}`
      : field === "content"
        ? `${ctx.entityName} ${ctx.year} Update`
        : `${ctx.entityName} Overview ${ctx.year}`;
    out = `<h2>${escapeHtml(heading)}</h2><ul>${sentences.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
  }

  const officialUrl = normalizeOfficialUrl(ctx.website);
  if (officialUrl && !out.includes(officialUrl) && !/<a\s+[^>]*href=/i.test(out)) {
    out = `<p><strong>Official resource:</strong> <a href="${officialUrl}" target="_blank" rel="noopener">${escapeHtml(domainLabel(officialUrl))}</a></p>\n${out}`;
  }

  out = out.replace(/<a\s+([^>]*href=["'][^"']+["'][^>]*)>/gi, (match, attrs) => {
    const withTarget = /\starget=/i.test(attrs) ? attrs : `${attrs} target="_blank"`;
    const withRel = /\srel=/i.test(withTarget) ? withTarget : `${withTarget} rel="noopener"`;
    return `<a ${withRel}>`;
  });

  if (!/<(strong|b)>[\s\S]*<\/(strong|b)>/i.test(out)) {
    out = out.replace(/(INR\s*[\d.]+(?:\s*-\s*[\d.]+)?\s*(?:LPA|Lakhs?|Cr)?|\d+(?:\.\d+)?\s*(?:LPA|%|Lakhs?|acres)|CAT|XAT|CMAT|MAT|GMAT|KMAT|SNAP|NMAT)/gi, "<strong><u>$1</u></strong>");
  }

  if (!/Last updated:/i.test(out)) {
    out += `\n<p><em>Last updated: ${ctx.todayIso}</em></p>`;
  }
  return out;
}

function postProcessSnapshot(snapshot: Record<string, unknown>, fields: string[], ctx: QualityContext) {
  const next: Record<string, unknown> = {};
  for (const field of fields) {
    const value = snapshot[field];
    if (HTML_FIELDS.has(field) && typeof value === "string") {
      next[field] = enrichHtml(value, field, ctx);
    } else if (SEO_FIELDS.has(field) && typeof value === "string") {
      next[field] = value.replace(/\[src:[^\]]+\]/gi, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    } else {
      next[field] = value;
    }
  }
  return next;
}

function qualityFailures(snapshot: Record<string, unknown>, fields: string[], ctx: QualityContext) {
  const failures: string[] = [];
  for (const field of fields) {
    const value = snapshot[field];
    if (HTML_FIELDS.has(field) && typeof value === "string" && stripHtml(value).length > 120) {
      if (isWeakHtml(value)) failures.push(`${field}: needs headings plus bullets/tables, not plain paragraphs`);
      if (ctx.website && !/<a\s+[^>]*href=/i.test(value)) failures.push(`${field}: must include at least one verified official hyperlink`);
      if (!/<(strong|b)>[\s\S]*<\/(strong|b)>/i.test(value)) failures.push(`${field}: important facts must use bold formatting`);
    }
  }
  if (fields.includes("meta_title") && typeof snapshot.meta_title === "string" && snapshot.meta_title.length > 62) failures.push("meta_title: keep under 60 characters where possible");
  if (fields.includes("meta_description") && typeof snapshot.meta_description === "string") {
    const md = snapshot.meta_description;
    if (md.length > 165) failures.push("meta_description: keep under 160 characters where possible");
    if (!md.toLowerCase().includes(ctx.entityName.toLowerCase().split(" ")[0])) failures.push("meta_description: must be entity-specific");
  }
  if (fields.includes("keywords") && Array.isArray(snapshot.keywords) && snapshot.keywords.length < 8) failures.push("keywords: include 8-12 specific SEO keywords");
  return failures.slice(0, 8);
}

function pickFields(row: Record<string, unknown>, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f] = row[f] ?? null;
  return out;
}

function computeDiff(current: Record<string, unknown>, proposed: Record<string, unknown>) {
  const diff: Record<string, { changed: boolean; before: unknown; after: unknown }> = {};
  const keys = new Set([...Object.keys(current), ...Object.keys(proposed)]);
  for (const k of keys) {
    const a = current[k];
    const b = proposed[k];
    const changed = JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
    diff[k] = { changed, before: a ?? null, after: b ?? null };
  }
  return diff;
}

async function callAI(systemPrompt: string, userPrompt: string, schema: any): Promise<any> {
  const resp = await callAIGateway({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "function", function: { name: "emit", description: "Emit refreshed fields", parameters: schema } }],
      tool_choice: { type: "function", function: { name: "emit" } },
      max_tokens: 6000,
    }, { feature: "refresh-content", purpose: "long", provider: "openai-mini" });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI call failed ${resp.status}: ${t.slice(0, 500)}`);
  }
  const data = await resp.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) throw new Error("AI did not return tool call");
  return JSON.parse(tc.function.arguments);
}

function buildSchema(fields: string[]) {
  const props: Record<string, unknown> = {};
  for (const f of fields) {
    // Arrays vs strings vs numbers — best-guess based on field name
    if (["keywords", "top_recruiters", "exams_accepted", "accreditations", "features", "specializations", "highlights", "curriculum"].includes(f)) {
      props[f] = { type: "array", items: { type: "string" } };
    } else if (f === "data") {
      props[f] = { type: "object", additionalProperties: true };
    } else if (["fees_lakhs", "ranking", "rating", "students_count", "success_rate"].includes(f)) {
      props[f] = { type: "number" };
    } else if (HTML_FIELDS.has(f)) {
      props[f] = {
        type: "string",
        description: "Rich HTML only. Must include headings, bullet lists, bold+underlined key stats, useful official hyperlinks, and tables where relevant.",
      };
    } else {
      props[f] = { type: "string" };
    }
  }
  return { type: "object", properties: props, required: fields };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.entity_type || !body?.entity_id) {
      return new Response(JSON.stringify({ error: "entity_type and entity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mode: Mode = body.mode === "full" ? "full" : "smart";
    const fields = TRACKED_FIELDS[body.entity_type];
    const table = TABLE[body.entity_type];

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch current entity
    const selectColumns = body.entity_type === "college_section" ? "*, colleges(name, slug, city, state, website)" : "*";
    const { data: row, error: fetchErr } = await supabase
      .from(table)
      .select(selectColumns)
      .eq("id", body.entity_id)
      .maybeSingle();
    if (fetchErr || !row) throw new Error(fetchErr?.message || "Entity not found");

    const currentSnapshot = pickFields(row as Record<string, unknown>, fields);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const year = today.getFullYear();

    const entityName = body.entity_type === "college_section"
      ? `${(row as any).colleges?.name || "College"} — ${(row as any).title || (row as any).section_type || "Section"}`
      : ((row as any).name || (row as any).title || "Untitled");
    const city = (row as any).city || (row as any).colleges?.city || "";
    const state = (row as any).state || (row as any).colleges?.state || "";
    const website = (row as any).website || (row as any).colleges?.website || "";

    const modeNote = mode === "full"
      ? "Rewrite EVERY field from scratch with the latest verified information. Improve clarity, structure, formatting, and humanise the tone."
      : "ONLY update time-sensitive facts: fees, placement figures, rankings, recruiter lists, dates, citations, and meta freshness. Preserve the existing tone, narrative structure and unchanged sections. If a field is already accurate and current for " + year + ", return it unchanged.";

    const systemPrompt = `You are a senior MBA/B-school researcher refreshing an existing page for ${year}. Today is ${todayIso}.

REFRESH MODE: ${mode.toUpperCase()}
${modeNote}

NON-NEGOTIABLE DATA RULES:
- Use only verified ${year} / ${year - 1}-${String(year).slice(-2)} data (NIRF ${year}, latest placement reports, ${year}-${year + 1} admission brochures).
- For every key stat append a machine-readable citation: [src:NIRF ${year}], [src:Placement Report ${year - 1}-${String(year).slice(-2)}], [src:Admission Brochure ${year}].
- NEVER use "N/A", "Not available", "Contact for details", "TBD". Give realistic ranges if exact figure unknown.
- Scope: MBA / PGP / PGDM / MMS / MiM / Executive MBA / Masters in Management ONLY.
- Return ALL ${fields.length} fields in the tool call, even if unchanged in smart mode.

HYPERLINK RULES (STRICT):
- REMOVE all links to google search, bing, or generic/irrelevant pages.
- DO NOT add links back to mbacompass.in or third-party/partner sites.
- Allowed link targets ONLY: (1) Official college/institute website, (2) Official exam website (iimcat.ac.in, xatonline.in, etc.), (3) Government / regulatory sites (nirfindia.org, aicte-india.org, ugc.gov.in).
- Every <a href="..."> must be a real verified official URL with target="_blank" rel="noopener". If unsure, keep as plain text — never guess.

FORMATTING RULES (long-form HTML fields):
- Concise bullet lists with 3–5 crisp <li> items per section — no long paragraphs.
- Important dates, deadlines, fees, cut-offs and key numbers MUST be bold AND underlined: <strong><u>15 Jan ${year}</u></strong>.
- Use <table> with <thead>/<tbody> for placements, cut-offs, important dates, fee structures, and comparisons.
- Semantic <h2>/<h3> subheadings. No repetition, no fluff. Human-friendly tone.
- End any long description with: <p><em>Last updated: ${todayIso}</em></p>`;

    const userPrompt = `Refresh the following ${body.entity_type} page:

Name: ${entityName}
Location: ${city}, ${state}
Official website: ${website || "not provided"}
ID: ${body.entity_id}

CURRENT CONTENT (JSON):
${JSON.stringify(currentSnapshot, null, 2)}

Produce the refreshed version of every tracked field.

For HTML fields (${fields.filter((f) => HTML_FIELDS.has(f)).join(", ") || "none"}):
- Do NOT return a plain paragraph summary.
- Use <h2>/<h3>, <ul><li>, <strong><u>key facts</u></strong>, official <a href="https://..." target="_blank" rel="noopener">links</a>, and tables for fees/placements/dates/cutoffs.
- Keep content concise, scannable, and action-oriented.

${mode === "smart" ? "Keep unchanged non-time-sensitive fields identical to current, but fix weak/plain HTML formatting in long-form fields." : "Improve and modernise everything."}`;

    const schema = buildSchema(fields);

    // Insert "generating" record first for visibility
    const { data: pending, error: insErr } = await supabase
      .from("content_refreshes")
      .insert({
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        entity_slug: (row as any).slug || null,
        entity_name: entityName,
        refresh_mode: mode,
        status: "generating",
        current_snapshot: currentSnapshot,
        proposed_snapshot: {},
        diff: {},
        ai_model: MODEL,
        requested_by: body.requested_by || null,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    try {
      const proposedSnapshot = await callAI(systemPrompt, userPrompt, schema);
      const diff = computeDiff(currentSnapshot, proposedSnapshot);
      const changedCount = Object.values(diff).filter((d: any) => d.changed).length;

      const { error: updErr } = await supabase
        .from("content_refreshes")
        .update({
          status: "pending",
          proposed_snapshot: proposedSnapshot,
          diff,
          ai_notes: `${changedCount}/${fields.length} fields changed`,
        })
        .eq("id", pending.id);
      if (updErr) throw new Error(updErr.message);

      return new Response(
        JSON.stringify({ success: true, refresh_id: pending.id, changed_fields: changedCount, total_fields: fields.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiErr) {
      const msg = aiErr instanceof Error ? aiErr.message : "AI generation failed";
      await supabase
        .from("content_refreshes")
        .update({ status: "failed", error_message: msg })
        .eq("id", pending.id);
      throw aiErr;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("refresh-content error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
