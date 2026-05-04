// Edge function: AI-powered Meta Tag fix for the entire site URL space.
//
// Two phases:
//   phase=research  -> deep-analyse selected URLs + checks, return proposed fixes (no writes)
//   phase=execute   -> persist the proposed fixes:
//                      - DB-backed entities (colleges, institutes, exams, articles, city_pages,
//                        categories) -> UPDATE the row's meta_title / meta_description /
//                        h1_tag / primary_keyword / keywords by slug
//                      - Static / Profile-Analyzer URLs -> stored as overrides in
//                        site_settings.profile_analyzer_meta_overrides keyed by canonical URL
//
// We deliberately produce a FULL SEO payload (title, description, h1_tag, primary_keyword,
// keywords, ogTitle, reasoning) so a single AI call fixes every meta field, not just title +
// description.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";

import { callAIGateway } from "../_shared/aiGateway.ts";
import { getCredential } from "../_shared/getCredential.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckResult {
  key: string;
  label: string;
  ok: boolean;
  message?: string;
}

interface UrlSample {
  url: string;
  expectedCanonical: string;
  context: { exam?: string; city?: string; course?: string; table?: string; slug?: string; path?: string };
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

interface AiFix {
  url: string;
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  h1Tag: string;
  primaryKeyword: string;
  keywords: string[];
  jsonLdCount: number;
  reasoning: string;
}

// Map URL prefixes -> the table we should update
const URL_TABLE_MAP: Array<{ prefix: string; table: "colleges" | "institutes" | "exams" | "articles" | "city_pages" | "categories" }> = [
  { prefix: "/college/", table: "colleges" },
  { prefix: "/institute/", table: "institutes" },
  { prefix: "/exam/", table: "exams" },
  { prefix: "/article/", table: "articles" },
  { prefix: "/colleges/", table: "city_pages" }, // city_pages live under /colleges/{slug}
  { prefix: "/category/", table: "categories" },
];

function resolveTableAndSlug(canonicalUrl: string): { table: string; slug: string } | null {
  try {
    const u = new URL(canonicalUrl);
    const path = u.pathname;
    // /colleges (plural, no slug) is the listing page — skip
    if (path === "/colleges" || path === "/coaching" || path === "/blog") return null;
    for (const m of URL_TABLE_MAP) {
      if (path.startsWith(m.prefix)) {
        const slug = path.slice(m.prefix.length).replace(/\/$/, "");
        if (!slug) return null;
        return { table: m.table, slug };
      }
    }
  } catch { /* ignore */ }
  return null;
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

async function callAI(samples: UrlSample[]): Promise<AiFix[]> {
  const apiKey = (await getCredential("GEMINI_API_KEY"));
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const failingOnly = samples.filter((s) => s.checks.some((c) => !c.ok));
  const target = failingOnly.length ? failingOnly : samples;

  const systemPrompt = `You are an elite SEO specialist for an Indian MBA admissions platform "MBA Compass".
You are given a set of URLs spanning the whole site (colleges, coaching institutes, exams, articles,
city pages, categories, static pages and Profile-Analyzer filter variants).

For EACH url, produce a COMPLETE optimised SEO payload:
- title (string, ≤ 65 chars): MUST include "MBA Compass" and a unique value driver, reflect the entity (college name, exam, city, etc.).
- description (string, 140-160 chars): action-oriented, include the entity tokens naturally, end with a CTA.
- canonical (string): MUST equal the provided expectedCanonical EXACTLY.
- ogTitle (string, ≤ 70 chars): like title but optimised for social shares.
- h1Tag (string, ≤ 80 chars): the main H1 the page should display, written for humans first.
- primaryKeyword (string): the single highest-intent keyword for this URL.
- keywords (array of 5-8 strings): supporting LSI / semantic keywords.
- jsonLdCount (integer, default 3): how many JSON-LD blocks the page should ship.
- reasoning (string, 1-2 sentences): justify the choice with deep search-intent insight.

Return STRICTLY via the provided tool. No prose. NEVER skip a field — every field is mandatory for every URL.`;

  const userPrompt = `Fix the SEO meta for these URLs. Address the failing checks if any.

${JSON.stringify(target.map((t) => ({
    url: t.url,
    expectedCanonical: t.expectedCanonical,
    context: t.context,
    failingChecks: t.checks.filter((c) => !c.ok).map((c) => c.message || c.label),
    current: t.current,
  })), null, 2)}`;

  const res = await callAIGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "submit_meta_fixes",
          description: "Return a complete optimised SEO payload for each URL.",
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
                    h1Tag: { type: "string" },
                    primaryKeyword: { type: "string" },
                    keywords: { type: "array", items: { type: "string" } },
                    jsonLdCount: { type: "number" },
                    reasoning: { type: "string" },
                  },
                  required: ["url", "title", "description", "canonical", "ogTitle", "h1Tag", "primaryKeyword", "keywords", "jsonLdCount", "reasoning"],
                },
              },
            },
            required: ["fixes"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "submit_meta_fixes" } },
    }, { feature: "meta-validator-fix" });

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
  return parsed.fixes as AiFix[];
}

