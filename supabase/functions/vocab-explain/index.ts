// Vocabulary explainer: takes a word, returns structured explanation. Caches into vocab_words.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { word, save = true } = await req.json();
    if (!word || typeof word !== "string" || word.length > 80) {
      return new Response(JSON.stringify({ error: "Invalid word" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const slug = slugify(word);

    // Cache hit
    const { data: existing } = await supabase.from("vocab_words").select("*").eq("slug", slug).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ word: existing, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an MBA vocabulary tutor. Always respond using the structured tool. Keep meanings under 25 words. Hinglish meaning should mix simple English and Hindi (Roman script). Provide 3 different example sentences (business context, interview context, professional email context). Use the exact word in each example." },
          { role: "user", content: `Explain the MBA/business word: "${word}"` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "explain_word",
            description: "Return structured vocabulary explanation",
            parameters: {
              type: "object",
              properties: {
                word: { type: "string" },
                part_of_speech: { type: "string" },
                meaning: { type: "string" },
                hinglish_meaning: { type: "string" },
                pronunciation: { type: "string", description: "IPA or simple phonetic, e.g. /ə-ˈmȯr-tə-ˌzā-shən/" },
                synonyms: { type: "array", items: { type: "string" }, maxItems: 5 },
                antonyms: { type: "array", items: { type: "string" }, maxItems: 5 },
                example_business: { type: "string" },
                example_interview: { type: "string" },
                example_email: { type: "string" },
                category: { type: "string", enum: ["finance","marketing","consulting","hr","economics","corp_comm","general"] },
                difficulty: { type: "string", enum: ["beginner","intermediate","cat","gdpi"] },
              },
              required: ["word","part_of_speech","meaning","hinglish_meaning","synonyms","antonyms","example_business","example_interview","example_email","category","difficulty"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "explain_word" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const j = await resp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No tool call returned");
    const parsed = JSON.parse(args);

    const row = {
      word: parsed.word || word,
      slug,
      part_of_speech: parsed.part_of_speech,
      meaning: parsed.meaning,
      hinglish_meaning: parsed.hinglish_meaning,
      pronunciation: parsed.pronunciation || null,
      synonyms: parsed.synonyms || [],
      antonyms: parsed.antonyms || [],
      example_business: parsed.example_business,
      example_interview: parsed.example_interview,
      example_email: parsed.example_email,
      category: parsed.category || "general",
      difficulty: parsed.difficulty || "intermediate",
      source: "ai",
    };

    let saved = row;
    if (save) {
      const { data, error } = await supabase.from("vocab_words").upsert(row, { onConflict: "slug" }).select().single();
      if (error) console.error("Save error", error);
      else saved = data as any;
    }

    return new Response(JSON.stringify({ word: saved, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("vocab-explain error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
