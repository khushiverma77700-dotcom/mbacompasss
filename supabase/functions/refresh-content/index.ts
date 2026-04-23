// Refresh Content — runs deep-research AI refresh on an existing entity
// (article / college / institute / course), produces a proposed snapshot + diff,
// and stores it as a pending content_refreshes row awaiting admin approval.
// Public endpoint (admin gate enforced by RLS on insert via service-role).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type EntityType = "article" | "college" | "institute" | "course";
type Mode = "full" | "smart";

interface Body {
  entity_type: EntityType;
  entity_id: string;
  mode?: Mode;
  requested_by?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";

// Fields that are tracked + diff'd per entity
const TRACKED_FIELDS: Record<EntityType, string[]> = {
  article: ["title", "excerpt", "intro", "content", "meta_title", "meta_description", "keywords", "h1_tag"],
  college: ["description", "fees", "fees_lakhs", "placement_avg", "placement_highest", "placement_median", "ranking", "top_recruiters", "exams_accepted", "accreditations", "highlights", "admission_process", "meta_title", "meta_description", "keywords", "h1_tag"],
  institute: ["description", "fees_lakhs", "rating", "students_count", "success_rate", "features", "specializations", "meta_title", "meta_description", "keywords", "h1_tag"],
  course: ["description", "fees", "duration", "eligibility", "highlights", "curriculum", "batch_info", "discount_text"],
};

const TABLE: Record<EntityType, string> = {
  article: "articles",
  college: "colleges",
  institute: "institutes",
  course: "courses",
};

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
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "function", function: { name: "emit", description: "Emit refreshed fields", parameters: schema } }],
      tool_choice: { type: "function", function: { name: "emit" } },
    }),
  });
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
    } else if (["fees_lakhs", "ranking", "rating", "students_count", "success_rate"].includes(f)) {
      props[f] = { type: "number" };
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
    const { data: row, error: fetchErr } = await supabase
      .from(table)
      .select("*")
      .eq("id", body.entity_id)
      .maybeSingle();
    if (fetchErr || !row) throw new Error(fetchErr?.message || "Entity not found");

    const currentSnapshot = pickFields(row as Record<string, unknown>, fields);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const year = today.getFullYear();

    const entityName = (row as any).name || (row as any).title || "Untitled";
    const city = (row as any).city || "";
    const state = (row as any).state || "";

    const modeNote = mode === "full"
      ? "Rewrite EVERY field from scratch with the latest verified information. Improve clarity, structure, formatting, and humanise the tone."
      : "ONLY update time-sensitive facts: fees, placement figures, rankings, recruiter lists, dates, citations, and meta freshness. Preserve the existing tone, narrative structure and unchanged sections. If a field is already accurate and current for " + year + ", return it unchanged.";

    const systemPrompt = `You are a senior MBA/B-school researcher refreshing an existing page for ${year}. Today is ${todayIso}.

REFRESH MODE: ${mode.toUpperCase()}
${modeNote}

NON-NEGOTIABLE RULES:
- Use only verified ${year} / ${year - 1}-${String(year).slice(-2)} data (NIRF ${year}, latest placement reports, ${year}-${year + 1} admission brochures).
- For every key stat append a machine-readable citation: [src:NIRF ${year}], [src:Placement Report ${year - 1}-${String(year).slice(-2)}], [src:Admission Brochure ${year}].
- NEVER use "N/A", "Not available", "Contact for details", "TBD". Give realistic ranges if exact figure unknown.
- Long-form content fields must be well-formatted HTML: short paragraphs, <ul>/<ol>, at least one <table> for key facts, semantic <h2>/<h3>.
- End any long description with: <p><em>Last updated: ${todayIso}</em></p>
- Scope: MBA / PGP / PGDM / MMS / MiM / Executive MBA / Masters in Management ONLY.
- Return ALL ${fields.length} fields in the tool call, even if unchanged in smart mode.`;

    const userPrompt = `Refresh the following ${body.entity_type} page:

Name: ${entityName}
Location: ${city}, ${state}
ID: ${body.entity_id}

CURRENT CONTENT (JSON):
${JSON.stringify(currentSnapshot, null, 2)}

Produce the refreshed version of every tracked field. ${mode === "smart" ? "Keep unchanged fields identical to current." : "Improve and modernise everything."}`;

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
