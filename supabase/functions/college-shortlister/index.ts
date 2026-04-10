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
  sectionalScores?: { varc?: number; dilr?: number; quant?: number };
  tenth: number;
  twelfth: number;
  graduation: number;
  graduationStream: string;
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
  if (profile.preferredStates.length === 0) score += 5;
  else if (college.state && profile.preferredStates.some((s: string) => college.state?.toLowerCase().includes(s.toLowerCase()))) score += 5;
  else if (college.city && profile.preferredStates.some((s: string) => college.city?.toLowerCase().includes(s.toLowerCase()))) score += 4;
  else score += 2;

  // Diversity bonus (5%)
  if (profile.gender === "female") score += 3;

  // ROI bonus
  const roi = avgPkg > 0 && fees > 0 ? avgPkg / fees : 0;
  if (roi >= 3) score += 5;
  else if (roi >= 2) score += 3;
  else if (roi >= 1) score += 1;

  // ROI preference boost
  if (profile.roiPreference === "high_roi" && roi >= 2) score += 3;
  if (profile.roiPreference === "premium" && ranking <= 15) score += 3;

  return Math.min(score, 100);
}

function classifyBucket(score: number): "dream" | "target" | "safe" {
  if (score >= 70) return "safe";
  if (score >= 40) return "target";
  return "dream";
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
  if (bucket === "safe") parts.push(`Strong profile match for ${college.name}'s admission criteria.`);
  else if (bucket === "target") parts.push(`Competitive chance at ${college.name} — your profile is within range.`);
  else parts.push(`Aspirational pick — ${college.name} would be a stretch but worth applying.`);
  if (roi >= 2) parts.push(`Excellent ROI of ${roi.toFixed(1)}x.`);
  if (college.city && profile.preferredStates.some((s: string) => college.state?.toLowerCase().includes(s.toLowerCase()) || college.city?.toLowerCase().includes(s.toLowerCase())))
    parts.push("Matches your location preference.");
  return parts.join(" ");
}

