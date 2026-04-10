import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    await sb.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0, estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
  } catch (e) { console.error("Usage log error:", e); }
}

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

    // Always fetch ALL institutes first - we'll let AI decide relevance
    const { data: allInstitutes, error } = await supabase
      .from("institutes")
      .select("*, courses(*), categories:category_id(name, slug)")
      .order("rating", { ascending: false });

    if (error) throw error;

    const institutes = allInstitutes || [];

    // Try filtering with preferences, but always keep a fallback pool
    let preferredMatches = [...institutes];
    
    if (mode && mode !== "any") {
      const modeFiltered = preferredMatches.filter((inst: any) => 
        (inst.mode || "").toLowerCase().includes(mode.toLowerCase())
      );
      if (modeFiltered.length >= 3) preferredMatches = modeFiltered;
    }

    if (state && state !== "any") {
      const stateFiltered = preferredMatches.filter((inst: any) =>
        (inst.state || "").toLowerCase().includes(state.toLowerCase())
      );
      if (stateFiltered.length >= 3) preferredMatches = stateFiltered;
    }

    if (city && city !== "any") {
      const cityFiltered = preferredMatches.filter((inst: any) =>
        (inst.city || "").toLowerCase().includes(city.toLowerCase())
      );
      if (cityFiltered.length >= 3) preferredMatches = cityFiltered;
    }

    if (budget && budget !== "any") {
      const maxBudget = parseInt(budget, 10);
      if (!isNaN(maxBudget)) {
        const budgetFiltered = preferredMatches.filter((inst: any) => {
          const courses = inst.courses || [];
          return courses.length === 0 || courses.some((c: any) => (c.fees || 0) <= maxBudget);
        });
        if (budgetFiltered.length >= 3) preferredMatches = budgetFiltered;
      }
    }

    // Ensure we always have at least 5 institutes for AI to choose from
    // If filtered too aggressively, merge back top-rated from full list
    if (preferredMatches.length < 5) {
      const existing = new Set(preferredMatches.map((i: any) => i.id));
      for (const inst of institutes) {
        if (!existing.has(inst.id)) {
          preferredMatches.push(inst);
          existing.add(inst.id);
        }
        if (preferredMatches.length >= 10) break;
      }
    }

    const topInstitutes = preferredMatches.slice(0, 12).map((inst: any) => ({
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
      targetExam && targetExam !== "any" ? `Target Exam: ${targetExam}` : null,
      experience && experience !== "any" ? `Work Experience: ${experience}` : null,
      prepStage && prepStage !== "any" ? `Preparation Stage: ${prepStage}` : null,
      batchPreference && batchPreference !== "any" ? `Batch Preference: ${batchPreference}` : null,
    ].filter(Boolean).join(", ");

    const systemPrompt = `You are an expert MBA coaching advisor for BSchoolBuzz.com. Based on the user's profile and available institutes data, recommend the TOP 3 to 5 best-fit coaching institutes.

CRITICAL RULES:
1. You MUST ALWAYS recommend at least 3 institutes, ideally 5. Never return 0 recommendations.
2. If user preferences don't perfectly match, still recommend the closest/best options and explain why.
3. Even if location or budget doesn't match exactly, recommend alternatives and mention the mismatch.

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

Use ONLY institutes from the provided data. Use their exact name and slug values. Give match_score out of 100 based on how well the institute fits ALL criteria. Always provide at least 3 recommendations. If fewer than 3 match perfectly, include the next best options and adjust match_score accordingly.`;

    const userMessage = `Student Profile: ${userPrefsText || "No specific preferences - recommend the best overall options"}

Available Institutes Data:
${JSON.stringify(topInstitutes, null, 2)}

IMPORTANT: You MUST recommend at least 3 institutes. Return ONLY valid JSON. No markdown.`;

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
    await logAIUsage("coaching-finder", "google/gemini-2.5-flash", aiData);
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback - always return at least 3 recommendations
      parsed = {
        summary: "Based on your preferences, here are our top coaching recommendations from our database.",
        recommendations: topInstitutes.slice(0, 5).map((inst: any, i: number) => ({
          rank: i + 1,
          institute_name: inst.name,
          institute_slug: inst.slug,
          match_score: 90 - i * 5,
          why_best_fit: `${inst.name} is a highly rated coaching institute with a ${inst.rating}/5 rating and ${inst.success_rate}% success rate, located in ${inst.city || 'India'}.`,
          key_strengths: inst.features?.slice(0, 3) || ["Quality coaching", "Experienced faculty", "Comprehensive study material"],
          recommended_course: inst.courses?.[0]?.name || "Comprehensive Course",
          course_fees: inst.courses?.[0]?.fees ? `₹${Number(inst.courses[0].fees).toLocaleString()}` : "Contact for fees",
          course_duration: inst.courses?.[0]?.duration || "6-12 months",
          batch_info: inst.courses?.[0]?.batch_info || "",
        })),
        pro_tips: [
          "Compare multiple institutes before enrolling",
          "Ask about demo classes and trial sessions",
          "Check recent student reviews and success stories",
        ],
      };
    }

    // Ensure minimum 3 recommendations
    if (!parsed.recommendations || parsed.recommendations.length < 3) {
      const existing = (parsed.recommendations || []).map((r: any) => r.institute_slug);
      const additional = topInstitutes
        .filter((inst: any) => !existing.includes(inst.slug))
        .slice(0, 5 - (parsed.recommendations?.length || 0))
        .map((inst: any, i: number) => ({
          rank: (parsed.recommendations?.length || 0) + i + 1,
          institute_name: inst.name,
          institute_slug: inst.slug,
          match_score: 70 - i * 5,
          why_best_fit: `${inst.name} offers quality MBA coaching with a ${inst.rating}/5 rating in ${inst.city || 'India'}.`,
          key_strengths: inst.features?.slice(0, 3) || ["Quality coaching", "Experienced faculty"],
          recommended_course: inst.courses?.[0]?.name || "Comprehensive Course",
          course_fees: inst.courses?.[0]?.fees ? `₹${Number(inst.courses[0].fees).toLocaleString()}` : "Contact for fees",
          course_duration: inst.courses?.[0]?.duration || "6-12 months",
          batch_info: inst.courses?.[0]?.batch_info || "",
        }));
      parsed.recommendations = [...(parsed.recommendations || []), ...additional];
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
          mode: match?.mode || null,
          success_rate: match?.success_rate || null,
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
