import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UserProfile {
  exam: string;
  scoreType: "percentile" | "score";
  overallScore: number;
  sectionalScores?: { varc?: number; dilr?: number; quant?: number };
  tenth: number;
  twelfth: number;
  graduation: number;
  graduationStream: string;
  workExperienceMonths: number;
  gender?: string;
  budgetMin: number;
  budgetMax: number;
  preferredCities: string[];
  collegeTier: string[];
  specialization: string;
}

interface CollegeResult {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  fees: string | null;
  placement_avg: string | null;
  placement_highest: string | null;
  ranking: number | null;
  type: string | null;
  established: number | null;
  exams_accepted: string[] | null;
  accreditations: string[] | null;
  logo_url: string | null;
  courses: string[] | null;
  campus_size: string | null;
  total_students: number | null;
  chancePercent: number;
  bucket: "dream" | "target" | "safe";
  whyFit: string;
  compositeScore: number;
}

function parseNum(v: string | null): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function calculateCompositeScore(college: any, profile: UserProfile): number {
  let score = 0;
  const fees = parseNum(college.fees);
  const avgPkg = parseNum(college.placement_avg);

  // Exam score weight (40%)
  const percentile = profile.scoreType === "percentile" ? profile.overallScore : 0;
  const ranking = college.ranking || 999;
  if (percentile >= 99 && ranking <= 10) score += 40;
  else if (percentile >= 95 && ranking <= 25) score += 35;
  else if (percentile >= 90 && ranking <= 50) score += 30;
  else if (percentile >= 85 && ranking <= 75) score += 25;
  else if (percentile >= 80) score += 20;
  else if (percentile >= 70) score += 15;
  else score += 10;

  // Profile score weight (25%)
  const profileAvg = (profile.tenth + profile.twelfth + profile.graduation) / 3;
  if (profileAvg >= 85) score += 25;
  else if (profileAvg >= 75) score += 20;
  else if (profileAvg >= 65) score += 15;
  else score += 10;

  // Work experience weight (15%)
  const workYears = profile.workExperienceMonths / 12;
  if (workYears >= 2 && workYears <= 5) score += 15;
  else if (workYears >= 1) score += 12;
  else if (workYears >= 0.5) score += 8;
  else score += 5;

  // Budget fit (10%)
  if (fees > 0 && fees <= profile.budgetMax && fees >= profile.budgetMin) score += 10;
  else if (fees > 0 && fees <= profile.budgetMax * 1.2) score += 6;
  else score += 3;

  // Location preference (5%)
  if (profile.preferredCities.length === 0) score += 5;
  else if (college.city && profile.preferredCities.some((c: string) => college.city?.toLowerCase().includes(c.toLowerCase()))) score += 5;
  else score += 2;

  // Diversity bonus (5%)
  if (profile.gender === "female") score += 3;

  // ROI bonus
  if (avgPkg > 0 && fees > 0) {
    const roi = avgPkg / fees;
    if (roi >= 3) score += 5;
    else if (roi >= 2) score += 3;
    else if (roi >= 1) score += 1;
  }

  return Math.min(score, 100);
}

function classifyBucket(score: number): "dream" | "target" | "safe" {
  if (score >= 70) return "safe";
  if (score >= 40) return "target";
  return "dream";
}

