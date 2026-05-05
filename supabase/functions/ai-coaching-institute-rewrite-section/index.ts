// Rewrites a single coaching-institute section's HTML/text body to be more
// SEO-friendly while preserving meaning. Used by the "Run AI SEO" auto-rewrite
// flow on /admin/coaching-institutes/:id.

import { callAIGateway } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  instituteName: string;
  city?: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  sectionId: string;
  sectionLabel: string;
  currentBody: string;     // can be HTML
  audience?: string;       // optional context
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const b = (await req.json()) as Body;
    if (!b?.primaryKeyword || !b?.sectionId) {
      return new Response(JSON.stringify({ error: "primaryKeyword and sectionId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const today = new Date().toISOString().slice(0, 10);
    const year = new Date().getFullYear();
    const sec = (b.secondaryKeywords || []).filter(Boolean);

    const systemPrompt = `You are a senior SEO writer for Indian MBA-entrance coaching pages. Rewrite the section to be Google-rankable, factually grounded, and conversion-friendly.

RULES:
- Output semantic HTML only: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. No <html>, <head>, <body>, <h1>, no class/id/style attributes.
- Primary keyword "${b.primaryKeyword}" appears in the first 60 words AND in at least one <h2>.
- Sprinkle secondary keywords naturally: ${sec.join(", ") || "(none)"}.
- 2-4 sentence paragraphs, lists for 3+ items, at least 6 <strong> highlights overall.
- Add 2-3 internal anchors where relevant: <a href="/coaching">top CAT coaching</a>, <a href="/exam/cat">CAT exam</a>, <a href="/colleges">top MBA colleges</a>, <a href="/profile-analyzer">AI Profile Analyzer</a>.
- Length 180-320 words. Never start a heading or paragraph with a question. Headings must be declarative.
- Include current ${year} freshness signals (e.g. "${year}-${year + 1} batch", "${year - 1} CAT result"). End with <p><em>Last updated: ${today}</em></p>.
- Do NOT use: "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving".
- Stay strictly on MBA-entrance coaching topic. Never mention JEE/NEET/UPSC/SSC/banking/CA.`;

    const userPrompt = `Rewrite the "${b.sectionLabel}" section for MBA coaching institute "${b.instituteName}"${b.city ? ` (${b.city})` : ""}.

CURRENT CONTENT (may be empty or weak; rewrite from scratch if needed):
${b.currentBody || "(empty)"}

Return ONLY the rewritten HTML body — no preamble, no markdown fences.`;

    const aiRes = await callAIGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
    }, { feature: "ai-coaching-institute-rewrite-section" });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({ error: "AI rewrite failed", detail: txt.slice(0, 300) }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    let html = aiJson?.choices?.[0]?.message?.content || "";
    html = html.replace(/```html\s*/gi, "").replace(/```\s*$/g, "").trim();

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
