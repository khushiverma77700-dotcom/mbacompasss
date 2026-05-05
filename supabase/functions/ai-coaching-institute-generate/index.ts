// AI generator for the new modular Coaching Institute admin.
// Returns BOTH `basic` (institute row fields) and `sections` (JSONB matching
// the schema in src/lib/instituteSections.ts). Designed to be called from
// the AICoachingInstituteDialog. Public — verify_jwt = false (project default).

import { callAIGateway } from "../_shared/aiGateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function logAIUsage(feature: string, model: string, aiData: any, status = "success", errorMsg?: string) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const usage = aiData?.usage || {};
    await sb.from("ai_usage_logs").insert({
      feature, model,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      estimated_cost: (usage.total_tokens || 0) * 0.000002,
      status, error_message: errorMsg || null,
    });
  } catch (e) { console.error("[ai-usage-log]", e); }
}

interface Brief {
  name: string;
  slug?: string;
  website?: string;
  city?: string;
  state?: string;
  mode?: string;                 // Online / Offline / Hybrid
  instituteType?: "city" | "hybrid";
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  examFocus?: string[];
  flagshipPrograms?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const brief = (await req.json()) as Brief;
    if (!brief?.name?.trim()) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const year = today.getFullYear();
    const targetKw = (brief.primaryKeyword || brief.name).trim();
    const secKws = (brief.secondaryKeywords || []).filter(Boolean);
    const exams = (brief.examFocus || []).filter(Boolean);
    const flagship = (brief.flagshipPrograms || []).filter(Boolean);
    const mode = brief.mode || "Hybrid";

    const systemPrompt = `You are a senior MBA-entrance coaching researcher and SEO writer for the Indian audience. You write like a sharp senior mentor talking to a CAT/XAT/GMAT aspirant — clear, friendly, plain English, contractions allowed.

# COMPLETE-DATA MODE (NON-NEGOTIABLE)
- EVERY field in the output schema MUST be filled with substantive, useful, realistic ${year} content. "N/A", "TBD", "Coming soon", "Contact for details", empty strings are STRICTLY FORBIDDEN.
- For well-known brands (TIME=1992, IMS=1977, Career Launcher=1995, 2IIM, iQuanta, Bulls Eye, Endeavor, Cracku, Hitbullseye) you have abundant verified data — USE IT.
- When the EXACT current-year figure isn't in your training data, give a tight realistic ${year - 1}-${year} range (e.g. "INR 35,000 - 55,000"). Never write "varies", "depends".

# SCOPE LOCK — MBA / MASTERS-IN-MANAGEMENT ENTRANCE COACHING ONLY
- Cover ONLY coaching for management-entrance exams: CAT, XAT, GMAT, GRE-for-MiM, NMAT, SNAP, CMAT, MAT, MAH-CET, IIFT, TISSNET, MICAT, KMAT.
- DO NOT mention coaching for JEE, NEET, GATE, UPSC, SSC, banking, CA/CS, coding bootcamps, school tuition.

# MODE-AWARENESS
- Mode is "${mode}". If Online: do NOT claim physical centres; emphasise nationwide live + recorded delivery, LMS, doubt-solving stack. Skip city/state-specific claims; target nationwide search intent.
- If Offline: anchor every claim to ${brief.city || "the listed city"}, ${brief.state || "state"} centre. Mention local landmarks/coverage and city-specific keywords.
- If Hybrid: cover both — nationwide online + named offline centres; cross-link.

# SEO RULES (NON-NEGOTIABLE — DETAILED RESEARCH MODE)
- Primary keyword: "${targetKw}". MUST appear in: meta_title, meta_description, overview body (first 60 words), at least 2 <h2> headings across rich sections, and in slug.
- Secondary keywords (${secKws.join(", ") || "infer naturally"}) sprinkled naturally — also derive 6-10 long-tail variants like "[institute] CAT fees ${year}", "[institute] vs TIME/IMS", "[institute] reviews ${year}", "[city] CAT coaching near me".
- Generate keyword-rich H2/H3 headings; use exact-match + synonym variants; natural keyword density 1.0-1.8%.
- Cover search-intent quartet: Informational (what/how), Commercial (best/top/vs), Transactional (fees/enrol/demo), Navigational (login/centres/contact).
- Each rich-text body uses semantic HTML only: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. Never <html>, <head>, <body>, <h1>, <font>, no class/id/style attributes.
- 180-280 words per rich body, 2-4 sentence paragraphs, lists for 3+ items, comparison/fee tables where relevant.
- Internal anchors: <a href="/coaching">top CAT coaching</a>, <a href="/exam/cat">CAT exam</a>, <a href="/colleges">top MBA colleges</a>, <a href="/profile-analyzer">AI Profile Analyzer</a>.
- End the longest body with <p><em>Last updated: ${todayIso}</em></p>.
- NEVER start any paragraph or heading with a question. Headings are declarative.
- NEVER use phrases: "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving".`;

