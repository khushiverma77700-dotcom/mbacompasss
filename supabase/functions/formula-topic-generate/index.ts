// Admin bulk-generate formulas for one topic. Uses tool calling, inserts straight into quant_formulas.
// Strict pedagogical schema: Formula (LaTeX), Explanation, Usage (when/how to apply), Sample Usage (worked examples).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";
import { logAIUsage } from "../_shared/aiUsageLog.ts";
import { getCredential } from "../_shared/getCredential.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

// Detect math constructs we expect to be rendered in LaTeX
function needsLatexConstruct(plain: string): { needsFrac: boolean; needsSqrt: boolean; needsPow: boolean } {
  const s = String(plain || "");
  return {
    needsFrac: /\//.test(s),
    needsSqrt: /sqrt|√/i.test(s),
    needsPow: /\^|\*\*/.test(s) || /²|³/.test(s),
  };
}

function isLatexValid(latex: string, plain: string): boolean {
  if (!latex || typeof latex !== "string") return false;
  if (latex.length < 2) return false;
  // Strip surrounding $ if model added them
  const tex = latex.trim().replace(/^\$+|\$+$/g, "");
  if (!tex) return false;
  const need = needsLatexConstruct(plain);
  if (need.needsFrac && !/\\(d?frac|cfrac|tfrac)\{/.test(tex) && !/\//.test(tex)) return false;
  if (need.needsSqrt && !/\\sqrt/.test(tex)) return false;
  if (need.needsPow && !/[\^_]/.test(tex)) return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  try {
    const { topic_slug, topic_name, count = 8, difficulty = "intermediate" } = await req.json();
    if (!topic_slug || !topic_name) {
      return new Response(JSON.stringify({ error: "topic_slug and topic_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin auth check via service-role + caller's JWT
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await anonClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Avoid duplicates: pull ALL existing names + slugs + latex for this topic
    const { data: existing } = await admin
      .from("quant_formulas")
      .select("name, slug, expression_latex")
      .eq("topic_slug", topic_slug);

    const normalizeName = (s: string) =>
      String(s || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/['’`]/g, "")
        .replace(/\b(formula|theorem|identity|rule|law|equation|the)\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");

    const normalizeLatex = (s: string) =>
      String(s || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/\\left|\\right|\\,|\\;|\\!|\\:/g, "")
        .replace(/[{}]/g, "");

    const existingNamesNorm = new Set((existing || []).map((r: any) => normalizeName(r.name)).filter(Boolean));
    const existingSlugs = new Set((existing || []).map((r: any) => String(r.slug || "").toLowerCase()).filter(Boolean));
    const existingLatex = new Set((existing || []).map((r: any) => normalizeLatex(r.expression_latex)).filter(Boolean));
    const existingNamesList = (existing || []).map((r: any) => r.name).filter(Boolean);

    const OPENAI_API_KEY = await getCredential("OPENAI_API_KEY").catch(() => "") || Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const safeCount = Math.min(100, Math.max(1, Number(count) || 8));
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(safeCount / BATCH_SIZE);

    // Track within-run duplicates across batches
    const batchNames = new Set<string>();
    const batchSlugs = new Set<string>();
    const batchLatex = new Set<string>();

    const allRows: any[] = [];
    const rejected: { name: string; reason: string }[] = [];
    let totalReturned = 0;
    const model = "openai/gpt-5-mini";

    // Build a single batch request (returns a fetch promise). All batches run in PARALLEL
    // so the function finishes inside the edge-runtime wall-time limit even for count=100.
    const buildBatchRequest = (batchIndex: number, thisBatchCount: number) => {
      const nonce = `${Math.random().toString(36).slice(2, 10)}-b${batchIndex + 1}`;
      const blockNames = existingNamesList;

      const system = `You are a senior CAT/MBA quant faculty (15+ years). You produce textbook-grade formula references for "${topic_name}".
Every formula MUST include FOUR deeply-written sections:
(1) FORMULA — strict LaTeX
(2) EXPLANATION — a thorough 6-10 sentence walkthrough that (a) defines EVERY symbol/variable with its unit, (b) explains what the formula computes intuitively, (c) describes the geometric/algebraic meaning, (d) notes any edge cases or domain restrictions.
(3) USAGE (notes) — a 5-8 sentence paragraph on WHEN to apply this formula, the prerequisites/assumptions, how to recognize the trigger in a CAT problem statement, common variations, and related formulas to cross-check.
(4) SAMPLE USAGE — at least 2 fully worked CAT-level numerical examples with step-by-step arithmetic.

LaTeX rules (strict — non-negotiable):
- Use \\frac{a}{b} for ALL fractions. Never use plain "/" inside expressions.
- Use \\sqrt{x} or \\sqrt[n]{x} for roots. Never use "sqrt(x)" or "√".
- Use ^{} and _{} for powers and subscripts. Use \\cdot for multiplication (not "*").
- Use \\sum_{i=1}^{n}, \\prod, \\int, \\log_{b}, \\binom{n}{r}, \\pi, \\theta, \\Delta, \\Rightarrow as needed.
- NEVER wrap with $ or $$.
- expression_latex must render cleanly in KaTeX displayMode.

ANTI-DUPLICATION (CRITICAL):
- The following formulas ALREADY EXIST in our library — you MUST NOT regenerate ANY of them, any rename, any trivial variant, or any algebraic rearrangement of the same identity:
${blockNames.length ? blockNames.map((n: string) => `  • ${n}`).join("\n") : "  (none yet)"}
- Pick fresh, NON-OVERLAPPING formulas from less-covered subtopics of "${topic_name}".
- If you cannot find ${thisBatchCount} genuinely new canonical formulas, return fewer rather than repeating.

Quality bar:
- Only canonical, exam-relevant formulas — no fabricated/obscure identities.
- Explanations must be exhaustive — assume the student has never seen this formula before.
- Each example's steps[] must show the actual calculation, not vague text.
- Use Indian rupee context where natural (₹, lakhs, crores) for Percentages/Profit-Loss/SI-CI/TSD.

(diversity-seed:${nonce} • batch ${batchIndex + 1}/${totalBatches})`;

      const user = `Generate ${thisBatchCount} distinct, must-know formulas for "${topic_name}" — batch ${batchIndex + 1} of ${totalBatches}.
Default difficulty: ${difficulty}. Tag relevant exams from [CAT, XAT, NMAT, SNAP, CMAT, IIFT, MAT].
Importance 4-5 only for high-frequency formulas.

DEPTH REQUIREMENT: explanation field MUST be at least 400 characters covering every variable's meaning, units, intuition, geometric/algebraic interpretation, and edge cases. notes field MUST be at least 300 characters covering when/how/prerequisites/related formulas.

Return strictly via the emit_formulas tool. Reject your own output mentally and retry if any LaTeX uses "/" for fractions, "sqrt(" for roots, or "**" for powers, or if explanation/notes are shallow.`;

      const tool = {
        type: "function",
        function: {
          name: "emit_formulas",
          description: "Return the generated formula list with strict LaTeX, deep explanations, usage notes and worked examples.",
          parameters: {
            type: "object",
            properties: {
              formulas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    expression: { type: "string" },
                    expression_latex: { type: "string" },
                    explanation: { type: "string" },
                    derivation: { type: "string" },
                    notes: { type: "string" },
                    shortcuts: { type: "array", items: { type: "string" } },
                    common_mistakes: { type: "array", items: { type: "string" } },
                    difficulty: { type: "string", enum: ["beginner","intermediate","cat","advanced"] },
                    exam_tags: { type: "array", items: { type: "string" }, minItems: 1 },
                    importance: { type: "integer", minimum: 1, maximum: 5 },
                    is_shortcut: { type: "boolean" },
                    is_high_weightage: { type: "boolean" },
                    examples: {
                      type: "array", minItems: 2,
                      items: {
                        type: "object",
                        properties: {
                          problem: { type: "string" },
                          steps: { type: "array", items: { type: "string" }, minItems: 2 },
                          answer: { type: "string" },
                        },
                        required: ["problem","steps","answer"],
                        additionalProperties: false,
                      },
                    },
                    seo_title: { type: "string" },
                    seo_description: { type: "string" },
                    seo_keywords: { type: "array", items: { type: "string" } },
                    faqs: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { q: { type: "string" }, a: { type: "string" } },
                        required: ["q","a"], additionalProperties: false,
                      },
                    },
                  },
                  required: ["name","expression","expression_latex","explanation","notes","difficulty","exam_tags","importance","examples"],
                  additionalProperties: false,
                },
              },
            },
            required: ["formulas"],
            additionalProperties: false,
          },
        },
      };

      return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          tools: [tool],
          tool_choice: { type: "function", function: { name: "emit_formulas" } },
        }),
      }).then(async (resp) => ({ resp, batchIndex }));
    };

    const batchPromises: Promise<{ resp: Response; batchIndex: number }>[] = [];
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const remaining = safeCount - batchIndex * BATCH_SIZE;
      const thisBatchCount = Math.min(BATCH_SIZE, remaining);
      if (thisBatchCount <= 0) break;
      batchPromises.push(buildBatchRequest(batchIndex, thisBatchCount));
    }

    const settled = await Promise.allSettled(batchPromises);

    for (const s of settled) {
      if (s.status !== "fulfilled") {
        rejected.push({ name: "(batch)", reason: `batch failed: ${String((s as any).reason).slice(0,120)}` });
        continue;
      }
      const { resp, batchIndex } = s.value;
      if (resp.status === 429) {
        rejected.push({ name: `(batch ${batchIndex + 1})`, reason: "rate-limited (429)" });
        continue;
      }
      if (resp.status === 402) {
        rejected.push({ name: `(batch ${batchIndex + 1})`, reason: "AI credits exhausted (402)" });
        continue;
      }
      if (!resp.ok) {
        const t = await resp.text();
        await logAIUsage({ feature: "formula-topic-generate", model, status: "error", errorMsg: t.slice(0,400), latencyMs: Date.now() - started, userId });
        rejected.push({ name: `(batch ${batchIndex + 1})`, reason: `AI gateway ${resp.status}: ${t.slice(0,120)}` });
        continue;
      }

      const data = await resp.json();
      await logAIUsage({ feature: "formula-topic-generate", model, aiData: data, latencyMs: Date.now() - started, userId });
      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(args); } catch { parsed = { formulas: [] }; }

      const rawList: any[] = Array.isArray(parsed.formulas) ? parsed.formulas : [];
      totalReturned += rawList.length;

      for (const f of rawList) {
        if (!f?.name) { rejected.push({ name: "(no name)", reason: "missing name" }); continue; }
        const nNorm = normalizeName(f.name);
        if (!nNorm) { rejected.push({ name: f.name, reason: "empty normalized name" }); continue; }
        if (existingNamesNorm.has(nNorm) || batchNames.has(nNorm)) {
          rejected.push({ name: f.name, reason: "duplicate name (already exists)" }); continue;
        }
        if (!f.expression_latex || !isLatexValid(f.expression_latex, f.expression || "")) {
          rejected.push({ name: f.name, reason: "invalid LaTeX (missing \\frac/\\sqrt/^ where required)" }); continue;
        }
        const latexNorm = normalizeLatex(f.expression_latex);
        if (latexNorm && (existingLatex.has(latexNorm) || batchLatex.has(latexNorm))) {
          rejected.push({ name: f.name, reason: "duplicate formula (same LaTeX already exists)" }); continue;
        }
        if (!f.explanation || String(f.explanation).trim().length < 200) {
          rejected.push({ name: f.name, reason: "explanation too shallow (need 200+ chars)" }); continue;
        }
        if (!f.notes || String(f.notes).trim().length < 150) {
          rejected.push({ name: f.name, reason: "usage notes too short (need 150+ chars)" }); continue;
        }
        if (!Array.isArray(f.examples) || f.examples.length < 2) {
          rejected.push({ name: f.name, reason: "needs at least 2 worked examples" }); continue;
        }
        const baseSlug = slugify(f.name);
        const slug = `${topic_slug}-${baseSlug}`.slice(0, 100);
        if (existingSlugs.has(slug.toLowerCase()) || batchSlugs.has(slug.toLowerCase())) {
          rejected.push({ name: f.name, reason: "duplicate slug" }); continue;
        }
        batchNames.add(nNorm);
        batchSlugs.add(slug.toLowerCase());
        if (latexNorm) batchLatex.add(latexNorm);
        allRows.push({
          slug, name: f.name,
          expression: f.expression,
          expression_latex: String(f.expression_latex).trim().replace(/^\$+|\$+$/g, ""),
          explanation: f.explanation || "",
          derivation: f.derivation || null,
          shortcuts: Array.isArray(f.shortcuts) ? f.shortcuts : [],
          notes: f.notes,
          common_mistakes: Array.isArray(f.common_mistakes) ? f.common_mistakes : [],
          topic_slug,
          difficulty: f.difficulty || "intermediate",
          exam_tags: Array.isArray(f.exam_tags) ? f.exam_tags : [],
          importance: Number(f.importance) || 3,
          is_shortcut: !!f.is_shortcut,
          is_high_weightage: !!f.is_high_weightage || (Number(f.importance) >= 4),
          examples: f.examples,
          seo_title: (f.seo_title || `${f.name} — Formula, Usage, Examples | MBA Compass`).slice(0, 60),
          seo_description: (f.seo_description || `Learn ${f.name}: formula, usage, worked CAT examples, shortcuts & common mistakes.`).slice(0, 160),
          seo_keywords: Array.isArray(f.seo_keywords) ? f.seo_keywords : [f.name, topic_name, "CAT formula", "MBA quant"],
          faqs: Array.isArray(f.faqs) ? f.faqs : [],
          published: true,
        });
      }
    }

    let inserted = 0;
    for (const row of allRows) {
      const { error } = await admin.from("quant_formulas").insert(row);
      if (!error) inserted++;
      else rejected.push({ name: row.name, reason: `db: ${error.message.slice(0, 80)}` });
    }

    return new Response(JSON.stringify({
      inserted,
      requested: safeCount,
      returned: totalReturned,
      batches: totalBatches,
      rejected,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("formula-topic-generate", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
