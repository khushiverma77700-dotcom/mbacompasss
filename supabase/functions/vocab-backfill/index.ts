// Backfill missing fields (meaning_hindi, pronunciation_syllables, examples) for existing words
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an MBA vocabulary tutor for Indian aspirants. Always respond using the structured tool.
- meaning: clear English explanation, <30 words.
- meaning_hindi: pure Hindi translation in Devanagari script (no Roman).
- hinglish_meaning: friendly Hinglish explanation mixing Hindi + English in Roman script.
- pronunciation: IPA-style phonetic, e.g. /əˈmɔːrtaɪzeɪʃən/.
- pronunciation_syllables: word broken into easy syllables with hyphens and CAPS on the stressed syllable, e.g. 'uh-MOR-tuh-zay-shun'.
- 3 example sentences using the EXACT word, in business / interview / professional-email contexts.
- exam_appearances: list of past Indian MBA entrance exams where the word appeared (e.g. ['CAT 2019']). Empty array if unsure.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "explain_word",
    parameters: {
      type: "object",
      properties: {
        part_of_speech: { type: "string" },
        meaning: { type: "string" },
        meaning_hindi: { type: "string" },
        hinglish_meaning: { type: "string" },
        pronunciation: { type: "string" },
        pronunciation_syllables: { type: "string" },
        synonyms: { type: "array", items: { type: "string" }, maxItems: 5 },
        antonyms: { type: "array", items: { type: "string" }, maxItems: 5 },
        example_business: { type: "string" },
        example_interview: { type: "string" },
        example_email: { type: "string" },
        exam_appearances: { type: "array", items: { type: "string" }, maxItems: 6 },
      },
      required: ["part_of_speech","meaning","meaning_hindi","hinglish_meaning","pronunciation_syllables","example_business","example_interview","example_email"],
      additionalProperties: false,
    },
  },
};

async function enrich(word: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Explain the MBA/business word: "${word}"` },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "explain_word" } },
    }),
  });
  if (!resp.ok) throw new Error(`AI ${resp.status}`);
  const j = await resp.json();
  const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call");
  return JSON.parse(args);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth: only admins
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { batch = 8 } = await req.json().catch(() => ({}));

    // Fetch words missing key fields
    const { data: words, error } = await supabase
      .from("vocab_words")
      .select("id, word, meaning_hindi, pronunciation_syllables, hinglish_meaning, example_business")
      .or("meaning_hindi.is.null,pronunciation_syllables.is.null,hinglish_meaning.is.null,example_business.is.null")
      .limit(Math.min(batch, 15));

    if (error) throw error;
    if (!words || words.length === 0) {
      return new Response(JSON.stringify({ processed: 0, remaining: 0, done: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let processed = 0;
    const errors: string[] = [];
    for (const w of words) {
      try {
        const data = await enrich(w.word);
        await supabase.from("vocab_words").update({
          part_of_speech: data.part_of_speech,
          meaning: data.meaning,
          meaning_hindi: data.meaning_hindi,
          hinglish_meaning: data.hinglish_meaning,
          pronunciation: data.pronunciation || null,
          pronunciation_syllables: data.pronunciation_syllables,
          synonyms: data.synonyms || [],
          antonyms: data.antonyms || [],
          example_business: data.example_business,
          example_interview: data.example_interview,
          example_email: data.example_email,
          exam_appearances: data.exam_appearances || [],
        }).eq("id", w.id);
        processed++;
      } catch (e) {
        errors.push(`${w.word}: ${(e as Error).message}`);
      }
      // small delay to avoid rate-limit
      await new Promise((r) => setTimeout(r, 300));
    }

    // Count remaining
    const { count: remaining } = await supabase
      .from("vocab_words")
      .select("id", { count: "exact", head: true })
      .or("meaning_hindi.is.null,pronunciation_syllables.is.null,hinglish_meaning.is.null,example_business.is.null");

    return new Response(JSON.stringify({
      processed,
      remaining: remaining || 0,
      done: (remaining || 0) === 0,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("vocab-backfill error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