function generateTips(college: any, profile: UserProfile, bucket: string): string {
  if (bucket === "safe") return `Focus on WAT/GD prep. Your profile already meets cutoffs. Apply confidently and prepare for personal interview.`;
  if (bucket === "target") return `Strengthen WAT/PI preparation. Highlight work experience in your application. Consider taking mock interviews.`;
  return `Needs exceptional WAT/PI performance. Build extra-curriculars and consider retaking the exam for a higher score if possible.`;
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
      .select("id, name, slug, city, state, fees, placement_avg, placement_highest, placement_median, ranking, type, established, exams_accepted, accreditations, logo_url, courses, campus_size, total_students, cutoff_info, description")
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
        const type = (c.type || "").toLowerCase();
        return profile.collegeTier.some((t: string) => {
          if (t === "Only IIMs") return c.name.toLowerCase().includes("iim");
          if (t === "Tier 1") return (c.ranking && c.ranking <= 25) || type.includes("iim") || type.includes("government");
          if (t === "Tier 2") return c.ranking && c.ranking > 25 && c.ranking <= 75;
          return true;
        });
      });
      if (tierFiltered.length >= 5) filtered = tierFiltered;
    }

    // Preferred college boost
    const preferredSlugs = profile.preferredColleges?.map(c => c.toLowerCase()) || [];

    // Score and classify each college
    const results = filtered.map((c: any) => {
      let compositeScore = calculateCompositeScore(c, profile);
      // Boost preferred colleges
      if (preferredSlugs.some(slug => c.name.toLowerCase().includes(slug) || c.slug?.toLowerCase().includes(slug))) {
        compositeScore = Math.min(compositeScore + 5, 100);
      }
      const chancePercent = Math.min(Math.max(compositeScore + Math.floor(Math.random() * 6) - 3, 5), 95);
      const bucket = classifyBucket(compositeScore);
      const fees = parseNum(c.fees);
      const avgPkg = parseNum(c.placement_avg);
      const roi = fees > 0 && avgPkg > 0 ? avgPkg / fees : 0;
      const highestPkg = parseNum(c.placement_highest);
      const cutoffPercentile = c.cutoff_info?.general_cutoff || c.cutoff_info?.overall_cutoff || null;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        city: c.city,
        state: c.state,
        fees: c.fees,
        feesNum: fees,
        placement_avg: c.placement_avg,
        placement_highest: c.placement_highest,
        avgPkgNum: avgPkg,
        highestPkgNum: highestPkg,
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
        whyFit: generateWhyFit(c, profile, bucket, roi),
        tips: generateTips(c, profile, bucket),
        compositeScore,
        roi: roi > 0 ? parseFloat(roi.toFixed(1)) : null,
        badges: getBadges(c, roi),
        cutoffPercentile,
        specializations: c.courses || [],
      };
    });

    // Sort
    const bucketOrder = { dream: 0, target: 1, safe: 2 };
    results.sort((a: any, b: any) => {
      if (a.bucket !== b.bucket) return bucketOrder[a.bucket] - bucketOrder[b.bucket];
      return b.chancePercent - a.chancePercent;
    });

    const dream = results.filter((r: any) => r.bucket === "dream").slice(0, 6);
    const target = results.filter((r: any) => r.bucket === "target").slice(0, 10);
    const safe = results.filter((r: any) => r.bucket === "safe").slice(0, 6);
    const shortlisted = [...dream, ...target, ...safe];

    // Best ROI college
    const bestRoi = [...shortlisted].sort((a, b) => (b.roi || 0) - (a.roi || 0))[0];
    if (bestRoi && !bestRoi.badges.includes("Best ROI")) {
      bestRoi.badges = ["Best ROI", ...bestRoi.badges].slice(0, 3);
    }

    // Generate AI insights
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiInsights = "";
    let strategy = "";

    if (LOVABLE_API_KEY && shortlisted.length > 0) {
      try {
        const collegeList = shortlisted.map((c: any) => `${c.bucket.toUpperCase()}: ${c.name} (${c.chancePercent}%, Fees: ${c.fees || "N/A"}, Avg Pkg: ${c.placement_avg || "N/A"}, ROI: ${c.roi || "N/A"}x)`).join("\n");

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
                content: `You are a warm, experienced MBA admissions mentor in India. Speak like a caring senior. Use "you" and give honest, practical advice. Be encouraging but realistic. Format with markdown. Keep it concise — max 500 words total across both sections.`,
              },
              {
                role: "user",
                content: `Student Profile:
- Exams: ${profile.exams.join(", ")}, ${profile.scoreType === "percentile" ? "Percentile" : "Score"}: ${profile.overallScore}
- Academics: 10th: ${profile.tenth}%, 12th: ${profile.twelfth}%, Graduation: ${profile.graduation}% (${profile.graduationStream})
- Work Experience: ${profile.workExperienceMonths} months
- Budget: ₹${(profile.budgetMin / 100000).toFixed(0)}L - ₹${(profile.budgetMax / 100000).toFixed(0)}L
- Preferred States: ${profile.preferredStates.length > 0 ? profile.preferredStates.join(", ") : "Pan India"}
- Specialization: ${profile.specialization || "Open"}
- ROI Preference: ${profile.roiPreference || "Balanced"}

Shortlisted Colleges:
${collegeList}

Generate TWO sections:
**SECTION 1 - INSIGHTS** (heading: "🧠 Your Personalized Analysis")
- Honest assessment of their chances
- Why these colleges fit their profile
- What stands out in their profile (strengths)
- Areas of concern
- Highlight the best ROI college

**SECTION 2 - STRATEGY** (heading: "📈 Your Action Plan")
- Should they retake the exam?
- Which application forms to prioritize NOW
- WAT/PI preparation tips specific to their profile
- Backup plan suggestions
- Timeline advice
- Profile improvement tips`,
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
          }
        } else if (aiResponse.status === 429) {
          console.error("AI rate limited");
        } else if (aiResponse.status === 402) {
          console.error("AI credits exhausted");
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
