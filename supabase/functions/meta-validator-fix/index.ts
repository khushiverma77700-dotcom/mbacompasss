// Edge function: AI-powered Meta Tag fix for the Profile Analyzer URL space.
// Two phases:
//   phase=research  -> deep-analyse selected URLs + checks, return proposed fixes (no writes)
//   phase=execute   -> persist the proposed fixes into site_settings.profile_analyzer_meta_overrides
//
// Profile-analyzer pages are static (rendered client-side from a single component),
// so "fixing" them means producing the optimal title/description/canonical/JSON-LD
// payload that the page should render for that URL variant. We store overrides keyed
// by canonical URL so the page can read them at render time.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckResult {
  key: string;          // title | description | canonical | http | jsonld
  label: string;
  ok: boolean;
  message?: string;
}

interface UrlSample {
  url: string;
  expectedCanonical: string;
  context: { exam?: string; city?: string; course?: string };
  checks: CheckResult[];
  current: {
    title: string;
    description: string;
    canonical: string;
    ogTitle: string;
    ogImage: string;
    jsonLdCount: number;
  };
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.replace("Bearer ", "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data } = await sb.auth.getUser(token);
  if (!data?.user) return null;
  const adminSb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roles } = await adminSb
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const isAdmin = (roles || []).some((r: any) => r.role === "admin");
  return isAdmin ? { adminSb, userId: data.user.id } : null;
}

async function callAI(samples: UrlSample[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const failingOnly = samples.filter((s) => s.checks.some((c) => !c.ok));
  const target = failingOnly.length ? failingOnly : samples;

  const systemPrompt = `You are an elite SEO specialist for an Indian MBA admissions platform "MBA Compass". 
You are given a set of profile-analyzer URLs (each is a filtered variant: by exam, city, course).
For each URL, produce optimised SEO meta:
- title: ≤ 65 chars, must include "MBA Compass" and a unique value driver, must reflect exam/city/course context.
- description: 140-160 chars, action-oriented, must include the exam/city/course tokens naturally, end with a CTA.
- canonical: must equal the provided expectedCanonical EXACTLY.
- ogTitle: like title but optimised for social shares (≤ 70 chars).
- jsonLdCount: integer (typically 3 = Organization + WebPage + ItemList).
- reasoning: 1-2 sentence justification covering deep research insight (search intent, keyword angle).
Return STRICTLY via the provided tool. No extra prose.`;

  const userPrompt = `Fix the SEO meta for these profile-analyzer URL variants. Address the failing checks.

${JSON.stringify(target.map((t) => ({
    url: t.url,
    expectedCanonical: t.expectedCanonical,
    context: t.context,
    failingChecks: t.checks.filter((c) => !c.ok).map((c) => c.message || c.label),
    current: t.current,
  })), null, 2)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "submit_meta_fixes",
          description: "Return optimised meta for each URL variant",
          parameters: {
            type: "object",
            properties: {
              fixes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    canonical: { type: "string" },
                    ogTitle: { type: "string" },
                    jsonLdCount: { type: "number" },
                    reasoning: { type: "string" },
                  },
                  required: ["url", "title", "description", "canonical", "ogTitle", "jsonLdCount", "reasoning"],
                },
              },
            },
            required: ["fixes"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "submit_meta_fixes" } },
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached, please retry shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Top up in Settings → Workspace.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("AI returned no fixes");
  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.fixes as Array<{
    url: string;
    title: string;
    description: string;
    canonical: string;
    ogTitle: string;
    jsonLdCount: number;
    reasoning: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await requireAdmin(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phase, samples, fixes } = await req.json();

    if (phase === "research") {
      if (!Array.isArray(samples) || samples.length === 0) {
        return new Response(JSON.stringify({ error: "samples required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const proposed = await callAI(samples as UrlSample[]);
      return new Response(JSON.stringify({ ok: true, proposed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (phase === "execute") {
      if (!Array.isArray(fixes) || fixes.length === 0) {
        return new Response(JSON.stringify({ error: "fixes required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Persist as a JSON map keyed by canonical URL inside a settings row.
      const { adminSb } = ctx;
      const map: Record<string, any> = {};
      for (const f of fixes) {
        map[f.canonical] = {
          title: f.title,
          description: f.description,
          ogTitle: f.ogTitle,
          jsonLdCount: f.jsonLdCount,
          reasoning: f.reasoning,
          updated_at: new Date().toISOString(),
        };
      }

      // Try to merge into existing site_settings row
      const { data: existing } = await adminSb
        .from("site_settings")
        .select("id, value")
        .eq("key", "profile_analyzer_meta_overrides")
        .maybeSingle();

      const merged = { ...((existing?.value as any) || {}), ...map };

      if (existing?.id) {
        await adminSb
          .from("site_settings")
          .update({ value: merged })
          .eq("id", existing.id);
      } else {
        await adminSb
          .from("site_settings")
          .insert({ key: "profile_analyzer_meta_overrides", value: merged });
      }

      return new Response(JSON.stringify({ ok: true, applied: fixes.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown phase" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("meta-validator-fix error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
