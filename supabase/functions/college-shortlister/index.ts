import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    const { error } = await sb.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0, estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
    if (error) console.error("[ai-usage-log] Insert failed:", JSON.stringify(error));
    else console.log("[ai-usage-log] Logged usage for", feature);
  } catch (e) { console.error("[ai-usage-log] Exception:", e); }
}

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

interface ScoreBreakdown {
  examScore: { yours: number; required: number; max: number; label: string };
  academicScore: { yours: number; required: number; max: number; label: string };
  workExScore: { yours: number; required: number; max: number; label: string };
  budgetFit: { yours: number; required: number; max: number; label: string };
  overallYours: number;
  overallRequired: number;
  overallMax: number;
  improvements: string[];
}

function parseNum(v: string | null): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

// Parse percentile range string to a minimum number
function parseCutoffPercentile(cutoff: string | undefined): number {
  if (!cutoff) return 0;
  const c = cutoff.trim();
  if (c.includes("99.5")) return 99.5;
  if (c.startsWith("99")) return 99;
  if (c.startsWith("98")) return 98;
  if (c.startsWith("95")) return 95;
  if (c.startsWith("90")) return 90;
  if (c.startsWith("85")) return 85;
  if (c.startsWith("80")) return 80;
  if (c.startsWith("75")) return 75;
  if (c.startsWith("70")) return 70;
  if (c.includes("Below")) return 60;
  // GMAT scores
  if (c.includes("750")) return 98;
  if (c.includes("720")) return 95;
  if (c.includes("700")) return 92;
  if (c.includes("680")) return 88;
  if (c.includes("650")) return 82;
  if (c.includes("600")) return 75;
  if (c.includes("550")) return 65;
  if (c.includes("Below")) return 55;
  return 0;
}

