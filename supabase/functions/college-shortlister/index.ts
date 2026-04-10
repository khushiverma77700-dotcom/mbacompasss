import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UserProfile {
  exams: string[];
  scoreType: "percentile" | "score";
  overallScore: number;
  examScores?: Record<string, number>;
  sectionalScores?: { varc?: number; dilr?: number; quant?: number };
  tenth: number;
  twelfth: number;
  graduation: number;
  graduationStream: string;
  graduationPursuing?: boolean;
  workExperienceMonths: number;
  gender?: string;
  budgetMin: number;
  budgetMax: number;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  preferredStates: string[];
  preferredColleges: string[];
  collegeTier: string[];
  specialization: string;
  roiPreference: string;
}

function parseNum(v: string | null): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

// Get college difficulty factor based on ranking & tier
function getCollegeDifficulty(college: any): number {
  const ranking = college.ranking || 999;
  const tier = (college.tier || "Tier 2").toLowerCase();
  const category = (college.college_category || "").toLowerCase();

  // IIMs are hardest
  if (category === "iim" || college.name?.toLowerCase().includes("iim")) {
    if (ranking <= 5) return 95; // IIM-A, B, C
    if (ranking <= 10) return 88;
    if (ranking <= 20) return 80;
    return 72;
  }

  // Tier-based difficulty
  if (tier === "tier 1" || ranking <= 25) {
    if (ranking <= 5) return 90;
    if (ranking <= 15) return 82;
    return 75;
  }
  if (tier === "tier 2" || (ranking > 25 && ranking <= 75)) {
    if (ranking <= 40) return 60;
    if (ranking <= 60) return 50;
    return 42;
  }
  if (tier === "tier 3") return 30;
  if (tier === "tier 4") return 20;
  return 35;
}

function calculateCompositeScore(college: any, profile: UserProfile): number {
  let rawScore = 0;

  // Get the best exam score for this college
  let percentile = profile.scoreType === "percentile" ? profile.overallScore : 0;
  if (profile.examScores && college.exams_accepted) {
    for (const exam of college.exams_accepted) {
      const examKey = exam.toUpperCase().trim();
      if (profile.examScores[examKey] && profile.examScores[examKey] > percentile) {
        percentile = profile.examScores[examKey];
      }
    }
  }

  // Exam score component (0-40)
  if (percentile >= 99) rawScore += 40;
  else if (percentile >= 97) rawScore += 37;
  else if (percentile >= 95) rawScore += 34;
  else if (percentile >= 92) rawScore += 30;
  else if (percentile >= 90) rawScore += 27;
  else if (percentile >= 85) rawScore += 23;
  else if (percentile >= 80) rawScore += 19;
  else if (percentile >= 70) rawScore += 14;
  else if (percentile >= 60) rawScore += 10;
  else rawScore += 6;

  // Profile score (0-25)
  const profileAvg = (profile.tenth + profile.twelfth + profile.graduation) / 3;
  if (profile.graduationPursuing) {
    // Slightly lower weight for pursuing students
    if (profileAvg >= 80) rawScore += 20;
    else if (profileAvg >= 70) rawScore += 16;
    else if (profileAvg >= 60) rawScore += 12;
    else rawScore += 8;
  } else {
    if (profileAvg >= 85) rawScore += 25;
    else if (profileAvg >= 78) rawScore += 21;
    else if (profileAvg >= 70) rawScore += 17;
    else if (profileAvg >= 60) rawScore += 12;
    else rawScore += 8;
  }

  // Work experience (0-15)
  const workYears = profile.workExperienceMonths / 12;
  if (workYears >= 2 && workYears <= 5) rawScore += 15;
  else if (workYears >= 1) rawScore += 12;
  else if (workYears >= 0.5) rawScore += 8;
  else rawScore += 4;

  // Budget fit (0-10)
  const fees = parseNum(college.fees);
  if (fees > 0 && fees <= profile.budgetMax && fees >= profile.budgetMin) rawScore += 10;
  else if (fees > 0 && fees <= profile.budgetMax * 1.2) rawScore += 6;
  else rawScore += 3;

  // Location (0-5)
  if (profile.preferredStates.length === 0) rawScore += 5;
  else if (college.state && profile.preferredStates.some((s: string) => college.state?.toLowerCase().includes(s.toLowerCase()))) rawScore += 5;
  else if (college.city && profile.preferredStates.some((s: string) => college.city?.toLowerCase().includes(s.toLowerCase()))) rawScore += 4;
  else rawScore += 2;

  // Diversity bonus
  if (profile.gender === "female") rawScore += 3;

  // ROI bonus
  const avgPkg = parseNum(college.placement_avg);
  const roi = avgPkg > 0 && fees > 0 ? avgPkg / fees : 0;
  if (roi >= 3) rawScore += 5;
  else if (roi >= 2) rawScore += 3;
  else if (roi >= 1) rawScore += 1;

  if (profile.roiPreference === "high_roi" && roi >= 2) rawScore += 3;
  if (profile.roiPreference === "premium" && (college.ranking || 999) <= 15) rawScore += 3;

  return Math.min(rawScore, 100);
}

