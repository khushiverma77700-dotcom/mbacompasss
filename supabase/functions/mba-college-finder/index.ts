import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";

import { callAIGateway } from "../_shared/aiGateway.ts";

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
  } catch (e) { console.error("[ai-usage-log] Exception:", e); }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ───────── helpers: parse messy text money fields ───────── */
const toLakhs = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return v > 0 ? v : null;
  const s = String(v).toLowerCase().replace(/,/g, "");
  const num = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (!isFinite(num) || num <= 0) return null;
  if (s.includes("cr")) return num * 100;
  if (s.includes("lakh") || s.includes("lpa") || s.includes(" l") || s.endsWith("l") || s.includes("lac")) return num;
  if (num > 100000) return num / 100000; // raw rupees
  return num;
};

const PERCENTILE_OF = (score?: string): number | null => {
  if (!score) return null;
  const s = score.toLowerCase();
  if (s.includes("99")) return 99;
  if (s.includes("95")) return 96;
  if (s.includes("90")) return 92;
  if (s.includes("80")) return 85;
  if (s.includes("below")) return 70;
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isFinite(n) ? n : null;
};

const BUDGET_CAP: Record<string, number> = {
  "under 10l": 10, "10-20l": 20, "20-30l": 30, "30l+": 200, any: 200,
};

// Approx percentile a college demands, derived from its own DB fields only.
const requiredPercentile = (c: any): number => {
  const r = c.ranking ?? 999;
  const isIIM = (c.college_category || "").toUpperCase().includes("IIM") && !/non/i.test(c.college_category || "");
  if (isIIM && r <= 6) return 98.5;
  if (isIIM && r <= 20) return 95;
  if (isIIM) return 92;
  if (c.tier === "Tier 1") return r <= 15 ? 95 : 90;
  if (c.tier === "Tier 2") return 82;
  if (c.tier === "Tier 3") return 70;
  return 60;
};

