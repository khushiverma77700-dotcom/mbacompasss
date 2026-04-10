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
      const stripped = (content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
      
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are an expert education content summarizer for BSchoolBuzz. Write a crisp, humanized summary in 50-70 words using markdown formatting.

Rules:
- Use **bold** for key facts, numbers, college names, and important terms
- Use bullet points (- ) for 2-3 key takeaways if the content has multiple important points
- Be insightful, actionable, and specific — no fluff or generic statements
- Write in a warm, conversational tone like a helpful senior mentor
- End with a sharp insight or actionable tip
- Do NOT use headings (#). Just flowing text with bold highlights and optional bullets.` },
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
              dbContext = articles.map((a: any) => `Article: ${a.title}\n${(a.content || a.excerpt || "").replace(/<[^>]*>/g, " ").slice(0, 1500)}`).join("\n\n");
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

      const pageContent = (content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are a helpful MBA admission expert for BSchoolBuzz. Answer questions accurately using markdown formatting.

Rules:
- Use **bold** for key facts, names, numbers
- Use bullet points for multiple items
- Be factual, concise (3-5 sentences max), and actionable
- If database context has the answer, use it. If not, use your general knowledge to give the best possible answer.
- Never say "I don't have information" — always provide a helpful answer from your knowledge
- Write in a warm, mentor-like tone` },
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