function classifyBucket(compositeScore: number, college: any): "dream" | "target" | "safe" {
  const difficulty = getCollegeDifficulty(college);

  // Chance = how much student score exceeds college difficulty
  const gap = compositeScore - difficulty;

  if (gap >= 15) return "safe";       // Student is well above what college needs
  if (gap >= -5) return "target";     // Student is in competitive range
  return "dream";                      // Student needs to stretch
}

function getChancePercent(compositeScore: number, college: any): number {
  const difficulty = getCollegeDifficulty(college);
  const gap = compositeScore - difficulty;

  // Map gap to a percentage
  let chance: number;
  if (gap >= 25) chance = 88;
  else if (gap >= 15) chance = 75;
  else if (gap >= 5) chance = 62;
  else if (gap >= -5) chance = 48;
  else if (gap >= -15) chance = 35;
  else if (gap >= -25) chance = 22;
  else chance = 12;

  // Add small randomness for natural feel
  chance += Math.floor(Math.random() * 6) - 3;
  return Math.min(Math.max(chance, 5), 95);
}

function getBadges(college: any, roi: number): string[] {
  const badges: string[] = [];
  if (roi >= 2.5) badges.push("High ROI");
  if (college.ranking && college.ranking <= 10) badges.push("Top Tier");
  if (college.ranking && college.ranking > 10 && college.ranking <= 30) badges.push("Elite");
  if (college.established && (new Date().getFullYear() - college.established) < 20) badges.push("Fast Growing");
  if (college.accreditations?.length >= 3) badges.push("Well Accredited");
  return badges.slice(0, 3);
}

function generateWhyFit(college: any, profile: UserProfile, bucket: string, roi: number): string {
  const parts: string[] = [];
  if (bucket === "safe") parts.push(`Your profile is a strong match for ${college.name}.`);
  else if (bucket === "target") parts.push(`You're competitive for ${college.name} — within striking range.`);
  else parts.push(`${college.name} is a stretch goal — worth the effort.`);
  if (roi >= 2) parts.push(`Great ROI at ${roi.toFixed(1)}x.`);
  if (college.city && profile.preferredStates.some((s: string) =>
    college.state?.toLowerCase().includes(s.toLowerCase()) ||
    college.city?.toLowerCase().includes(s.toLowerCase())))
    parts.push("Matches your location preference.");
  return parts.join(" ");
}

