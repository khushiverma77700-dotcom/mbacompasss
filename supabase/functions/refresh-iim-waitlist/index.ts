// Refresh IIM Waitlist data via Lovable AI (Gemini Flash).
// Researches latest result dates / waitlist movement / RTI insights / application funnel
// and queues a content_refreshes row for admin approval (same flow as articles/colleges).
//
// Modes:
//   "all"          → research all 4 sections in one go
//   "results"      → only iim_waitlist_results (declared / coming soon / expected dates)
//   "movement"     → only iim_waitlist_movement (5-yr trend cards)
//   "rti"          → only iim_waitlist_rti (insight bullets)
//   "applications" → only iim_waitlist_applications (admin funnel stats)

import { callAIGateway } from "../_shared/aiGateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "google/gemini-2.5-flash";

type Section = "all" | "results" | "movement" | "rti" | "applications";

interface Body {
  section?: Section;
  requested_by?: string;
}

const SECTION_TABLE: Record<Exclude<Section, "all">, string> = {
  results: "iim_waitlist_results",
  movement: "iim_waitlist_movement",
  rti: "iim_waitlist_rti",
  applications: "iim_waitlist_applications",
};

const SECTION_LABEL: Record<Section, string> = {
  all: "Full IIM Waitlist Page",
  results: "Result Status Table",
  movement: "5-Year Waitlist Movement",
  rti: "RTI Insights",
  applications: "Application Funnel Stats",
};

function buildSchemaForSection(section: Exclude<Section, "all">) {
  const arr = (props: Record<string, unknown>) => ({
    type: "array",
    items: { type: "object", properties: props, required: Object.keys(props) },
  });
  switch (section) {
    case "results":
      return {
        type: "object",
        properties: {
          rows: arr({
            college_name: { type: "string" },
            college_short: { type: "string" },
            college_type: { type: "string", enum: ["IIM", "IIT", "Non-IIM"] },
            result_date_label: { type: "string" },
            status: { type: "string", enum: ["declared", "coming_soon", "expected"] },
          }),
        },
        required: ["rows"],
      };
    case "movement":
      return {
        type: "object",
        properties: {
          rows: arr({
            college_name: { type: "string" },
            college_short: { type: "string" },
            college_type: { type: "string" },
            category: { type: "string", enum: ["General", "EWS", "OBC", "SC", "ST"] },
            wl_2021: { type: "number" }, wl_2022: { type: "number" }, wl_2023: { type: "number" },
            wl_2024: { type: "number" }, wl_2025: { type: "number" }, wl_2026_est: { type: "number" },
            five_yr_avg: { type: "number" },
            trend: { type: "string", enum: ["rising", "falling", "stable"] },
          }),
        },
        required: ["rows"],
      };
    case "rti":
      return {
        type: "object",
        properties: {
          rows: arr({
            college_name: { type: "string" },
            college_short: { type: "string" },
            college_type: { type: "string" },
            rti_year: { type: "number" },
            insights: { type: "array", items: { type: "string" } },
          }),
        },
        required: ["rows"],
      };
    case "applications":
      return {
        type: "object",
        properties: {
          rows: arr({
            college_name: { type: "string" },
            college_short: { type: "string" },
            college_type: { type: "string" },
            year: { type: "number" },
            applications_received: { type: "number" },
            shortlisted: { type: "number" },
            called_for_pi: { type: "number" },
            offers_made: { type: "number" },
            waitlisted: { type: "number" },
            admitted: { type: "number" },
            batch_size: { type: "number" },
          }),
        },
        required: ["rows"],
      };
  }
}

