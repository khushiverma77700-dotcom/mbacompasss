import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, content, question, pageType, pageId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (action === "summarize") {
      // Summarize content in ~60 words
      const stripped = (content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
      
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You are an expert education content summarizer for BSchoolBuzz. Write a crisp, humanized summary in exactly 50-60 words. Be insightful and actionable. No fluff. No markdown formatting - just plain text." },
            { role: "user", content: `Summarize this ${pageType || "article"} content:\n\n${stripped}` },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${resp.status}`);
      }

      const data = await resp.json();
      const summary = data.choices?.[0]?.message?.content || "Summary unavailable.";
      return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ask") {
      // First search DB for relevant content
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      let dbContext = "";
      
      // Search articles for relevant answers
      const searchResp = await fetch(`${SUPABASE_URL}/rest/v1/articles?published=eq.true&select=title,content,excerpt&limit=3&or=(title.ilike.*${encodeURIComponent(question?.split(" ").slice(0, 3).join("*"))}*,content.ilike.*${encodeURIComponent(question?.split(" ").slice(0, 3).join("*"))}*)`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      });
      
      if (searchResp.ok) {
        const articles = await searchResp.json();
        if (articles?.length > 0) {
          dbContext = articles.map((a: any) => `Article: ${a.title}\n${(a.content || a.excerpt || "").replace(/<[^>]*>/g, " ").slice(0, 1500)}`).join("\n\n");
        }
      }

      // Search colleges too
      const collegeResp = await fetch(`${SUPABASE_URL}/rest/v1/colleges?select=name,description,fees,placement_avg,courses&limit=3&or=(name.ilike.*${encodeURIComponent(question?.split(" ").slice(0, 2).join("*"))}*,description.ilike.*${encodeURIComponent(question?.split(" ").slice(0, 2).join("*"))}*)`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      });
      
      if (collegeResp.ok) {
        const colleges = await collegeResp.json();
        if (colleges?.length > 0) {
          dbContext += "\n\n" + colleges.map((c: any) => `College: ${c.name} | Fees: ${c.fees} | Avg Placement: ${c.placement_avg} | Courses: ${(c.courses || []).join(", ")}`).join("\n");
        }
      }

      const pageContent = (content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are a helpful MBA admission expert for BSchoolBuzz. Answer questions concisely in 2-4 sentences. Be factual and actionable. Use the provided context from our database and current page. If no relevant data is found, give your best expert answer. No markdown.` },
            { role: "user", content: `Page context:\n${pageContent}\n\n${dbContext ? `Database context:\n${dbContext}\n\n` : ""}User question: ${question}` },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${resp.status}`);
      }

      const data = await resp.json();
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
