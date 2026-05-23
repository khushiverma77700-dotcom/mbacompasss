// Reformat existing mock_questions.explanation_html into clean, structured HTML.
// Admin-only. Processes in batches; call repeatedly until 'remaining' = 0.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You are a senior MBA-exam content editor. You rewrite messy single-paragraph explanations into clean, scannable HTML for students.

Output rules (NON-NEGOTIABLE):
- Return ONLY the rewritten HTML. No JSON, no markdown fences, no commentary.
- Preserve the original logic, numbers, formulas and final answer EXACTLY. Do not change values, do not re-solve.
- Keep all existing LaTeX math and SVG diagrams intact.
- Structure the output using these blocks (omit any that don't apply):
   <h4>Concept</h4><p>1-2 sentences naming the concept/formula tested.</p>
   <h4>Approach</h4><ol><li>step</li><li>step</li></ol>
   <h4>Step-by-step Solution</h4>  with EACH calculation step in its OWN <p> or <li>.
   <h4>Answer</h4><p><strong>final value / chosen option</strong></p>
   <h4>Common Traps</h4><ul><li>…</li></ul>
   <h4>Shortcut / Tip</h4><p>…</p>
- Block math ($$...$$) MUST sit alone in its own <p>. Never sandwich $$...$$ between words in a sentence.
- Use inline $...$ for variables and small expressions inside sentences.
- Use <strong> to highlight final numeric results.
- Indian English, no emojis, no "Therefore the answer is" wall-of-text.
- Always emit at least <h4>Concept</h4>, <h4>Step-by-step Solution</h4> and <h4>Answer</h4> sections.`;

async function rewriteOne(html: string): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Rewrite this explanation HTML:\n\n${html}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const j = await res.json();
  let out: string = j?.choices?.[0]?.message?.content ?? "";
  out = out.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const u = j?.usage ?? {};
  return {
    text: out,
    promptTokens: u.prompt_tokens ?? u.input_tokens ?? 0,
    completionTokens: u.completion_tokens ?? u.output_tokens ?? 0,
  };
}

type Filters = {
  test_id?: string;
  section_id?: string;
  topic?: string;
  question_id?: string;
  force?: boolean;
};

function buildQuery(admin: any, f: Filters, opts: { count?: boolean } = {}) {
  let q = admin
    .from("mock_questions")
    .select(
      "id, section_id, topic, explanation_html, mock_sections!inner(test_id, name, code)",
      opts.count ? { count: "exact" } : undefined,
    )
    .not("explanation_html", "is", null)
    .neq("explanation_html", "");

  if (!f.force) {
    q = q.not("explanation_html", "ilike", "%<h4>%");
  }
  if (f.question_id) q = q.eq("id", f.question_id);
  if (f.section_id) q = q.eq("section_id", f.section_id);
  if (f.topic) q = q.ilike("topic", f.topic);
  if (f.test_id) q = q.eq("mock_sections.test_id", f.test_id);
  return q;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "not admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const filters: Filters = {
      test_id: body.test_id || undefined,
      section_id: body.section_id || undefined,
      topic: body.topic || undefined,
      question_id: body.question_id || undefined,
      force: body.force === true,
    };
    const batchSize: number = Math.min(Math.max(body.batch_size ?? 20, 1), 40);
    const mode: "count" | "process" | "stats" = body.mode === "count" ? "count" : body.mode === "stats" ? "stats" : "process";

    if (mode === "count" || mode === "stats") {
      const { count: remaining } = await buildQuery(admin, filters, { count: true }).limit(1);
      // total = remaining (force ignores h4) OR remaining + already formatted
      const { count: totalRaw } = await buildQuery(admin, { ...filters, force: true }, { count: true }).limit(1);
      return new Response(
        JSON.stringify({ remaining: remaining ?? 0, total: totalRaw ?? 0, done: (totalRaw ?? 0) - (remaining ?? 0) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: rows, error: selErr } = await buildQuery(admin, filters).limit(batchSize);
    if (selErr) throw selErr;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, failed: 0, remaining: 0, done: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let ok = 0, failed = 0;
    const errors: string[] = [];
    await Promise.all(rows.map(async (r: any) => {
      try {
        const cleaned = await rewriteOne(r.explanation_html);
        if (!cleaned || cleaned.length < 30) throw new Error("empty rewrite");
        const { error: upErr } = await admin
          .from("mock_questions")
          .update({ explanation_html: cleaned })
          .eq("id", r.id);
        if (upErr) throw upErr;
        ok++;
      } catch (e) {
        failed++;
        errors.push(`${r.id}: ${(e as Error).message}`);
      }
    }));

    const { count: remaining } = await buildQuery(admin, filters, { count: true }).limit(1);
    return new Response(
      JSON.stringify({ processed: ok, failed, remaining: remaining ?? 0, done: (remaining ?? 0) === 0, errors: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