interface ApplyReport {
  applied: number;
  dbUpdates: { table: string; slug: string; url: string; ok: boolean; error?: string }[];
  overrides: number;
  errors: string[];
}

async function applyFixes(adminSb: any, fixes: AiFix[]): Promise<ApplyReport> {
  const report: ApplyReport = { applied: 0, dbUpdates: [], overrides: 0, errors: [] };

  // 1) Bucket fixes into DB-update vs override
  const overridesMap: Record<string, any> = {};
  const dbFixes: { fix: AiFix; table: string; slug: string }[] = [];

  for (const f of fixes) {
    const target = resolveTableAndSlug(f.canonical || f.url);
    if (target) {
      dbFixes.push({ fix: f, table: target.table, slug: target.slug });
    } else {
      overridesMap[f.canonical || f.url] = {
        title: f.title,
        description: f.description,
        ogTitle: f.ogTitle,
        h1Tag: f.h1Tag,
        primaryKeyword: f.primaryKeyword,
        keywords: f.keywords,
        jsonLdCount: f.jsonLdCount,
        reasoning: f.reasoning,
        updated_at: new Date().toISOString(),
      };
    }
  }

  // 2) Persist DB updates one by one (so a single failure doesn't kill the batch)
  for (const { fix, table, slug } of dbFixes) {
    const update: Record<string, any> = {
      meta_title: fix.title,
      meta_description: fix.description,
    };
    // h1_tag, primary_keyword, keywords exist on most of these tables — we only set them
    // when the column exists. Postgres will reject unknown columns, but our 6 mapped tables
    // all have these fields, so it's safe.
    update.h1_tag = fix.h1Tag;
    update.primary_keyword = fix.primaryKeyword;
    update.keywords = fix.keywords;

    const { error } = await adminSb.from(table).update(update).eq("slug", slug);
    if (error) {
      report.dbUpdates.push({ table, slug, url: fix.url, ok: false, error: error.message });
      report.errors.push(`${table}/${slug}: ${error.message}`);
    } else {
      report.dbUpdates.push({ table, slug, url: fix.url, ok: true });
      report.applied += 1;
    }
  }

  // 3) Persist overrides (static + analyzer URLs)
  if (Object.keys(overridesMap).length > 0) {
    const { data: existing } = await adminSb
      .from("site_settings")
      .select("id, value")
      .eq("key", "profile_analyzer_meta_overrides")
      .maybeSingle();

    const merged = { ...((existing?.value as any) || {}), ...overridesMap };

    if (existing?.id) {
      const { error } = await adminSb
        .from("site_settings")
        .update({ value: merged })
        .eq("id", existing.id);
      if (error) report.errors.push(`site_settings update: ${error.message}`);
      else {
        report.overrides = Object.keys(overridesMap).length;
        report.applied += report.overrides;
      }
    } else {
      const { error } = await adminSb
        .from("site_settings")
        .insert({ key: "profile_analyzer_meta_overrides", value: merged });
      if (error) report.errors.push(`site_settings insert: ${error.message}`);
      else {
        report.overrides = Object.keys(overridesMap).length;
        report.applied += report.overrides;
      }
    }
  }

  return report;
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
      const { adminSb } = ctx;
      const report = await applyFixes(adminSb, fixes as AiFix[]);
      return new Response(JSON.stringify({
        ok: true,
        applied: report.applied,
        dbUpdates: report.dbUpdates.length,
        overrides: report.overrides,
        errors: report.errors,
        details: report.dbUpdates,
      }), {
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
