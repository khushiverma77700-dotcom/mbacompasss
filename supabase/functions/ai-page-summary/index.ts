import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

// COST OPTIMIZATION (2026-04):
//  • summarize → switched from gemini-2.5-flash → gemini-2.5-flash-lite
//    (≈7× cheaper, identical quality for 100-200 word humanized summaries)
//  • summaries are now cached per (pageType, pageId, content_hash) so revisiting
//    a page/article reuses the same summary instead of paying for a new one
//  • ask → kept on gemini-2.5-flash for nuance, but capped completion to 400 tokens
//  • all calls now send max_tokens to prevent runaway 8K-token responses
import { callAIGateway } from "../_shared/aiGateway.ts";
const SUMMARY_MODEL = "google/gemini-2.5-flash-lite";
const ASK_MODEL = "google/gemini-2.5-flash";

async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    const { error } = await supabase.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
    if (error) console.error("[ai-usage-log] Insert failed:", JSON.stringify(error));
  } catch (e) { console.error("[ai-usage-log] Exception:", e); }
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, content, question, pageType, pageId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "summarize") {
      const stripped = (content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000); // was 12000 — tighter cap saves ~33% prompt tokens
      const hash = await sha256(stripped + "|" + (pageType || "") + "|" + (pageId || ""));

      // ── CACHE HIT? Skip AI entirely ──
      if (pageId) {
        const { data: cached } = await sb
          .from("page_summary_cache")
          .select("summary")
          .eq("page_type", pageType || "page")
          .eq("page_id", String(pageId))
          .eq("content_hash", hash)
          .maybeSingle();
        if (cached?.summary) {
          return new Response(JSON.stringify({ summary: cached.summary, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const resp = await callAIGateway({
          model: SUMMARY_MODEL,
          max_tokens: 500,
          messages: [
            { role: "system", content: `You are an expert education content summarizer for MBA Compass. Write an informative, humanized summary in 100-200 words using markdown formatting.

Rules:
- Start with a 1-2 sentence overview capturing the core topic
- Use **bold** for key facts, numbers, college names, exam names, fees, and important terms
- Use bullet points (- ) for 3-5 key takeaways covering the most important points
- Include specific numbers: fees, percentiles, placements, rankings, deadlines when available
- Be insightful, actionable, and specific — no fluff or generic statements
- Write in a warm, conversational tone like a helpful senior mentor
- End with a sharp insight, actionable tip, or key recommendation
- Do NOT use headings (#). Just flowing text with bold highlights and bullet points.
- Make it genuinely useful so the reader gets real value without reading the full page` },
            { role: "user", content: `Summarize this ${pageType || "article"} content:\n\n${stripped}` },
          ],
        });

      if (!resp.ok) {
        if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${resp.status}`);
      }

      const data = await resp.json();
      await logAIUsage("page-summary", SUMMARY_MODEL, data);
      const summary = data.choices?.[0]?.message?.content || "Summary unavailable.";

      // Persist for next visitor (best-effort, never block)
      if (pageId && summary && summary !== "Summary unavailable.") {
        sb.from("page_summary_cache").upsert({
          page_type: pageType || "page",
          page_id: String(pageId),
          content_hash: hash,
          summary,
          model: SUMMARY_MODEL,
        }, { onConflict: "page_type,page_id,content_hash" }).then(() => {}).catch(() => {});
      }

      return new Response(JSON.stringify({ summary, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ask") {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      let dbContext = "";
      
      // Search articles
      try {
        const searchTerms = (question || "").split(" ").filter(w => w.length > 2).slice(0, 4);
        if (searchTerms.length > 0) {
          const orFilter = searchTerms.map(t => `title.ilike.*${t}*,content.ilike.*${t}*`).join(",");
          const searchResp = await fetch(`${SUPABASE_URL}/rest/v1/articles?published=eq.true&select=title,content,excerpt&limit=3&or=(${encodeURIComponent(orFilter)})`, {
            headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          });
          if (searchResp.ok) {
            const articles = await searchResp.json();
            if (articles?.length > 0) {
              // Trimmed 1500 → 800 chars per article (still gives the model the gist, halves prompt tokens)
              dbContext = articles.map((a: any) => `Article: ${a.title}\n${(a.content || a.excerpt || "").replace(/<[^>]*>/g, " ").slice(0, 800)}`).join("\n\n");
            }
          }
        }
      } catch (e) { console.error("Article search error:", e); }

      // Search colleges
      try {
        const searchTerms = (question || "").split(" ").filter(w => w.length > 2).slice(0, 3);
        if (searchTerms.length > 0) {
          const orFilter = searchTerms.map(t => `name.ilike.*${t}*,description.ilike.*${t}*`).join(",");
          const collegeResp = await fetch(`${SUPABASE_URL}/rest/v1/colleges?select=name,description,fees,placement_avg,courses&limit=3&or=(${encodeURIComponent(orFilter)})`, {
            headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          });
          if (collegeResp.ok) {
            const colleges = await collegeResp.json();
            if (colleges?.length > 0) {
              dbContext += "\n\n" + colleges.map((c: any) => `College: ${c.name} | Fees: ${c.fees} | Avg Placement: ${c.placement_avg} | Courses: ${(c.courses || []).join(", ")}`).join("\n");
            }
          }
        }
      } catch (e) { console.error("College search error:", e); }

      // Search institutes
      try {
        const searchTerms = (question || "").split(" ").filter(w => w.length > 2).slice(0, 3);
        if (searchTerms.length > 0) {
          const orFilter = searchTerms.map(t => `name.ilike.*${t}*,description.ilike.*${t}*`).join(",");
          const instResp = await fetch(`${SUPABASE_URL}/rest/v1/institutes?select=name,description,city,rating,success_rate,features&limit=3&or=(${encodeURIComponent(orFilter)})`, {
            headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          });
          if (instResp.ok) {
            const institutes = await instResp.json();
            if (institutes?.length > 0) {
              dbContext += "\n\n" + institutes.map((i: any) => `Institute: ${i.name} | City: ${i.city} | Rating: ${i.rating} | Success Rate: ${i.success_rate}%`).join("\n");
            }
          }
        }
      } catch (e) { console.error("Institute search error:", e); }

      // Trimmed 4000 → 2500 chars (Q&A only needs the relevant snippet, not the whole page)
      const pageContent = (content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2500);

      const resp = await callAIGateway({
          model: ASK_MODEL,
          max_tokens: 400, // 3-5 sentence answer fits comfortably
          messages: [
            { role: "system", content: `You are a helpful MBA admission expert for MBA Compass. Answer questions accurately using markdown formatting.

Rules:
- Use **bold** for key facts, names, numbers
- Use bullet points for multiple items
- Be factual, concise (3-5 sentences max), and actionable
- If database context has the answer, use it. If not, use your general knowledge to give the best possible answer.
- Never say "I don't have information" — always provide a helpful answer from your knowledge
- Write in a warm, mentor-like tone` },
            { role: "user", content: `Page context:\n${pageContent}\n\n${dbContext ? `Database context:\n${dbContext}\n\n` : ""}User question: ${question}` },
          ],
        });

      if (!resp.ok) {
        if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${resp.status}`);
      }

      const data = await resp.json();
      await logAIUsage("page-summary", ASK_MODEL, data);
      const answer = data.choices?.[0]?.message?.content || "I couldn't find an answer. Please read the full article for details.";
      return new Response(JSON.stringify({ answer }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-page-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
