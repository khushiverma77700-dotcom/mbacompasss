// AI Edit Content — applies a custom user instruction to one entity
// (article / college / institute / course) using AI, then queues the result
// in content_refreshes for admin review & approval (same pipeline as refresh-content).
//
// Body: { entity_type, entity_id, instruction, target_fields?, requested_by? }
//   - target_fields: optional whitelist of fields to edit. If omitted, AI may touch any tracked field.
//   - instruction: free-form user request (e.g. "Make intro more conversational",
//     "Add 2025 NIRF rank", "Interlink IIM Ahmedabad wherever it appears", etc.)

import { callAIGateway } from "../_shared/aiGateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type EntityType = "article" | "college" | "institute" | "course";

interface Body {
  entity_type: EntityType;
  entity_id: string;
  instruction: string;
  target_fields?: string[];
  requested_by?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "openai/gpt-5-mini";

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

const ARRAY_FIELDS = new Set([
  "keywords", "top_recruiters", "exams_accepted", "accreditations",
  "features", "specializations", "highlights", "curriculum",
]);
const NUMBER_FIELDS = new Set(["fees_lakhs", "ranking", "rating", "students_count", "success_rate"]);

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
    diff[k] = { changed: JSON.stringify(a ?? null) !== JSON.stringify(b ?? null), before: a ?? null, after: b ?? null };
  }
  return diff;
}

function buildSchema(fields: string[]) {
  const props: Record<string, unknown> = {};
  for (const f of fields) {
    if (ARRAY_FIELDS.has(f)) props[f] = { type: "array", items: { type: "string" } };
    else if (NUMBER_FIELDS.has(f)) props[f] = { type: "number" };
    else props[f] = { type: "string" };
  }
  return { type: "object", properties: props, required: fields };
}

async function callAI(systemPrompt: string, userPrompt: string, schema: any): Promise<any> {
  const resp = await callAIGateway({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools: [{ type: "function", function: { name: "emit", description: "Emit edited fields", parameters: schema } }],
    tool_choice: { type: "function", function: { name: "emit" } },
    max_tokens: 6000,
  }, { feature: "ai-edit-content", purpose: "premium", provider: "openai-nano" });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI call failed ${resp.status}: ${t.slice(0, 500)}`);
  }
  const data = await resp.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) throw new Error("AI did not return tool call");
  return JSON.parse(tc.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.entity_type || !body?.entity_id || !body?.instruction?.trim()) {
      return new Response(
        JSON.stringify({ error: "entity_type, entity_id and instruction are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allFields = TRACKED_FIELDS[body.entity_type];
    if (!allFields) {
      return new Response(JSON.stringify({ error: "Invalid entity_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Restrict to target_fields if provided & valid; otherwise use all
    const fields = (body.target_fields && body.target_fields.length > 0)
      ? allFields.filter((f) => body.target_fields!.includes(f))
      : allFields;
    if (fields.length === 0) {
      return new Response(JSON.stringify({ error: "No valid target fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const table = TABLE[body.entity_type];
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: row, error: fetchErr } = await supabase
      .from(table).select("*").eq("id", body.entity_id).maybeSingle();
    if (fetchErr || !row) throw new Error(fetchErr?.message || "Entity not found");

    const currentSnapshot = pickFields(row as Record<string, unknown>, fields);
    const today = new Date().toISOString().slice(0, 10);
    const year = new Date().getFullYear();
    const entityName = (row as any).name || (row as any).title || "Untitled";

    const systemPrompt = `You are a senior MBA/B-school content editor. Today is ${today}.

You will receive the CURRENT content of a ${body.entity_type} page and a USER INSTRUCTION describing the change to make.

YOUR JOB:
- Apply ONLY the user's instruction. Do NOT rewrite unrelated parts.
- Return ALL ${fields.length} fields in the tool call. For fields the instruction does NOT touch, return them UNCHANGED (identical bytes to current).
- Keep the existing tone unless the instruction asks otherwise.

HYPERLINK RULES (STRICT — applies to EVERY field you touch):
- REMOVE all <a> tags that link to google.com / google search / bing / generic search engines / unrelated pages.
- DO NOT insert links back to mbacompass.in or any internal/partner/third-party pages unless the user explicitly asks.
- Only allowed link targets:
  1. Official college / institute website (e.g. https://www.iima.ac.in)
  2. Official exam website (e.g. https://iimcat.ac.in, https://www.xatonline.in)
  3. Official Government / regulatory site (nirfindia.org, aicte-india.org, ugc.gov.in, education.gov.in)
- Every <a href="..."> must be a real, verified official URL. If you cannot verify, do NOT add the link — keep plain text.
- Use target="_blank" rel="noopener" on all external links.

FORMATTING RULES (apply to long-form HTML fields like description / content / intro):
- Convert long paragraphs into concise bullet lists: 3–5 crisp <li> items per section.
- Make important dates, deadlines, fees, cut-offs and key numbers BOTH bold and underlined: <strong><u>15 Jan ${year}</u></strong>.
- Use <table> with <thead>/<tbody> for: placements, cut-offs, important dates, fee structures, comparisons. Always clean and minimal.
- Use semantic <h2>/<h3> subheadings to break up sections.
- Keep it concise, human-friendly, no repetition, no fluff.
- Never use "N/A" or "Contact for details" — give realistic values or keep existing.

DATA RULES:
- For factual updates (fees, ranks, placements), use ${year}/${year-1}-${String(year).slice(-2)} verified data and append [src:...] citations.
- Scope: MBA / PGP / PGDM / MMS / MiM / Executive MBA only.`;

    const userPrompt = `Entity: ${entityName} (${body.entity_type}, id ${body.entity_id})

USER INSTRUCTION:
"""
${body.instruction.trim()}
"""

CURRENT CONTENT (JSON, edit only what the instruction asks):
${JSON.stringify(currentSnapshot, null, 2)}

Apply the instruction and return all ${fields.length} fields. Unchanged fields must be byte-identical.`;

    const schema = buildSchema(fields);

    // Insert "generating" record for visibility
    const { data: pending, error: insErr } = await supabase
      .from("content_refreshes")
      .insert({
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        entity_slug: (row as any).slug || null,
        entity_name: entityName,
        refresh_mode: "smart",
        status: "generating",
        current_snapshot: currentSnapshot,
        proposed_snapshot: {},
        diff: {},
        ai_model: MODEL,
        ai_notes: `Custom instruction: ${body.instruction.trim().slice(0, 500)}`,
        requested_by: body.requested_by || null,
      })
      .select().single();
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
          ai_notes: `Custom instruction (${changedCount}/${fields.length} fields changed): ${body.instruction.trim().slice(0, 400)}`,
        })
        .eq("id", pending.id);
      if (updErr) throw new Error(updErr.message);

      return new Response(
        JSON.stringify({ success: true, refresh_id: pending.id, changed_fields: changedCount, total_fields: fields.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiErr) {
      const msg = aiErr instanceof Error ? aiErr.message : "AI generation failed";
      await supabase.from("content_refreshes")
        .update({ status: "failed", error_message: msg })
        .eq("id", pending.id);
      throw aiErr;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ai-edit-content error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
