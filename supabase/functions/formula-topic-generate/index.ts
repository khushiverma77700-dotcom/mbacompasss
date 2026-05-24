// Admin bulk-generate formulas for one topic. Uses tool calling, inserts straight into quant_formulas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";
import { logAIUsage } from "../_shared/aiUsageLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  try {
    const { topic_slug, topic_name, count = 8, difficulty = "intermediate" } = await req.json();
    if (!topic_slug || !topic_name) {
      return new Response(JSON.stringify({ error: "topic_slug and topic_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin auth check via service-role + caller's JWT
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await anonClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Avoid duplicates: pull existing names
    const { data: existing } = await admin.from("quant_formulas").select("name").eq("topic_slug", topic_slug);
    const existingNames = new Set((existing || []).map((r: any) => String(r.name).toLowerCase()));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const system = "You are an MBA quant content expert (CAT, XAT, NMAT, SNAP, CMAT, IIFT). Produce high-quality, exam-relevant formulas with complete pedagogical content. No fluff.";
    const user = `Generate ${count} distinct, high-importance formulas for the topic: "${topic_name}".

Constraints:
- Avoid these existing names: ${[...existingNames].slice(0, 50).join(", ") || "(none)"}
- Default difficulty: ${difficulty}
- exam_tags from: ["CAT","XAT","NMAT","SNAP","CMAT","IIFT","MAT"]
- expression is plain math (use ^, *, /, sqrt(), sum, etc.)
- expression_latex is the LaTeX version (no $ wrappers)
- explanation: 3-5 sentences, simple English
- derivation: short stepwise derivation or "Not applicable - definition"
- shortcuts: 2-3 short tips
- common_mistakes: 2-3 brief items
- examples: 1-2 entries each with {problem, steps[], answer}
- seo_title <60 chars, seo_description <160 chars`;

    const tool = {
      type: "function",
      function: {
        name: "emit_formulas",
        description: "Return the generated formula list.",
        parameters: {
          type: "object",
          properties: {
            formulas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  expression: { type: "string" },
                  expression_latex: { type: "string" },
                  explanation: { type: "string" },
                  derivation: { type: "string" },
                  shortcuts: { type: "array", items: { type: "string" } },
                  notes: { type: "string" },
                  common_mistakes: { type: "array", items: { type: "string" } },
                  difficulty: { type: "string", enum: ["beginner","intermediate","cat","advanced"] },
                  exam_tags: { type: "array", items: { type: "string" } },
                  importance: { type: "integer", minimum: 1, maximum: 5 },
                  is_shortcut: { type: "boolean" },
                  is_high_weightage: { type: "boolean" },
                  examples: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        problem: { type: "string" },
                        steps: { type: "array", items: { type: "string" } },
                        answer: { type: "string" },
                      },
                      required: ["problem","steps","answer"],
                      additionalProperties: false,
                    },
                  },
                  seo_title: { type: "string" },
                  seo_description: { type: "string" },
                  seo_keywords: { type: "array", items: { type: "string" } },
                  faqs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { q: { type: "string" }, a: { type: "string" } },
                      required: ["q","a"], additionalProperties: false,
                    },
                  },
                },
                required: ["name","expression","explanation","difficulty","exam_tags","importance","examples"],
                additionalProperties: false,
              },
            },
          },
          required: ["formulas"],
          additionalProperties: false,
        },
      },
    };

    const model = "openai/gpt-5-mini";
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_formulas" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      await logAIUsage({ feature: "formula-topic-generate", model, status: "error", errorMsg: t.slice(0,400), latencyMs: Date.now() - started, userId });
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    await logAIUsage({ feature: "formula-topic-generate", model, aiData: data, latencyMs: Date.now() - started, userId });
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(args); } catch { parsed = { formulas: [] }; }

    const rows = (parsed.formulas || []).filter((f: any) => f?.name && !existingNames.has(String(f.name).toLowerCase())).map((f: any) => {
      const baseSlug = slugify(f.name);
      const slug = `${topic_slug}-${baseSlug}`.slice(0, 100);
      return {
        slug, name: f.name,
        expression: f.expression,
        expression_latex: f.expression_latex || null,
        explanation: f.explanation || "",
        derivation: f.derivation || null,
        shortcuts: Array.isArray(f.shortcuts) ? f.shortcuts : [],
        notes: f.notes || null,
        common_mistakes: Array.isArray(f.common_mistakes) ? f.common_mistakes : [],
        topic_slug,
        difficulty: f.difficulty || "intermediate",
        exam_tags: Array.isArray(f.exam_tags) ? f.exam_tags : [],
        importance: Number(f.importance) || 3,
        is_shortcut: !!f.is_shortcut,
        is_high_weightage: !!f.is_high_weightage || (Number(f.importance) >= 4),
        examples: f.examples || [],
        seo_title: f.seo_title || `${f.name} — Formula, Examples, Tricks | MBA Compass`,
        seo_description: (f.seo_description || `Learn ${f.name} formula with explanation, derivation, shortcuts and CAT-level examples.`).slice(0, 160),
        seo_keywords: f.seo_keywords || [f.name, topic_name, "CAT formula", "MBA quant"],
        faqs: Array.isArray(f.faqs) ? f.faqs : [],
        published: true,
      };
    });

    let inserted = 0;
    if (rows.length) {
      // Insert one by one to skip slug conflicts gracefully
      for (const row of rows) {
        const { error } = await admin.from("quant_formulas").insert(row);
        if (!error) inserted++;
      }
    }

    return new Response(JSON.stringify({ inserted, requested: count, returned: (parsed.formulas || []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("formula-topic-generate", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
