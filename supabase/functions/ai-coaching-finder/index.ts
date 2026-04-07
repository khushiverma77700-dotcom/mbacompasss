import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { preferences } = await req.json();
    const { mode, budget, state, city, targetExam } = preferences || {};

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch institutes with courses
    let query = supabase.from("institutes").select("*, courses(*), categories:category_id(name, slug)");
    
    if (mode && mode !== "any") {
      query = query.ilike("mode", `%${mode}%`);
    }
    if (state && state !== "any") {
      query = query.ilike("state", `%${state}%`);
    }
    if (city && city !== "any") {
      query = query.ilike("city", `%${city}%`);
    }

    const { data: institutes, error } = await query.order("rating", { ascending: false }).limit(50);
    if (error) throw error;

    // Filter by budget if provided
    let filtered = institutes || [];
    if (budget && budget !== "any") {
      const maxBudget = parseInt(budget, 10);
      if (!isNaN(maxBudget)) {
        filtered = filtered.filter((inst: any) => {
          const courses = inst.courses || [];
          return courses.some((c: any) => (c.fees || 0) <= maxBudget);
        });
      }
    }

    // Build context for AI
    const topInstitutes = filtered.slice(0, 10).map((inst: any) => ({
      name: inst.name,
      slug: inst.slug,
      city: inst.city,
      state: inst.state,
      rating: inst.rating,
      success_rate: inst.success_rate,
      mode: inst.mode,
      students_count: inst.students_count,
      features: inst.features,
      courses: (inst.courses || []).map((c: any) => ({
        name: c.name,
        fees: c.fees,
        duration: c.duration,
      })),
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrefsText = [
      mode && mode !== "any" ? `Mode: ${mode}` : null,
      budget && budget !== "any" ? `Max Budget: ₹${parseInt(budget).toLocaleString()}` : null,
      state && state !== "any" ? `State: ${state}` : null,
      city && city !== "any" ? `City: ${city}` : null,
      targetExam ? `Target Exam: ${targetExam}` : null,
    ].filter(Boolean).join(", ");

    const systemPrompt = `You are an expert MBA coaching advisor for BestMBACoaching.com. Based on the user's preferences and the available institutes data, recommend the TOP 3 best-fit coaching institutes. 

For each recommendation, provide:
1. Institute name and why it's a good fit
2. Best course for their needs with fees
3. Key strengths (2-3 bullet points)
4. A match score out of 100

Be specific, helpful, and encouraging. Use the actual data provided. Format your response in clean markdown with headers for each recommendation. Start with a brief personalized summary paragraph.

If few or no institutes match, suggest the closest alternatives and explain why.`;

    const userMessage = `User Preferences: ${userPrefsText || "No specific preferences"}

Available Institutes Data:
${JSON.stringify(topInstitutes, null, 2)}

Please recommend the best coaching institutes for this student.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coaching-finder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