    const userPrompt = `Generate a complete, ready-to-publish profile for the following Indian MBA-entrance coaching institute. Verify every factual claim against your training knowledge AND the strict source above when present.

# INSTITUTE
- Name: ${brief.name}
- Website: ${brief.website || "(use the official site if you know it; else leave empty)"}
- Official source URL: ${sourceUrl || "(none — use only well-established public knowledge)"}
- City: ${brief.city || (mode === "Online" ? "(none — Online only, nationwide)" : "(use the actual HQ / primary centre city; never guess)")}
- State: ${brief.state || ""}
- Mode: ${mode}
- Type: ${brief.instituteType || (mode === "Offline" ? "city" : "hybrid")}
- Exam focus: ${exams.length ? exams.join(", ") : "CAT, XAT, NMAT, SNAP, CMAT (infer)"}
- Flagship programs: ${flagship.length ? flagship.join(", ") : "(infer real flagship products like AIMCAT / SimCAT / Mock CAT)"}
- Primary target keyword: "${targetKw}"
- Secondary keywords: ${secKws.length ? secKws.join(", ") : "(none)"}
- Today: ${todayIso}; cycle ${year}-${year + 1}.`;

    const richBody = (label: string) => ({ type: "object", properties: { body: { type: "string", description: `${label}. Semantic HTML only, 80-180 words, primary keyword used naturally.` } }, required: ["body"] });
    const bullets = (label: string) => ({ type: "object", properties: { items: { type: "array", items: { type: "string" }, minItems: 4, description: `${label}. 5-8 short, concrete bullets.` } }, required: ["items"] });