function generateWhyFit(college: any, profile: UserProfile, bucket: string): string {
  const fees = parseNum(college.fees);
  const avgPkg = parseNum(college.placement_avg);
  const roi = fees > 0 && avgPkg > 0 ? (avgPkg / fees).toFixed(1) : null;

  if (bucket === "safe") {
    return `Strong match — your profile aligns well with ${college.name}'s admission criteria${roi ? ` and ROI of ${roi}x` : ""}.`;
  } else if (bucket === "target") {
    return `Competitive chance — ${college.name} is within reach${roi ? ` with ${roi}x ROI` : ""}. Focus on WAT/PI prep.`;
  } else {
    return `Aspirational pick — ${college.name} is a stretch but worth trying${roi ? ` for ${roi}x ROI` : ""}. Strong profile needed.`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const profile: UserProfile = await req.json();

    // Validate required fields
    if (!profile.exam || !profile.overallScore || !profile.tenth || !profile.twelfth || !profile.graduation) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch colleges from database
    const { data: colleges, error: dbError } = await sb
      .from("colleges")
      .select("id, name, slug, city, state, fees, placement_avg, placement_highest, ranking, type, established, exams_accepted, accreditations, logo_url, courses, campus_size, total_students")
      .order("ranking", { ascending: true, nullsFirst: false });

    if (dbError) throw dbError;
    if (!colleges || colleges.length === 0) {
      return new Response(JSON.stringify({ error: "No colleges found in database" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by exam acceptance
    let filtered = colleges.filter((c: any) => {
      if (!c.exams_accepted || c.exams_accepted.length === 0) return true;
      return c.exams_accepted.some((e: string) => e.toLowerCase().includes(profile.exam.toLowerCase()));
    });

    // Filter by tier preference
    if (profile.collegeTier.length > 0) {
      const tierFiltered = filtered.filter((c: any) => {
        const type = (c.type || "").toLowerCase();
        return profile.collegeTier.some((t: string) => {
          if (t === "Only IIMs") return c.name.toLowerCase().includes("iim");
          if (t === "Tier 1") return (c.ranking && c.ranking <= 25) || type.includes("iim") || type.includes("government");
          if (t === "Tier 2") return c.ranking && c.ranking > 25 && c.ranking <= 75;
          return true;
        });
      });
      // Soft filter: if too few results, keep all
      if (tierFiltered.length >= 5) filtered = tierFiltered;
    }

    // Score and classify each college
    const results: CollegeResult[] = filtered.map((c: any) => {
      const compositeScore = calculateCompositeScore(c, profile);
      const chancePercent = Math.min(Math.max(compositeScore + Math.floor(Math.random() * 6) - 3, 5), 95);
      const bucket = classifyBucket(compositeScore);
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        city: c.city,
        state: c.state,
        fees: c.fees,
        placement_avg: c.placement_avg,
        placement_highest: c.placement_highest,
        ranking: c.ranking,
        type: c.type,
        established: c.established,
        exams_accepted: c.exams_accepted,
        accreditations: c.accreditations,
        logo_url: c.logo_url,
        courses: c.courses,
        campus_size: c.campus_size,
        total_students: c.total_students,
        chancePercent,
        bucket,
        whyFit: generateWhyFit(c, profile, bucket),
        compositeScore,
      };
    });

    // Sort: dream first, then target, then safe — within each bucket sort by chance
    const bucketOrder = { dream: 0, target: 1, safe: 2 };
    results.sort((a, b) => {
      if (a.bucket !== b.bucket) return bucketOrder[a.bucket] - bucketOrder[b.bucket];
      return b.chancePercent - a.chancePercent;
    });

    // Limit to top results per bucket
    const dream = results.filter(r => r.bucket === "dream").slice(0, 5);
    const target = results.filter(r => r.bucket === "target").slice(0, 8);
    const safe = results.filter(r => r.bucket === "safe").slice(0, 5);
    const shortlisted = [...dream, ...target, ...safe];

    // Generate AI insights via Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiInsights = "";
    let strategy = "";

    if (LOVABLE_API_KEY && shortlisted.length > 0) {
      try {
        const collegeList = shortlisted.map(c => `${c.bucket.toUpperCase()}: ${c.name} (${c.chancePercent}% chance, Fees: ${c.fees || "N/A"}, Avg Pkg: ${c.placement_avg || "N/A"})`).join("\n");

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a warm, experienced MBA admissions mentor in India. Speak like a caring senior who has been through the process. Use "you" and give honest, practical advice. Be encouraging but realistic. Format with markdown. Keep it concise — max 400 words total across both sections.`,
              },
              {
                role: "user",
                content: `Student Profile:
- Exam: ${profile.exam}, ${profile.scoreType === "percentile" ? "Percentile" : "Score"}: ${profile.overallScore}
- Academics: 10th: ${profile.tenth}%, 12th: ${profile.twelfth}%, Graduation: ${profile.graduation}% (${profile.graduationStream})
- Work Experience: ${profile.workExperienceMonths} months
- Budget: ₹${(profile.budgetMin / 100000).toFixed(0)}L - ₹${(profile.budgetMax / 100000).toFixed(0)}L
- Preferred Cities: ${profile.preferredCities.length > 0 ? profile.preferredCities.join(", ") : "Any"}
- Specialization: ${profile.specialization || "Open"}

Shortlisted Colleges:
${collegeList}

Generate TWO sections:
**SECTION 1 - INSIGHTS** (heading: "🧠 Your Personalized Analysis")
- Honest assessment of their chances
- Why these colleges fit their profile
- What stands out in their profile (strengths)
- Areas of concern

**SECTION 2 - STRATEGY** (heading: "📈 Your Action Plan")
- Should they retake the exam?
- Which application forms to prioritize NOW
- WAT/PI preparation tips specific to their profile
- Backup plan suggestions
- Timeline advice`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const fullText = aiData.choices?.[0]?.message?.content || "";
          const strategyIdx = fullText.indexOf("📈");
          if (strategyIdx > -1) {
            aiInsights = fullText.substring(0, strategyIdx).trim();
            strategy = fullText.substring(strategyIdx).trim();
          } else {
            aiInsights = fullText;
            strategy = "";
          }
        }
      } catch (aiErr) {
        console.error("AI generation failed (non-blocking):", aiErr);
      }
    }

    return new Response(
      JSON.stringify({
        colleges: shortlisted,
        aiInsights,
        strategy,
        stats: {
          totalAnalyzed: filtered.length,
          dreamCount: dream.length,
          targetCount: target.length,
          safeCount: safe.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("college-shortlister error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
