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
    const { mode, budget, state, city, targetExam, experience, prepStage, batchPreference } = preferences || {};

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase.from("institutes").select("*, courses(*), categories:category_id(name, slug)");
    
    if (mode && mode !== "any") query = query.ilike("mode", `%${mode}%`);
    if (state && state !== "any") query = query.ilike("state", `%${state}%`);
    if (city && city !== "any") query = query.ilike("city", `%${city}%`);

    const { data: institutes, error } = await query.order("rating", { ascending: false }).limit(50);
    if (error) throw error;

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
      logo_url: inst.logo_url,
      courses: (inst.courses || []).map((c: any) => ({
        name: c.name,
        fees: c.fees,
        duration: c.duration,
        batch_info: c.batch_info,
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
      experience && experience !== "any" ? `Work Experience: ${experience}` : null,
      prepStage && prepStage !== "any" ? `Preparation Stage: ${prepStage}` : null,
      batchPreference && batchPreference !== "any" ? `Batch Preference: ${batchPreference}` : null,
    ].filter(Boolean).join(", ");

    const systemPrompt = `You are an expert MBA coaching advisor for BestMBACoaching.com. Based on the user's detailed profile and available institutes data, recommend the TOP 3 best-fit coaching institutes.

CRITICAL FORMAT INSTRUCTIONS:
You MUST output your response in this EXACT JSON format (valid JSON only, no markdown, no code fences):

{
  "summary": "A 2-3 sentence personalized summary addressing the student directly based on their profile.",
  "recommendations": [
    {
      "rank": 1,
      "institute_name": "Exact institute name from the data",
      "institute_slug": "exact-slug-from-data",
      "match_score": 92,
      "why_best_fit": "2-3 sentences explaining why this is the best fit for THIS specific student profile",
      "key_strengths": ["strength 1", "strength 2", "strength 3"],
      "recommended_course": "Course name",
      "course_fees": "₹XX,XXX",
      "course_duration": "X months",
      "batch_info": "Weekend/Weekday info if available"
    }
  ],
  "pro_tips": ["tip 1 for the student", "tip 2"]
}

Use ONLY institutes from the provided data. Use their exact name and slug values. Give match_score out of 100 based on how well the institute fits ALL criteria. If fewer than 3 match well, recommend what's available and explain why.`;

    const userMessage = `Student Profile: ${userPrefsText || "No specific preferences"}

Available Institutes Data:
${JSON.stringify(topInstitutes, null, 2)}

Return ONLY valid JSON. No markdown. No explanation outside JSON.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
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

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from AI response - strip code fences if present
    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback if AI didn't return valid JSON
      parsed = {
        summary: "Here are our top coaching recommendations based on your preferences.",
        recommendations: topInstitutes.slice(0, 3).map((inst: any, i: number) => ({
          rank: i + 1,
          institute_name: inst.name,
          institute_slug: inst.slug,
          match_score: 85 - i * 5,
          why_best_fit: `${inst.name} is a great option with a ${inst.rating}/5 rating and ${inst.success_rate}% success rate.`,
          key_strengths: inst.features?.slice(0, 3) || ["Quality coaching", "Experienced faculty"],
          recommended_course: inst.courses?.[0]?.name || "Comprehensive Course",
          course_fees: inst.courses?.[0]?.fees ? `₹${Number(inst.courses[0].fees).toLocaleString()}` : "Contact for fees",
          course_duration: inst.courses?.[0]?.duration || "6-12 months",
          batch_info: inst.courses?.[0]?.batch_info || "",
        })),
        pro_tips: ["Compare multiple institutes before enrolling", "Ask about demo classes"],
      };
    }

    // Enrich with logo_url from our data
    if (parsed.recommendations) {
      parsed.recommendations = parsed.recommendations.map((rec: any) => {
        const match = topInstitutes.find((inst: any) => 
          inst.slug === rec.institute_slug || 
          inst.name.toLowerCase() === rec.institute_name?.toLowerCase()
        );
        return {
          ...rec,
          logo_url: match?.logo_url || null,
          institute_slug: match?.slug || rec.institute_slug,
          city: match?.city || null,
          state: match?.state || null,
          rating: match?.rating || null,
          students_count: match?.students_count || null,
        };
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-coaching-finder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