async function callAIForSection(section: Exclude<Section, "all">, currentRows: any[]) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const year = today.getFullYear();

  const systemPrompt = `You are a senior MBA admissions research analyst refreshing official IIM / IIT / Non-IIM waitlist movement data for ${year}. Today is ${todayIso}.

NON-NEGOTIABLE DATA RULES:
- Use only verified ${year} / ${year - 1}-${String(year).slice(-2)} data — official RTI replies, IIM admission portals, NIRF ${year}, college press releases, IIMCAT.ac.in, mbauniverse.com, careers360.com, pagalguy.com, insideiim.com.
- For result dates: only mark a row as "declared" if the official merit list is genuinely live as of ${todayIso}. Otherwise use "coming_soon" (within 7 days) or "expected" (later).
- For waitlist counts: prefer RTI-sourced numbers. Round to whole integers. Mark trend as rising / falling / stable based on the last 3 years.
- For RTI insights: 2 short HTML bullet strings per college. Bold + underline key numbers like <strong><u>97 %ile</u></strong>, <strong><u>400 seats</u></strong>, dates etc.
- NEVER use "N/A", "Not available", "TBD". Give realistic ranges if the exact number is unknown.
- Preserve the existing row count and college order. Only update fields that have new ${year} information.

OUTPUT: Return a single tool call with a "rows" array containing every row from the current snapshot, with refreshed values where appropriate.`;

  const userPrompt = `Refresh the "${SECTION_LABEL[section]}" data.

CURRENT ROWS (${currentRows.length}):
${JSON.stringify(currentRows, null, 2)}

Produce the refreshed rows array — same length, same college order — with updated ${year} values where you have new verified information. Where current data is already accurate for ${year}, return it unchanged.`;

  const schema = buildSchemaForSection(section);

  const resp = await callAIGateway(
    {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "function", function: { name: "emit", description: "Emit refreshed rows", parameters: schema } }],
      tool_choice: { type: "function", function: { name: "emit" } },
      max_tokens: 8000,
    },
    { feature: "refresh-iim-waitlist", purpose: "long" }
  );

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI call failed ${resp.status}: ${t.slice(0, 400)}`);
  }
  const data = await resp.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) throw new Error("AI did not return a tool call");
  return JSON.parse(tc.function.arguments).rows as any[];
}

function diffRows(current: any[], proposed: any[]) {
  const diff: any[] = [];
  let changed = 0;
  const len = Math.max(current.length, proposed.length);
  for (let i = 0; i < len; i++) {
    const c = current[i] || {};
    const p = proposed[i] || {};
    const fieldDiffs: Record<string, { before: any; after: any }> = {};
    let rowChanged = false;
    const keys = new Set([...Object.keys(c), ...Object.keys(p)]);
    for (const k of keys) {
      if (["id", "created_at", "updated_at", "is_active", "sort_order"].includes(k)) continue;
      if (JSON.stringify(c[k] ?? null) !== JSON.stringify(p[k] ?? null)) {
        fieldDiffs[k] = { before: c[k] ?? null, after: p[k] ?? null };
        rowChanged = true;
      }
    }
    if (rowChanged) changed++;
    diff.push({ row_index: i, college: p.college_name || c.college_name, changed: rowChanged, fields: fieldDiffs });
  }
  return { diff, changed_count: changed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const section: Section = body.section || "all";
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const targets: Exclude<Section, "all">[] =
      section === "all" ? ["results", "movement", "rti", "applications"] : [section];

    const refreshIds: string[] = [];
    const summary: Array<{ section: string; total: number; changed: number; refresh_id: string }> = [];

    for (const sec of targets) {
      const table = SECTION_TABLE[sec];
      const { data: rows, error: fetchErr } = await supabase
        .from(table)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (fetchErr) throw new Error(`Fetch ${table} failed: ${fetchErr.message}`);

      const entityId = "00000000-0000-0000-0000-00000000000" + (sec === "results" ? "1" : sec === "movement" ? "2" : sec === "rti" ? "3" : "4");

      // Insert pending refresh row
      const { data: pending, error: insErr } = await supabase
        .from("content_refreshes")
        .insert({
          entity_type: `iim_waitlist_${sec}`,
          entity_id: entityId,
          entity_name: SECTION_LABEL[sec],
          refresh_mode: "smart",
          status: "generating",
          current_snapshot: { rows: rows || [] },
          proposed_snapshot: {},
          diff: {},
          ai_model: MODEL,
          requested_by: body.requested_by || null,
        })
        .select()
        .single();
      if (insErr) throw new Error(`content_refreshes insert failed: ${insErr.message}`);

      try {
        const proposed = await callAIForSection(sec, rows || []);
        const { diff, changed_count } = diffRows(rows || [], proposed);

        await supabase
          .from("content_refreshes")
          .update({
            status: "pending",
            proposed_snapshot: { rows: proposed },
            diff: { rows: diff },
            ai_notes: `${changed_count}/${proposed.length} ${sec} rows changed`,
          })
          .eq("id", pending.id);

        refreshIds.push(pending.id);
        summary.push({ section: sec, total: proposed.length, changed: changed_count, refresh_id: pending.id });
      } catch (aiErr) {
        const msg = aiErr instanceof Error ? aiErr.message : "AI failed";
        await supabase
          .from("content_refreshes")
          .update({ status: "failed", error_message: msg })
          .eq("id", pending.id);
        throw aiErr;
      }
    }

    return new Response(
      JSON.stringify({ success: true, refresh_ids: refreshIds, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("refresh-iim-waitlist error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