const norm = (s?: string) => (s || "").toLowerCase().trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { preferences } = await req.json();
    if (!preferences || typeof preferences !== "object") {
      return new Response(JSON.stringify({ error: "preferences object required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: colleges, error: dbErr } = await supabase
      .from("colleges")
      .select("name, slug, city, state, fees, fees_lakhs, placement_avg, placement_highest, placement_median, courses, exams_accepted, ranking, type, tier, college_category, established, accreditations, total_students, campus_size, top_recruiters, specializations, logo_url, website, admission_process")
      .order("ranking", { ascending: true });
    if (dbErr) throw dbErr;

    const rows = (colleges || []).filter((c: any) => c.name?.trim() && c.slug?.trim());

    const { collegeTier, targetExams, expectedScore, budget, location, specialization, experience, careerGoal } = preferences;
    const wantTier = norm(collegeTier);
    const exams = String(targetExams || "").split(",").map((e) => norm(e)).filter((e) => e && e !== "any");
    const studentPct = PERCENTILE_OF(expectedScore);
    const cap = BUDGET_CAP[norm(budget)] ?? 200;
    const loc = norm(location);
    const spec = norm(specialization);

    /* ───────── deterministic scoring on DB rows only ───────── */
    const scored = rows.map((c: any) => {
      const reasons: string[] = [];
      let score = 50;

      const cat = norm(c.college_category);
      const isIIM = cat.includes("iim") && !cat.includes("non");
      const tier = c.tier || "Unranked";

      // Tier / category preference
      if (wantTier.includes("iim")) {
        if (isIIM) { score += 22; reasons.push("Matches your IIM-only preference"); }
        else score -= 26;
      } else if (wantTier.includes("tier 1")) {
        if (tier === "Tier 1") { score += 20; reasons.push("Tier 1 B-School as you requested"); }
        else if (tier === "Tier 2") score -= 6;
        else score -= 16;
      } else if (wantTier.includes("tier 2")) {
        if (tier === "Tier 2") { score += 20; reasons.push("Tier 2 college with strong ROI focus"); }
        else if (tier === "Tier 1") { score += 6; reasons.push("Stretch option above your target tier"); }
        else score -= 8;
      } else {
        if (tier === "Tier 1") score += 8;
        else if (tier === "Tier 2") score += 4;
      }

      // Exams accepted
      const collegeExams = (c.exams_accepted || []).map((e: string) => norm(e));
      if (exams.length) {
        const hit = exams.filter((e) => collegeExams.some((ce: string) => ce.includes(e) || e.includes(ce)));
        if (hit.length) { score += 14; reasons.push(`Accepts ${hit.map((h) => h.toUpperCase()).join(", ")}`); }
        else if (collegeExams.length) score -= 20;
      }

      // Percentile realism
      const req = requiredPercentile(c);
      if (studentPct != null) {
        const delta = studentPct - req;
        if (delta >= 3) { score += 14; reasons.push(`Your ${expectedScore} percentile comfortably clears its typical cutoff`); }
        else if (delta >= -1) { score += 9; reasons.push("Your expected percentile is around its usual cutoff"); }
        else if (delta >= -5) { score += 2; reasons.push("Ambitious but reachable with a strong overall profile"); }
        else score -= 16;
      }

      // Budget
      const feeL = c.fees_lakhs != null ? Number(c.fees_lakhs) : toLakhs(c.fees);
      if (feeL != null) {
        if (feeL <= cap) { score += 8; reasons.push(`Fees ≈ ₹${feeL}L fit your budget`); }
        else if (feeL <= cap * 1.25) score -= 4;
        else score -= 14;
      }

      // Location
      if (loc && loc !== "any") {
        const here = `${norm(c.city)} ${norm(c.state)}`;
        const key = loc.replace(" ncr", "");
        if (here.includes(key)) { score += 10; reasons.push(`Located in your preferred region (${c.city || c.state})`); }
      }

      // Specialization
      if (spec && spec !== "any") {
        const pool = [...(c.specializations || []), ...(c.courses || [])].map((s: string) => norm(s)).join(" ");
        if (pool.includes(spec)) { score += 9; reasons.push(`Offers ${specialization} specialisation`); }
      }

      // ROI from DB placement data
      const avgL = toLakhs(c.placement_avg);
      let roi: number | null = null;
      if (avgL && feeL) {
        roi = Number((avgL / feeL).toFixed(1));
        if (roi >= 3) { score += 10; reasons.push(`Excellent ROI — ${roi}x fees recovered in year one`); }
        else if (roi >= 1.5) { score += 6; reasons.push(`Healthy ROI of ${roi}x`); }
      }
      if (c.ranking && c.ranking <= 25) { score += 6; reasons.push(`Ranked #${c.ranking} in our database`); }
      if ((c.accreditations || []).length >= 2) { score += 3; reasons.push(`Accredited: ${(c.accreditations || []).slice(0, 3).join(", ")}`); }
      if ((c.top_recruiters || []).length >= 3) reasons.push(`Recruiters include ${(c.top_recruiters || []).slice(0, 3).join(", ")}`);

      const match = Math.max(20, Math.min(98, Math.round(score)));

      const difficulty = studentPct == null ? "Unknown" : studentPct - req >= 3 ? "Safe" : studentPct - req >= -1 ? "Target" : "Ambitious";

      return {
        college_name: c.name,
        college_slug: c.slug,
        tier,
        category: isIIM ? "IIM" : "Non-IIM",
        group_label: isIIM ? "IIMs" : tier,
        type: c.type || "",
        match_score: match,
        difficulty,
        required_percentile: req,
        why_best_fit: reasons.slice(0, 3).join(". ") || "Matches your overall profile on fees, exams and placements as per our database.",
        key_strengths: reasons.slice(0, 5),
        fees: c.fees || (feeL ? `₹${feeL} L` : ""),
        fees_lakhs: feeL,
        avg_package: c.placement_avg || "",
        highest_package: c.placement_highest || "",
        median_package: c.placement_median || "",
        roi: roi != null ? String(roi) : "",
        location: [c.city, c.state].filter(Boolean).join(", "),
        exams_accepted: c.exams_accepted || [],
        specializations: c.specializations || [],
        specialization_strength: (c.specializations || []).slice(0, 3).join(", "),
        logo_url: c.logo_url || "",
        website: c.website || "",
        established: c.established ? String(c.established) : "",
        campus_size: c.campus_size || "",
        total_students: c.total_students ? String(c.total_students) : "",
        accreditations: c.accreditations || [],
        top_recruiters: c.top_recruiters || [],
        admission_process: c.admission_process || "",
        ranking: c.ranking ?? null,
      };
    });

    const ranked = scored
      .filter((r) => r.match_score >= 45)
      .sort((a, b) => b.match_score - a.match_score || (a.ranking ?? 999) - (b.ranking ?? 999))
      .slice(0, 120)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    // Groups by category / tier, preserving score order inside each group
    const groupOrder = ["IIMs", "Tier 1", "Tier 2", "Tier 3", "Tier 4", "Unranked"];
    const groups = groupOrder
      .map((label) => ({
        label,
        colleges: ranked.filter((r) => r.group_label === label),
      }))
      .filter((g) => g.colleges.length > 0);

    const stats = {
      total_in_database: rows.length,
      total_matches: ranked.length,
      safe: ranked.filter((r) => r.difficulty === "Safe").length,
      target: ranked.filter((r) => r.difficulty === "Target").length,
      ambitious: ranked.filter((r) => r.difficulty === "Ambitious").length,
      best_match: ranked[0]?.match_score ?? 0,
    };

    /* ───────── AI narrative only (no college facts invented) ───────── */
    let summary = "";
    let pro_tips: string[] = [];
    let strategy: Record<string, string> = {};
    let aiData: any = null;
    const model = "google/gemini-3-flash-preview";
    try {
      const top = ranked.slice(0, 15).map((r) =>
        `${r.rank}. ${r.college_name} (${r.group_label}, match ${r.match_score}%, ${r.difficulty}, fees ${r.fees || "N/A"}, avg ${r.avg_package || "N/A"})`
      ).join("\n");

      const aiResp = await callAIGateway({
        model,
        messages: [
          {
            role: "system",
            content: `You are an expert MBA admissions advisor for MBA Compass. You will be given a student's preferences and the ALREADY COMPUTED shortlist from our own verified database. Write only advisory narrative. Never invent colleges, fees, packages or dates. Reference only the colleges listed.

Student preferences: tier=${collegeTier || "any"}, exams=${targetExams || "any"}, expected percentile=${expectedScore || "not specified"}, budget=${budget || "any"}, location=${location || "any"}, specialisation=${specialization || "any"}, work experience=${experience || "any"}, career goal=${careerGoal || "any"}.

Shortlist stats: ${stats.total_matches} matches out of ${stats.total_in_database} colleges in our database (${stats.safe} safe, ${stats.target} target, ${stats.ambitious} ambitious).

Top matches:\n${top}

Respond in strict JSON:
{"summary":"3-4 sentence strategy summary","pro_tips":["tip","tip","tip","tip"],"strategy":{"priority_targets":"...","if_score_improves":"...","budget_alternatives":"..."}}`,
          },
          { role: "user", content: "Write the advisory narrative for this shortlist. JSON only." },
        ],
        response_format: { type: "json_object" },
      }, { feature: "mba-college-finder" });
      aiData = await aiResp.json().catch(() => ({}));
      const parsed = JSON.parse(aiData?.choices?.[0]?.message?.content || "{}");
      summary = parsed.summary || "";
      pro_tips = Array.isArray(parsed.pro_tips) ? parsed.pro_tips : [];
      strategy = parsed.strategy || {};
      await logAIUsage("mba-college-finder", model, aiData);
    } catch (e: any) {
      console.error("[mba-college-finder] narrative failed:", e?.message);
      await logAIUsage("mba-college-finder", model, aiData, "error", e?.message);
      summary = `We matched ${stats.total_matches} colleges from our verified database of ${stats.total_in_database} B-Schools against your profile, ranked by fit on exams, percentile, fees, location and placement ROI.`;
    }

    return new Response(JSON.stringify({
      summary, recommendations: ranked, groups, stats, pro_tips, strategy,
      source: "mbacompass-database",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[mba-college-finder] Error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