function generateTips(college: any, profile: UserProfile, bucket: string): string {
  if (bucket === "safe") return `Focus on WAT/GD prep. Your profile meets cutoffs. Apply confidently and prepare well for the personal interview.`;
  if (bucket === "target") return `Strengthen your WAT/PI preparation. Highlight work experience and achievements in your application. Practice mock interviews.`;
  return `Needs strong WAT/PI performance. Build differentiators, strengthen extra-curriculars, and consider improving your exam score.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const profile: UserProfile = await req.json();

    if ((!profile.exams || profile.exams.length === 0) || !profile.overallScore || !profile.tenth || !profile.twelfth || !profile.graduation) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: colleges, error: dbError } = await sb
      .from("colleges")
      .select("id, name, slug, city, state, fees, placement_avg, placement_highest, placement_median, ranking, type, tier, college_category, established, exams_accepted, accreditations, logo_url, courses, campus_size, total_students, cutoff_info, description")
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
      return profile.exams.some((exam: string) =>
        c.exams_accepted.some((e: string) => e.toLowerCase().includes(exam.toLowerCase()))
      );
    });

    // Filter by tier preference
    if (profile.collegeTier.length > 0) {
      const tierFiltered = filtered.filter((c: any) => {
        const tier = (c.tier || "").toLowerCase();
        const cat = (c.college_category || "").toLowerCase();
        return profile.collegeTier.some((t: string) => {
          if (t === "Only IIMs") return cat === "iim" || c.name.toLowerCase().includes("iim");
          if (t === "Tier 1") return tier === "tier 1" || (c.ranking && c.ranking <= 25);
          if (t === "Tier 2") return tier === "tier 2" || (c.ranking && c.ranking > 25 && c.ranking <= 75);
          return true;
        });
      });
      if (tierFiltered.length >= 3) filtered = tierFiltered;
    }

    const preferredSlugs = profile.preferredColleges?.map(c => c.toLowerCase()) || [];

    // Score and classify each college
    const results = filtered.map((c: any) => {
      let compositeScore = calculateCompositeScore(c, profile);
      if (preferredSlugs.some(slug => c.name.toLowerCase().includes(slug) || c.slug?.toLowerCase().includes(slug))) {
        compositeScore = Math.min(compositeScore + 5, 100);
      }
      const bucket = classifyBucket(compositeScore, c);
      const chancePercent = getChancePercent(compositeScore, c);
      const fees = parseNum(c.fees);
      const avgPkg = parseNum(c.placement_avg);
      const roi = fees > 0 && avgPkg > 0 ? avgPkg / fees : 0;
      const highestPkg = parseNum(c.placement_highest);
      const cutoffPercentile = c.cutoff_info?.general_cutoff || c.cutoff_info?.overall_cutoff || null;

      return {
        id: c.id, name: c.name, slug: c.slug, city: c.city, state: c.state,
        fees: c.fees, feesNum: fees, placement_avg: c.placement_avg,
        placement_highest: c.placement_highest, avgPkgNum: avgPkg,
        highestPkgNum: highestPkg, ranking: c.ranking, type: c.type,
        tier: c.tier, college_category: c.college_category,
        established: c.established, exams_accepted: c.exams_accepted,
        accreditations: c.accreditations, logo_url: c.logo_url,
        courses: c.courses, campus_size: c.campus_size,
        total_students: c.total_students,
        chancePercent, bucket,
        whyFit: generateWhyFit(c, profile, bucket, roi),
        tips: generateTips(c, profile, bucket),
        compositeScore,
        roi: roi > 0 ? parseFloat(roi.toFixed(1)) : null,
        badges: getBadges(c, roi),
        cutoffPercentile,
        specializations: c.courses || [],
      };
    });

    // Sort: dream first, then target, then safe
    const bucketOrder = { dream: 0, target: 1, safe: 2 };
    results.sort((a: any, b: any) => {
      if (a.bucket !== b.bucket) return bucketOrder[a.bucket] - bucketOrder[b.bucket];
      return b.chancePercent - a.chancePercent;
    });

    const dream = results.filter((r: any) => r.bucket === "dream").slice(0, 8);
    const target = results.filter((r: any) => r.bucket === "target").slice(0, 10);
    const safe = results.filter((r: any) => r.bucket === "safe").slice(0, 8);
    const shortlisted = [...dream, ...target, ...safe];

    // Best ROI badge
    const bestRoi = [...shortlisted].sort((a, b) => (b.roi || 0) - (a.roi || 0))[0];
    if (bestRoi && !bestRoi.badges.includes("Best ROI")) {
      bestRoi.badges = ["Best ROI", ...bestRoi.badges].slice(0, 3);
    }

    // AI insights
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiInsights = "";
    let strategy = "";

    if (LOVABLE_API_KEY && shortlisted.length > 0) {
      try {
        const dreamList = dream.map(c => `${c.name} (${c.chancePercent}%)`).join(", ");
        const targetList = target.map(c => `${c.name} (${c.chancePercent}%)`).join(", ");
        const safeList = safe.map(c => `${c.name} (${c.chancePercent}%)`).join(", ");

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
                content: `You are a warm, experienced MBA admissions mentor in India. Write like a caring senior giving honest advice. Use "you" throughout. Be specific and practical. Use emojis sparingly. Keep total response under 400 words across both sections. Format with markdown headers and bullet points.

IMPORTANT: Do NOT use generic phrases. Be specific to the student's actual scores and colleges. Don't repeat information already shown in the results.`,
              },
              {
                role: "user",
                content: `Student:
- Exams: ${profile.exams.join(", ")}, ${profile.scoreType === "percentile" ? "Percentile" : "Score"}: ${profile.overallScore}
- Academics: 10th: ${profile.tenth}%, 12th: ${profile.twelfth}%, Graduation: ${profile.graduation}%${profile.graduationPursuing ? " (Pursuing)" : ""} (${profile.graduationStream})
- Work Exp: ${profile.workExperienceMonths} months
- Budget: ₹${(profile.budgetMin / 100000).toFixed(0)}L - ₹${(profile.budgetMax / 100000).toFixed(0)}L

Dream Colleges: ${dreamList || "None"}
Target Colleges: ${targetList || "None"}
Safe Colleges: ${safeList || "None"}

Write TWO sections:

**🎯 Your Profile Assessment**
- 2-3 specific strengths in their profile
- 1-2 areas to improve (be honest but kind)
- Which bucket has their best options and why

**📋 Your Application Strategy**
- Top 3 immediate action items
- Which 3 colleges to prioritize applications for and why
- One backup strategy tip`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const fullText = aiData.choices?.[0]?.message?.content || "";
          const strategyIdx = fullText.indexOf("📋");
          if (strategyIdx > -1) {
            aiInsights = fullText.substring(0, strategyIdx).trim();
            strategy = fullText.substring(strategyIdx).trim();
          } else {
            aiInsights = fullText;
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
