// Generates a daily vocab quiz from a list of word objects.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { words } = await req.json(); // [{id, word, meaning, synonyms, antonyms, example_business}]
    if (!Array.isArray(words) || words.length === 0 || words.length > 15) {
      return new Response(JSON.stringify({ error: "Provide 1–15 words" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const compact = words.map((w: any) => ({
      id: w.id, word: w.word, meaning: w.meaning,
      synonyms: w.synonyms?.slice(0, 4) || [], antonyms: w.antonyms?.slice(0, 4) || [],
      example: w.example_business,
    }));

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an MBA vocabulary quiz generator. For each word, create one quiz question of varied type (mcq | fill | synonym | correction | context). Always 4 options, exactly one correct. Keep questions short and unambiguous." },
          { role: "user", content: `Generate quiz for these words: ${JSON.stringify(compact)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "build_quiz",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      word_id: { type: "string" },
                      quiz_type: { type: "string", enum: ["mcq","fill","synonym","correction","context"] },
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                      correct_index: { type: "integer", minimum: 0, maximum: 3 },
                      explanation: { type: "string" },
                    },
                    required: ["word_id","quiz_type","question","options","correct_index","explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "build_quiz" } },
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
    const parsed = JSON.parse(args || "{}");
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("vocab-quiz-generate error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
