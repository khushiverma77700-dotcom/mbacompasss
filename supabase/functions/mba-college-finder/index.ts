import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch colleges from DB for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: colleges } = await supabase
      .from("colleges")
      .select("name, slug, city, state, fees, placement_avg, placement_highest, placement_median, courses, exams_accepted, ranking, type, established, accreditations, total_students, description")
      .order("ranking", { ascending: true })
      .limit(50);

    const collegeContext = (colleges || []).map((c: any) => 
      `${c.name} | Slug: ${c.slug} | Type: ${c.type || "N/A"} | City: ${c.city}, ${c.state} | Fees: ${c.fees || "N/A"} | Avg Package: ${c.placement_avg || "N/A"} | Highest: ${c.placement_highest || "N/A"} | Median: ${c.placement_median || "N/A"} | Ranking: ${c.ranking || "N/A"} | Exams: ${(c.exams_accepted || []).join(", ")} | Courses: ${(c.courses || []).join(", ")} | Accreditations: ${(c.accreditations || []).join(", ")} | Est: ${c.established || "N/A"} | Students: ${c.total_students || "N/A"}`
    ).join("\n");

    const systemPrompt = `You are an expert AI MBA College Advisor integrated into BestMBACoaching.com — India's #1 MBA coaching comparison platform. You help MBA aspirants find the best colleges based on their profile.

## YOUR PERSONALITY
- Friendly, encouraging, and student-oriented
- Use emojis sparingly but effectively (🎓 🏫 📊 ✅ 💡)
- Be concise — students prefer quick, actionable answers
- Always explain WHY a college is recommended

## CONVERSATION FLOW
You MUST follow this step-by-step flow. Ask ONE question at a time. After each answer, acknowledge it and move to the next.

**Step 1**: Greet and ask about College Preference Type (IIMs only / Tier 1 / Tier 2 / Open to all)
**Step 2**: Ask which entrance exams they're targeting (CAT, XAT, SNAP, NMAT, CMAT, GMAT, others)
**Step 3**: Ask their expected score/percentile
**Step 4**: Ask budget range (Under ₹10L / ₹10-20L / ₹20-30L / ₹30L+)
**Step 5**: Ask location preference (specific cities or open to all)
**Step 6**: Ask specialization interest (Marketing / Finance / Consulting / HR / Operations / Not sure)
**Step 7**: Ask work experience (Fresher / 1-2 yrs / 2-4 yrs / 4+ yrs)
**Step 8**: Ask career goals (High-paying job / Consulting / Startup / Abroad / Not sure)

After collecting ALL inputs, generate your recommendation.

## RECOMMENDATION FORMAT
When you have enough info, respond with recommendations in this EXACT markdown format:

### 🎓 Your Top College Recommendations

For each college (recommend 3-5):

**🏫 [College Name]**
- **Tier:** IIM / Tier 1 / Tier 2
- **Exams:** CAT, XAT, etc.
- **Fees:** ₹XX Lakhs
- **Avg Package:** ₹XX LPA
- **Location:** City, State
- **Match Score:** XX%
- **Why for you:** [1-2 sentence personalized explanation]

---

### ⚖️ Quick Comparison

| Parameter | College A | College B | College C |
|-----------|-----------|-----------|-----------|
| Fees | ₹X | ₹X | ₹X |
| Avg Package | ₹X | ₹X | ₹X |
| ROI | X | X | X |
| Best For | X | X | X |

---

### 💡 AI Strategy Summary

- **Priority targets:** ...
- **If score improves:** ...
- **Budget-friendly alternatives:** ...

---

### 🚀 Next Steps

Want a deeper analysis? Try our **[AI Profile Analyser](/profile-analyzer)** for a complete 5-dimension score breakdown and IIM admission probability!

## COLLEGE DATABASE
Here are the colleges in our database. Use ONLY these for recommendations. Reference them by slug for linking:

${collegeContext}

## RULES
- Only recommend colleges from the database above
- Be realistic about score-college mapping (e.g., 99+ for IIM-A/B/C)
- Always include match percentage based on profile fit
- If user's profile is weak for their targets, be honest but encouraging
- Calculate ROI as (Avg Package / Fees)
- When mentioning a college, link it as [College Name](/college/slug)
- Keep each message under 300 words until the final recommendation
- NEVER make up college data — use only what's in the database`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("mba-college-finder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