    const tool = {
      type: "function",
      function: {
        name: "publish_full_institute_profile",
        description: "Return complete institute basic info + every modular section (HTML allowed in rich bodies).",
        parameters: {
          type: "object",
          properties: {
            basic: {
              type: "object",
              properties: {
                name: { type: "string" },
                slug: { type: "string", description: "lowercase, hyphens, <70 chars, includes primary keyword tokens" },
                description: { type: "string", description: "1-2 sentence elevator summary, plain text, includes primary keyword." },
                city: { type: "string" },
                state: { type: "string" },
                website: { type: "string" },
                phone: { type: "string" },
                email: { type: "string" },
                mode: { type: "string", enum: ["Online", "Offline", "Hybrid"] },
                rating: { type: "number" },
                students_count: { type: "integer" },
                success_rate: { type: "integer" },
                meta_title: { type: "string", description: "55-60 chars, primary keyword first." },
                meta_description: { type: "string", description: "120-150 chars, includes primary keyword + CTA verb." },
                keywords: { type: "array", items: { type: "string" }, minItems: 8 },
                primary_keyword: { type: "string" },
              },
              required: ["name", "slug", "description", "mode", "meta_title", "meta_description", "keywords", "primary_keyword", "rating", "students_count", "success_rate"],
            },
            sections: {
              type: "object",
              properties: {
                overview: richBody("Overview"),
                key_highlights: bullets("Key highlights / USPs"),
                courses_offered: bullets("Courses offered (CAT Classroom, NMAT Online, etc.)"),
                course_formats: bullets("Course formats (Classroom / Live Online / Recorded / Crash / Test Series / 1:1)"),
                batch_details: { type: "object", properties: { body: { type: "string", description: "Batch size, start dates, duration, weekday/weekend. 80-150 words." } }, required: ["body"] },
                teaching_methodology: richBody("Teaching methodology"),
                faculty: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      minItems: 3,
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          experience: { type: "string" },
                          expertise: { type: "string" },
                          achievements: { type: "string" },
                        },
                        required: ["name", "experience", "expertise", "achievements"],
                      },
                    },
                  },
                  required: ["items"],
                },
                study_material: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                mock_tests: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                results: richBody("Results & success rate (with year-wise selection numbers, never invented; use realistic ranges)"),
                topper_testimonials: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array", minItems: 4,
                      items: {
                        type: "object",
                        properties: { name: { type: "string" }, exam: { type: "string" }, text: { type: "string" } },
                        required: ["name", "exam", "text"],
                      },
                    },
                  },
                  required: ["items"],
                },
                student_reviews: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array", minItems: 3,
                      items: {
                        type: "object",
                        properties: { name: { type: "string" }, rating: { type: "number" }, text: { type: "string" } },
                        required: ["name", "rating", "text"],
                      },
                    },
                  },
                  required: ["items"],
                },
                admission_process: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                eligibility: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                fees: { type: "object", properties: { body: { type: "string", description: "Fee structure with realistic INR ranges, installments, refund." } }, required: ["body"] },
                scholarships: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                demo_classes: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                doubt_solving: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                mentorship: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                infrastructure: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                tech_platform: { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
                why_choose: bullets("Why choose this institute (5-6 differentiators)"),
                pros_cons: {
                  type: "object",
                  properties: {
                    items: {
                      type: "object",
                      properties: {
                        pros: { type: "array", items: { type: "string" }, minItems: 3 },
                        cons: { type: "array", items: { type: "string" }, minItems: 2 },
                      },
                      required: ["pros", "cons"],
                    },
                  },
                  required: ["items"],
                },
                faqs: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array", minItems: 5,
                      items: {
                        type: "object",
                        properties: { q: { type: "string" }, a: { type: "string" } },
                        required: ["q", "a"],
                      },
                    },
                  },
                  required: ["items"],
                },
                ctas: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array", minItems: 2,
                      items: {
                        type: "object",
                        properties: { label: { type: "string" }, url: { type: "string" }, style: { type: "string" } },
                        required: ["label", "url"],
                      },
                    },
                  },
                  required: ["items"],
                },
              },
              required: [
                "overview", "key_highlights", "courses_offered", "course_formats", "batch_details",
                "teaching_methodology", "faculty", "study_material", "mock_tests", "results",
                "topper_testimonials", "student_reviews", "admission_process", "eligibility",
                "fees", "scholarships", "demo_classes", "doubt_solving", "mentorship",
                "infrastructure", "tech_platform", "why_choose", "pros_cons", "faqs", "ctas",
              ],
            },
          },
          required: ["basic", "sections"],
          additionalProperties: false,
        },
      },
    };

    const aiRes = await callAIGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "publish_full_institute_profile" } },
      max_tokens: 8000,
    }, { feature: "ai-coaching-institute-generate" });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, txt);
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      const msg = aiRes.status === 429 ? "Rate limit reached. Please try again in a minute."
        : aiRes.status === 402 ? "AI credits exhausted. Add funds in workspace settings."
        : "AI generation failed";
      return new Response(JSON.stringify({ error: msg, detail: txt.slice(0, 400) }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    await logAIUsage("ai-coaching-institute-generate", "google/gemini-2.5-flash", aiJson);
    const rawArgs = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!rawArgs) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try { parsed = JSON.parse(rawArgs); }
    catch (e) {
      return new Response(JSON.stringify({ error: "AI output malformed", detail: String(e).slice(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wrap each section in { enabled: true, data: <payload> } to match
    // src/lib/instituteSections.ts storage shape.
    const wrapped: Record<string, { enabled: boolean; data: any }> = {};
    for (const [k, v] of Object.entries(parsed.sections || {})) {
      wrapped[k] = { enabled: true, data: v as any };
    }

    return new Response(JSON.stringify({
      basic: parsed.basic || {},
      sections: wrapped,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-coaching-institute-generate error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
