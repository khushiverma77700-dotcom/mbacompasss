import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPETITORS = [
  "shiksha.com",
  "collegedunia.com",
  "careers360.com",
  "mbauniverse.com",
  "insideiim.com",
  "pagalguy.com",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Gather our site's current SEO status
    const tables = ["articles", "institutes", "colleges", "exams", "city_pages"];
    const summaries: string[] = [];
    let totalPages = 0;
    let pagesWithMeta = 0;
    let pagesWithKeywords = 0;

    for (const table of tables) {
      const { data, count } = await supabase.from(table).select("meta_title, meta_description, keywords", { count: "exact" }).limit(500);
      const rows = data || [];
      totalPages += rows.length;
      pagesWithMeta += rows.filter((r: any) => r.meta_title && r.meta_description).length;
      pagesWithKeywords += rows.filter((r: any) => r.keywords?.length >= 4).length;
      summaries.push(`${table}: ${rows.length} pages, ${rows.filter((r: any) => r.meta_title).length} with meta, ${rows.filter((r: any) => r.keywords?.length >= 4).length} with keywords`);
    }

    // AI competitor analysis
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an SEO competitive intelligence analyst for bschoolbuzz.com — an Indian MBA coaching directory.
Compare our site against these competitors: ${COMPETITORS.join(", ")}.
Our current stats: ${totalPages} pages, ${pagesWithMeta} with meta tags, ${pagesWithKeywords} with 4+ keywords.
Site content: ${summaries.join(". ")}.

Provide actionable, specific competitive analysis. Be data-driven and honest.`,
          },
          {
            role: "user",
            content: `Perform daily competitive analysis comparing bschoolbuzz.com against ${COMPETITORS.join(", ")}.
Analyze: SEO rankings, content depth, keyword coverage, technical performance, and content gaps.
Prioritize actions by impact. Focus on what we can implement TODAY.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "competitor_report",
            description: "Return daily competitor analysis report",
            parameters: {
              type: "object",
              properties: {
                overallPosition: { type: "number", description: "Our position 1-10 among competitors" },
                competitors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      domain: { type: "string" },
                      estimatedDA: { type: "number" },
                      keyAdvantages: { type: "array", items: { type: "string" } },
                      weaknesses: { type: "array", items: { type: "string" } },
                      topKeywords: { type: "array", items: { type: "string" } },
                    },
                    required: ["domain", "estimatedDA", "keyAdvantages", "weaknesses", "topKeywords"],
                  },
                },
                keywordGaps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      keyword: { type: "string" },
                      estimatedVolume: { type: "number" },
                      competitor: { type: "string" },
                      difficulty: { type: "string" },
                      action: { type: "string" },
                    },
                    required: ["keyword", "action"],
                  },
                },
                immediateActions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      impact: { type: "string" },
                      effort: { type: "string" },
                      targetPages: { type: "array", items: { type: "string" } },
                    },
                    required: ["action", "impact", "effort"],
                  },
                },
                contentGaps: { type: "array", items: { type: "string" } },
                technicalImprovements: { type: "array", items: { type: "string" } },
                summary: { type: "string" },
                dateGenerated: { type: "string" },
              },
              required: ["overallPosition", "competitors", "keywordGaps", "immediateActions", "contentGaps", "technicalImprovements", "summary"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "competitor_report" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, will retry on next schedule" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      throw new Error(`AI error: ${aiResp.status} ${t}`);
    }

    const aiData = await aiResp.json();
    await (async () => {
      try {
        const usage = aiData?.usage || {};
        await supabase.from("ai_usage_logs").insert({
          feature: "competitor-cron", model: "google/gemini-2.5-flash",
          prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0, estimated_cost: (usage.total_tokens || 0) * 0.000002,
          status: "success",
        });
      } catch (e) { console.error("Usage log error:", e); }
    })();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let report: any;
    if (toolCall?.function?.arguments) {
      report = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const match = content.match(/\{[\s\S]*\}/);
      if (match) report = JSON.parse(match[0]);
      else throw new Error("Could not parse AI response");
    }

    report.dateGenerated = new Date().toISOString();
    report.ourStats = { totalPages, pagesWithMeta, pagesWithKeywords };

    // Save report to site_settings
    const reportKey = "seo_competitor_daily_report";
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", reportKey).limit(1);
    if (existing?.[0]?.id) {
      await supabase.from("site_settings").update({ value: report }).eq("id", existing[0].id);
    } else {
      await supabase.from("site_settings").insert({ key: reportKey, value: report });
    }

    // Also save history
    const historyKey = `seo_competitor_history_${new Date().toISOString().split("T")[0]}`;
    await supabase.from("site_settings").insert({ key: historyKey, value: report }).onConflict("key");

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("seo-competitor-cron error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
