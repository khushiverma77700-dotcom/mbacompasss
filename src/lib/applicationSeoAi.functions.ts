// AI SEO writer for the College & Exam Applications module.
//
// Generates title / description / H1 / intro / H2 outline / keyword cluster /
// FAQs / image alt / slug suggestion / internal-link ideas for one application
// record, using ONLY the data an admin already stored. The prompt forbids
// inventing fees, deadlines, cutoffs, eligibility rules or placement numbers.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rowSchema = z.object({
  name: z.string().min(1),
  short_name: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  tier: z.string().nullable().optional(),
  program: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  application_open_date: z.string().nullable().optional(),
  application_deadline: z.string().nullable().optional(),
  application_fee: z.number().nullable().optional(),
  program_fee: z.number().nullable().optional(),
  accepted_exams: z.array(z.string()).nullable().optional(),
  eligibility: z.string().nullable().optional(),
  selection_process: z.string().nullable().optional(),
  cutoff_note: z.string().nullable().optional(),
  average_package: z.number().nullable().optional(),
  median_package: z.number().nullable().optional(),
  highest_package: z.number().nullable().optional(),
  short_description: z.string().nullable().optional(),
});

const inputSchema = z.object({
  row: rowSchema,
  year: z.string().optional(),
});

export type ApplicationSeoSuggestion = {
  seo_title: string;
  seo_description: string;
  seo_h1: string;
  seo_intro: string;
  seo_image_alt: string;
  slug_suggestion: string;
  h2_outline: string[];
  seo_keywords: string[];
  internal_links: string[];
  seo_faqs: { question: string; answer: string }[];
};

const CATEGORY_LABEL: Record<string, string> = {
  exam: "MBA entrance exam",
  iim: "IIM",
  tier1: "Tier 1 non-IIM B-school",
  tier2: "Tier 2 non-IIM B-school",
};

const clamp = (value: unknown, max: number): string => {
  const s = String(value ?? "").trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
};

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];

const asFaqs = (value: unknown): { question: string; answer: string }[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const o = (item ?? {}) as Record<string, unknown>;
          return {
            question: String(o["question"] ?? "").trim(),
            answer: String(o["answer"] ?? "").trim(),
          };
        })
        .filter((f) => f.question && f.answer)
    : [];

const extractJson = (text: string): Record<string, unknown> => {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI reply could not be read. Try again.");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
};

export const generateApplicationSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ suggestion: ApplicationSeoSuggestion }> => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Only administrators can generate SEO content.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The AI service is not configured.");

    const row = data.row;
    const admissionYear = data.year || String(new Date().getFullYear() + 1);

    const facts: string[] = [];
    const push = (label: string, value: unknown) => {
      if (value === null || value === undefined || value === "") return;
      if (Array.isArray(value) && value.length === 0) return;
      facts.push(`${label}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
    };
    push("Name", row.name);
    push("Short name", row.short_name);
    push("Type", CATEGORY_LABEL[row.category ?? ""] ?? row.category);
    push("Tier", row.tier);
    push("Programme", row.program);
    push("Location", row.location);
    push("Application opens", row.application_open_date);
    push("Application last date", row.application_deadline);
    push("Application fee (INR)", row.application_fee);
    push("Programme fee (INR)", row.program_fee);
    push("Accepted exams", row.accepted_exams);
    push("Eligibility", row.eligibility);
    push("Selection process", row.selection_process);
    push("Cutoff note", row.cutoff_note);
    push("Average package (INR)", row.average_package);
    push("Median package (INR)", row.median_package);
    push("Highest package (INR)", row.highest_package);
    push("Existing summary", row.short_description);

    const systemPrompt = `You are a senior Indian MBA admissions SEO editor writing for mbacompass.in.

ABSOLUTE RULE: use ONLY the facts supplied. Never invent or estimate a fee, deadline, cutoff, percentile, package, ranking or eligibility rule. If a fact is missing, write around it — never guess and never use placeholders such as "XX".

Search intent to serve: application form, application last date, application deadline, application fee, admission ${admissionYear}, course fees, cutoff, CAT / XAT / GMAT / NMAT acceptance, average package, placements, eligibility, selection process, apply online.

Tone: professional MBA advisor. No emojis, no hype, Indian English.

Return STRICT JSON only with exactly these keys:
{
  "seo_title": "<= 60 characters, keyword-first, includes the name and ${admissionYear}",
  "seo_description": "150-158 characters, primary keyword inside the first 120 characters, ends with a student action cue",
  "seo_h1": "unique from seo_title, natural, includes the name",
  "seo_intro": "two short paragraphs, 110-170 words total, answer-first: what the application is, when it closes, what it costs — only from the facts",
  "h2_outline": ["6-9 H2 headings students actually search"],
  "seo_keywords": ["12-18 keywords mixing generic and name-specific clusters"],
  "seo_faqs": [{"question": "...", "answer": "1-3 fact-based sentences"}],
  "seo_image_alt": "<= 120 characters describing the logo or banner image",
  "slug_suggestion": "lowercase-hyphenated-slug",
  "internal_links": ["6-10 internal link ideas as 'anchor text -> /path' on mbacompass.in"]
}
Produce 6-10 FAQs and make every answer supportable by the facts.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Facts for this application record:\n${facts.join("\n")}\n\nAdmission year: ${admissionYear}. Return the JSON now.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[application-seo-ai] gateway error", response.status, detail.slice(0, 400));
      if (response.status === 429) {
        throw new Error("The AI service is busy right now. Wait a minute and try again.");
      }
      if (response.status === 402) {
        throw new Error("The AI workspace is out of credits.");
      }
      throw new Error("The AI service could not be reached.");
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = extractJson(payload?.choices?.[0]?.message?.content ?? "");

    return {
      suggestion: {
        seo_title: clamp(parsed["seo_title"], 62),
        seo_description: clamp(parsed["seo_description"], 158),
        seo_h1: String(parsed["seo_h1"] ?? "").trim(),
        seo_intro: String(parsed["seo_intro"] ?? "").trim(),
        seo_image_alt: clamp(parsed["seo_image_alt"], 120),
        slug_suggestion: String(parsed["slug_suggestion"] ?? "").trim(),
        h2_outline: asStrings(parsed["h2_outline"]),
        seo_keywords: asStrings(parsed["seo_keywords"]),
        internal_links: asStrings(parsed["internal_links"]),
        seo_faqs: asFaqs(parsed["seo_faqs"]),
      },
    };
  });