function getCollegeDifficulty(college: any): number {
  const ranking = college.ranking || 999;
  const tier = (college.tier || "Tier 2").toLowerCase();
  const category = (college.college_category || "").toLowerCase();

  if (category === "iim" || college.name?.toLowerCase().includes("iim")) {
    if (ranking <= 5) return 95;
    if (ranking <= 10) return 88;
    if (ranking <= 20) return 80;
    return 72;
  }
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

// ─── DETAILED SCORING ENGINE ────────────────────────────────
function calculateDetailedScore(college: any, profile: UserProfile): { compositeScore: number; breakdown: ScoreBreakdown } {
  const EXAM_MAX = 40;
  const ACADEMIC_MAX = 25;
  const WORKEX_MAX = 15;
  const BUDGET_MAX = 10;
  const BONUS_MAX = 10;
  const TOTAL_MAX = EXAM_MAX + ACADEMIC_MAX + WORKEX_MAX + BUDGET_MAX + BONUS_MAX;

  // ── Exam Score ──
  let percentile = profile.scoreType === "percentile" ? profile.overallScore : 0;
  if (profile.examScores && college.exams_accepted) {
    for (const exam of college.exams_accepted) {
      const examKey = exam.toUpperCase().trim();
      if (profile.examScores[examKey] && profile.examScores[examKey] > percentile) {
        percentile = profile.examScores[examKey];
      }
    }
  }

  let examScore = 0;
  if (percentile >= 99) examScore = 40;
  else if (percentile >= 97) examScore = 37;
  else if (percentile >= 95) examScore = 34;
  else if (percentile >= 92) examScore = 30;
  else if (percentile >= 90) examScore = 27;
  else if (percentile >= 85) examScore = 23;
  else if (percentile >= 80) examScore = 19;
  else if (percentile >= 70) examScore = 14;
  else if (percentile >= 60) examScore = 10;
  else examScore = 6;

  // Calculate required exam score from cutoff_info
  let requiredExamScore = 20; // default
  const cutoffInfo = college.cutoff_info || {};
  let bestCutoff = 0;
  if (profile.exams && typeof cutoffInfo === "object") {
    for (const exam of profile.exams) {
      const cutoff = parseCutoffPercentile(cutoffInfo[exam]);
      if (cutoff > bestCutoff) bestCutoff = cutoff;
    }
  }
  if (bestCutoff > 0) {
    if (bestCutoff >= 99) requiredExamScore = 38;
    else if (bestCutoff >= 97) requiredExamScore = 35;
    else if (bestCutoff >= 95) requiredExamScore = 32;
    else if (bestCutoff >= 90) requiredExamScore = 27;
    else if (bestCutoff >= 85) requiredExamScore = 23;
    else if (bestCutoff >= 80) requiredExamScore = 19;
    else if (bestCutoff >= 70) requiredExamScore = 14;
    else requiredExamScore = 10;
  } else {
    // Estimate from tier/difficulty
    const diff = getCollegeDifficulty(college);
    requiredExamScore = Math.round((diff / 100) * EXAM_MAX);
  }

  // ── Academic Score ──
  const profileAvg = (profile.tenth + profile.twelfth + profile.graduation) / 3;
  let academicScore = 0;
  if (profile.graduationPursuing) {
    if (profileAvg >= 80) academicScore = 20;
    else if (profileAvg >= 70) academicScore = 16;
    else if (profileAvg >= 60) academicScore = 12;
    else academicScore = 8;
  } else {
    if (profileAvg >= 85) academicScore = 25;
    else if (profileAvg >= 78) academicScore = 21;
    else if (profileAvg >= 70) academicScore = 17;
    else if (profileAvg >= 60) academicScore = 12;
    else academicScore = 8;
  }

  const diff = getCollegeDifficulty(college);
  const requiredAcademicScore = diff >= 80 ? 21 : diff >= 60 ? 17 : diff >= 40 ? 12 : 8;

  // ── Work Experience Score ──
  const workYears = profile.workExperienceMonths / 12;
  let workExScore = 0;
  if (workYears >= 2 && workYears <= 5) workExScore = 15;
  else if (workYears >= 1) workExScore = 12;
  else if (workYears >= 0.5) workExScore = 8;
  else workExScore = 4;

  const requiredWorkExScore = diff >= 80 ? 12 : diff >= 60 ? 8 : 4;

  // ── Budget Fit Score ──
  const fees = parseNum(college.fees);
  let budgetScore = 0;
  if (fees > 0 && fees <= profile.budgetMax && fees >= profile.budgetMin) budgetScore = 10;
  else if (fees > 0 && fees <= profile.budgetMax * 1.2) budgetScore = 6;
  else budgetScore = 3;
  const requiredBudgetScore = 6;

  // ── Bonus Score ──
  let bonusScore = 0;
  if (profile.preferredStates.length === 0) bonusScore += 3;
  else if (college.state && profile.preferredStates.some((s: string) => college.state?.toLowerCase().includes(s.toLowerCase()))) bonusScore += 3;
  else if (college.city && profile.preferredStates.some((s: string) => college.city?.toLowerCase().includes(s.toLowerCase()))) bonusScore += 2;
  if (profile.gender === "female") bonusScore += 2;
  const avgPkg = parseNum(college.placement_avg);
  const roi = avgPkg > 0 && fees > 0 ? avgPkg / fees : 0;
  if (roi >= 3) bonusScore += 3;
  else if (roi >= 2) bonusScore += 2;
  else if (roi >= 1) bonusScore += 1;
  if (profile.roiPreference === "high_roi" && roi >= 2) bonusScore += 2;
  if (profile.roiPreference === "premium" && (college.ranking || 999) <= 15) bonusScore += 2;
  bonusScore = Math.min(bonusScore, BONUS_MAX);

  const compositeScore = Math.min(examScore + academicScore + workExScore + budgetScore + bonusScore, 100);
  const overallRequired = Math.min(requiredExamScore + requiredAcademicScore + requiredWorkExScore + requiredBudgetScore, 100);

  // ── Improvements ──
  const improvements: string[] = [];
  if (examScore < requiredExamScore) {
    const gap = requiredExamScore - examScore;
    if (gap >= 10) improvements.push(`Your exam percentile needs significant improvement — aim for 95+ to be competitive`);
    else if (gap >= 5) improvements.push(`Boost your exam score by ${Math.ceil(gap * 0.5)}+ percentile points to cross the cutoff`);
    else improvements.push(`You're close to the cutoff — a small percentile improvement can make the difference`);
  }
  if (academicScore < requiredAcademicScore) {
    const weakest = Math.min(profile.tenth, profile.twelfth, profile.graduation);
    if (weakest === profile.tenth) improvements.push("Your 10th score is the weakest link — highlight other strengths in your application");
    else if (weakest === profile.twelfth) improvements.push("Your 12th score is below average — emphasize graduation performance and work-ex");
    else improvements.push("Improve graduation GPA or pursue additional certifications to strengthen academics");
  }
  if (workExScore < requiredWorkExScore) {
    if (profile.workExperienceMonths < 12) improvements.push("Gain at least 12-24 months of work experience for better chances at top colleges");
    else improvements.push("Showcase leadership and impactful projects in your work experience");
  }
  if (budgetScore < requiredBudgetScore) {
    improvements.push("Consider education loans or scholarships — this college's fees may exceed your budget");
  }
  if (improvements.length === 0) {
    if (compositeScore >= overallRequired + 15) improvements.push("Strong profile match! Focus on WAT/PI preparation to seal the deal");
    else improvements.push("Your profile meets requirements — prepare a compelling SOP and ace the interview");
  }

  return {
    compositeScore,
    breakdown: {
      examScore: { yours: examScore, required: requiredExamScore, max: EXAM_MAX, label: "Exam Percentile" },
      academicScore: { yours: academicScore, required: requiredAcademicScore, max: ACADEMIC_MAX, label: "Academics" },
      workExScore: { yours: workExScore, required: requiredWorkExScore, max: WORKEX_MAX, label: "Work Experience" },
      budgetFit: { yours: budgetScore, required: requiredBudgetScore, max: BUDGET_MAX, label: "Budget Fit" },
      overallYours: compositeScore,
      overallRequired,
      overallMax: TOTAL_MAX,
      improvements,
    },
  };
}

function classifyBucket(compositeScore: number, college: any): "dream" | "target" | "safe" {
  const difficulty = getCollegeDifficulty(college);
  const gap = compositeScore - difficulty;
  if (gap >= 15) return "safe";
  if (gap >= -5) return "target";
  return "dream";
}

function getChancePercent(compositeScore: number, college: any): number {
  const difficulty = getCollegeDifficulty(college);
  const gap = compositeScore - difficulty;
  let chance: number;
  if (gap >= 25) chance = 88;
  else if (gap >= 15) chance = 75;
  else if (gap >= 5) chance = 62;
  else if (gap >= -5) chance = 48;
  else if (gap >= -15) chance = 35;
  else if (gap >= -25) chance = 22;
  else chance = 12;
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
  const name = college.name;
  
  if (bucket === "safe") {
    if (profile.overallScore >= 90) parts.push(`Your strong percentile makes ${name} a comfortable fit.`);
    else parts.push(`Your profile aligns well with ${name}'s admission criteria.`);
  } else if (bucket === "target") {
    parts.push(`You're in a competitive position for ${name} — a focused effort can get you in.`);
  } else {
    if ((college.college_category || "").toLowerCase() === "iim") parts.push(`${name} is aspirational — but every IIM call list has surprises.`);
    else parts.push(`${name} is a stretch, but worth applying — your profile has potential.`);
  }
  
  if (roi >= 2.5) parts.push(`Excellent ROI at ${roi.toFixed(1)}x your investment.`);
  else if (roi >= 1.5) parts.push(`Solid placement record with ${roi.toFixed(1)}x returns.`);
  
  if (college.city && profile.preferredStates.some((s: string) =>
    college.state?.toLowerCase().includes(s.toLowerCase()) ||
    college.city?.toLowerCase().includes(s.toLowerCase())))
    parts.push("Located in your preferred region.");
    
  const avgPkg = parseNum(college.placement_avg);
  if (avgPkg >= 2000000) parts.push(`Strong avg package of ${college.placement_avg}.`);
    
  return parts.join(" ");
}

function generateTips(college: any, profile: UserProfile, bucket: string): string {
  const tips: string[] = [];
  const cat = (college.college_category || "").toLowerCase();
  
  if (bucket === "safe") {
    tips.push("✅ Your profile is a strong fit — focus on nailing the interview stage.");
    if (cat === "iim") tips.push("Prepare well for WAT/PI with structured mock sessions.");
    else tips.push("Craft a compelling SOP highlighting your unique strengths.");
    tips.push("Apply early and keep your documents ready.");
  } else if (bucket === "target") {
    tips.push("📋 You're competitive — preparation quality will make the difference.");
    if (profile.workExperienceMonths < 12) tips.push("Highlight academic projects and internships to compensate for limited work-ex.");
    else tips.push(`Your ${Math.floor(profile.workExperienceMonths / 12)}+ years of work-ex is an advantage — showcase impact and leadership.`);
    tips.push("Practice group discussions and case-study based interviews.");
  } else {
    tips.push("🎯 This is a stretch goal — here's how to maximize your chances:");
    if (profile.overallScore < 95) tips.push("Consider retaking the exam to boost your percentile above 95+.");
    tips.push("Build a standout profile — certifications, volunteering, or publications help.");
    tips.push("Write an exceptional SOP connecting your career goals to the college's strengths.");
  }
  
  return tips.join(" ");
}

// ─── AI ENRICH ACTION ───────────────────────────────────────
async function handleEnrich(collegeName: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { enriched: null };

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a database of Indian MBA colleges. Return ONLY valid JSON, no markdown." },
        { role: "user", content: `Provide details for the MBA college "${collegeName}" in India. Return JSON with these fields:
{
  "city": "string",
  "state": "string", 
  "fees": "string like ₹23 Lakhs",
  "placement_avg": "string like ₹18 LPA",
  "placement_highest": "string like ₹1.2 Cr",
  "ranking": number or null,
  "tier": "Tier 1" or "Tier 2" or "Tier 3" or "Tier 4",
  "college_category": "IIM" or "Non-IIM",
  "type": "Government" or "Private" or "Autonomous",
  "established": number year,
  "exams_accepted": ["CAT", "XAT", etc],
  "accreditations": ["AACSB", "EQUIS", etc],
  "courses": ["MBA", "PGDM", etc],
  "campus_size": "string like 100 acres",
  "website": "url"
}
Only return the JSON object.` },
      ],
    }),
  });

  if (!aiResponse.ok) return { enriched: null };
  const aiData = await aiResponse.json();
  await logAIUsage("college-shortlister", "google/gemini-2.5-flash", aiData);
  const text = aiData.choices?.[0]?.message?.content || "";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return { enriched: JSON.parse(jsonMatch[0]) };
  } catch { /* ignore parse errors */ }
  return { enriched: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // Handle enrich action
    if (body.action === "enrich" && body.collegeName) {
      const result = await handleEnrich(body.collegeName);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile: UserProfile = body;

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
      .select("id, name, slug, city, state, fees, placement_avg, placement_highest, placement_median, ranking, type, tier, college_category, established, exams_accepted, accreditations, logo_url, courses, campus_size, total_students, cutoff_info")
      .order("ranking", { ascending: true, nullsFirst: false });

    if (dbError) throw dbError;
    if (!colleges || colleges.length === 0) {
      return new Response(JSON.stringify({ error: "No colleges found in database" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let filtered = colleges.filter((c: any) => {
      if (!c.exams_accepted || c.exams_accepted.length === 0) return true;
      return profile.exams.some((exam: string) =>
        c.exams_accepted.some((e: string) => e.toLowerCase().includes(exam.toLowerCase()))
      );
    });

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

    const results = filtered.map((c: any) => {
      const { compositeScore: rawComposite, breakdown } = calculateDetailedScore(c, profile);
      let compositeScore = rawComposite;
      if (preferredSlugs.some(slug => c.name.toLowerCase().includes(slug) || c.slug?.toLowerCase().includes(slug))) {
        compositeScore = Math.min(compositeScore + 5, 100);
      }
      const bucket = classifyBucket(compositeScore, c);
      const chancePercent = getChancePercent(compositeScore, c);
      const fees = parseNum(c.fees);
      const avgPkg = parseNum(c.placement_avg);
      const roi = fees > 0 && avgPkg > 0 ? avgPkg / fees : 0;
      const highestPkg = parseNum(c.placement_highest);

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
        scoreBreakdown: breakdown,
        specializations: c.courses || [],
      };
    });

    const bucketOrder = { dream: 0, target: 1, safe: 2 };
    results.sort((a: any, b: any) => {
      if (a.bucket !== b.bucket) return bucketOrder[a.bucket] - bucketOrder[b.bucket];
      return b.chancePercent - a.chancePercent;
    });

    const dream = results.filter((r: any) => r.bucket === "dream").slice(0, 8);
    const target = results.filter((r: any) => r.bucket === "target").slice(0, 10);
    const safe = results.filter((r: any) => r.bucket === "safe").slice(0, 8);
    const shortlisted = [...dream, ...target, ...safe];

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
        const workYrs = (profile.workExperienceMonths / 12).toFixed(1);

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
                content: `You are a warm, experienced MBA admissions mentor from India. Write naturally like a caring elder giving advice over chai — NOT like an AI. 

RULES:
- Use "you" and "your" throughout — speak directly to the student
- Be SPECIFIC to their actual numbers — mention their exact percentile, scores, work-ex
- NO generic filler phrases like "based on our analysis" or "our AI suggests"
- Use short, punchy sentences. Mix encouragement with honest reality checks
- Use bullet points (•) not dashes
- Keep total under 350 words across both sections
- Add 1-2 relevant emojis per section, NOT more`,
              },
              {
                role: "user",
                content: `Student Profile:
• Exams: ${profile.exams.join(", ")}
• ${profile.scoreType === "percentile" ? "Percentile" : "Score"}: ${profile.overallScore}
• 10th: ${profile.tenth}% | 12th: ${profile.twelfth}% | Graduation: ${profile.graduation}%${profile.graduationPursuing ? " (still pursuing)" : ""} — ${profile.graduationStream}
• Work Experience: ${workYrs} years (${profile.workExperienceMonths} months)
• Budget: ₹${(profile.budgetMin / 100000).toFixed(0)}L – ₹${(profile.budgetMax / 100000).toFixed(0)}L
• Preference: ${profile.roiPreference === "high_roi" ? "High ROI" : profile.roiPreference === "premium" ? "Premium colleges" : "Balanced"}

Results:
• Dream (${dream.length}): ${dreamList || "None matched"}
• Target (${target.length}): ${targetList || "None matched"}
• Safe (${safe.length}): ${safeList || "None matched"}

Write exactly TWO sections with these headers:

## 🎯 Your Profile Assessment

Write 3-4 short paragraphs: what's working in their favor, what needs work, and which bucket they should focus on. Be honest but encouraging.

## 📋 Smart Action Plan

Give exactly 4 numbered action items. Each should be one concrete step (e.g., "Fill the XAT form before Dec 15", "Start WAT practice with 2 essays/week"). End with one motivational line.`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          await logAIUsage("college-shortlister", "google/gemini-2.5-flash", aiData);
          const fullText = aiData.choices?.[0]?.message?.content || "";
          const strategyIdx = fullText.indexOf("## 📋");
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
