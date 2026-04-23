// Premium Profile Report — AI narrative layer.
// Returns: one_line_summary, final_verdict, top_advantages[], top_risks[], section_insights{}
// Cached to analysis_results.ai_summary so subsequent calls are free.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  profile_id: string;
  profile_score?: number;
  rank_percentile?: number;
  strengths?: Array<{ title: string; impact?: string }>;
  weaknesses?: Array<{ title: string; severity?: string }>;
  top_colleges?: string[];
  target_exams?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json() as ReqBody;
    if (!body.profile_id) {
      return new Response(JSON.stringify({ error: "profile_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try cache first — analysis_results.ai_summary stores the JSON
    const { data: cached } = await supabase
      .from("analysis_results")
      .select("ai_summary")
      .eq("profile_analysis_id", body.profile_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.ai_summary) {
      try {
        const parsed = JSON.parse(cached.ai_summary);
        if (parsed?.one_line_summary) {
          return new Response(JSON.stringify({ ...parsed, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch { /* not premium-shape, regenerate */ }
    }

    const prompt = `You are a sharp, McKinsey-style MBA profile narrator. Based on the data below, produce a punchy executive narrative.

Profile Score: ${body.profile_score ?? "n/a"}/10
Peer Rank Percentile: ${body.rank_percentile ?? "n/a"}
Top Strengths: ${body.strengths?.map(s => s.title).slice(0, 5).join(" | ") || "n/a"}
Key Weaknesses: ${body.weaknesses?.map(w => w.title).slice(0, 5).join(" | ") || "n/a"}
Likely Colleges: ${body.top_colleges?.slice(0, 5).join(", ") || "n/a"}
Target Exams: ${body.target_exams?.join(", ") || "n/a"}

Rules:
- one_line_summary: ONE crisp sentence (max 24 words) capturing this candidate's identity. Quantitative.
- final_verdict: 2-3 sentences. Where they stand, what's realistic, what to focus on.
- top_advantages: exactly 3 short items with a 1-line "why this matters" each.
- top_risks: exactly 3 short items with a 1-line mitigation each.
- section_insights: short insight strings for keys: academics, work_ex, college_strategy, exam_prep, roi.
No fluff. No generic advice. Reference numbers from the input.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You write extremely concise, quantitative McKinsey-style narrative for MBA candidates. No hedging." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "premium_narrative",
            description: "Return a structured executive narrative for the report",
            parameters: {
              type: "object",
              properties: {
                one_line_summary: { type: "string" },
                final_verdict: { type: "string" },
                top_advantages: {
                  type: "array",
                  items: { type: "object", properties: { title: { type: "string" }, why: { type: "string" } }, required: ["title", "why"] },
                  minItems: 3, maxItems: 3,
                },
                top_risks: {
                  type: "array",
                  items: { type: "object", properties: { title: { type: "string" }, mitigation: { type: "string" } }, required: ["title", "mitigation"] },
                  minItems: 3, maxItems: 3,
                },
                section_insights: {
                  type: "object",
                  properties: {
                    academics: { type: "string" },
                    work_ex: { type: "string" },
                    college_strategy: { type: "string" },
                    exam_prep: { type: "string" },
                    roi: { type: "string" },
                  },
                  required: ["academics", "work_ex", "college_strategy", "exam_prep", "roi"],
                },
              },
              required: ["one_line_summary", "final_verdict", "top_advantages", "top_risks", "section_insights"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "premium_narrative" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("[premium-profile-report] gateway error", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const json = await aiResp.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No tool call output");
    const parsed = JSON.parse(args);

    // Cache by upserting/inserting into analysis_results
    try {
      const { data: existing } = await supabase
        .from("analysis_results")
        .select("id")
        .eq("profile_analysis_id", body.profile_id)
        .maybeSingle();
      if (existing) {
        await supabase.from("analysis_results").update({ ai_summary: JSON.stringify(parsed) }).eq("id", existing.id);
      } else {
        await supabase.from("analysis_results").insert({ profile_analysis_id: body.profile_id, ai_summary: JSON.stringify(parsed) });
      }
    } catch (e) { console.error("[premium-profile-report] cache write failed", e); }

    return new Response(JSON.stringify({ ...parsed, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[premium-profile-report] error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
