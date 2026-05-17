// CTR Optimizer edge function.
//
// Actions:
//   fetch-gsc          → pull worst-CTR queries/pages from Google Search Console
//   rewrite-meta       → AI rewrites a meta_title + meta_description for one URL
//   generate-faqs      → AI generates 5-8 FAQs for one URL
//   suggest-links      → AI suggests internal links for one underperforming page
//   apply-rewrite      → persists the rewrite to colleges/articles/institutes/exams/city_pages/categories
//   apply-faqs         → persists FAQs jsonb array
//   apply-freshness    → bumps updated_at on a row

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";
import { callAIGateway } from "../_shared/aiGateway.ts";
import { getCredential } from "../_shared/getCredential.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://mbacompass.in";
const GSC_BASE = "https://www.googleapis.com/webmasters/v3";
const WEBMASTERS_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

// ---------- GSC auth (JWT → access token) ----------
async function getServiceAccount(): Promise<ServiceAccount | null> {
  const raw = (await getCredential("GOOGLE_INDEXING_SERVICE_ACCOUNT")) || "";
  if (raw.trim()) {
    try {
      const j = JSON.parse(raw);
      return {
        client_email: j.client_email,
        private_key: j.private_key,
        token_uri: j.token_uri || "https://oauth2.googleapis.com/token",
      };
    } catch (_) {}
  }
  const email = await getCredential("GOOGLE_INDEXING_CLIENT_EMAIL");
  const pk = await getCredential("GOOGLE_INDEXING_PRIVATE_KEY");
  if (email && pk) {
    return {
      client_email: email,
      private_key: pk,
      token_uri: "https://oauth2.googleapis.com/token",
    };
  }
  return null;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: WEBMASTERS_SCOPE,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const signingInput = `${enc(header)}.${enc(payload)}`;

  let pem = sa.private_key
    .replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r/g, "\n")
    .replace(/^["']|["']$/g, "")
    .replace(/-----BEGIN [A-Z ]+-----/g, "").replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "").replace(/[^A-Za-z0-9+/=]/g, "");
  while (pem.length % 4 !== 0) pem += "=";

  const bin = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", bin, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput)
  );
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const resp = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${sigStr}`,
    }).toString(),
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error("GSC token exchange failed: " + JSON.stringify(data));
  }
  return data.access_token as string;
}

async function fetchGSC(opts: {
  dimensions: string[];
  days: number;
  rowLimit: number;
  minImpressions: number;
  maxCtr: number;
  posMin?: number;
  posMax?: number;
  site?: string;
}) {
  const sa = await getServiceAccount();
  if (!sa) throw new Error("GOOGLE_INDEXING_SERVICE_ACCOUNT secret not set");
  const token = await getAccessToken(sa);

  const end = new Date();
  const start = new Date(end.getTime() - opts.days * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const site = opts.site || `sc-domain:mbacompass.in`;
  const url = `${GSC_BASE}/sites/${encodeURIComponent(site)}/searchAnalytics/query`;

  const body: any = {
    startDate: fmt(start),
    endDate: fmt(end),
    dimensions: opts.dimensions,
    rowLimit: opts.rowLimit,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) {
    // Try the URL-prefix property as a fallback
    const site2 = `${SITE_URL}/`;
    const url2 = `${GSC_BASE}/sites/${encodeURIComponent(site2)}/searchAnalytics/query`;
    const resp2 = await fetch(url2, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data2 = await resp2.json();
    if (!resp2.ok) {
      throw new Error("GSC query failed: " + JSON.stringify(data2 || data));
    }
    return filterRows(data2.rows || [], opts);
  }
  return filterRows(data.rows || [], opts);
}

function filterRows(rows: any[], opts: { minImpressions: number; maxCtr: number; posMin?: number; posMax?: number }) {
  return rows.filter((r) => {
    if (r.impressions < opts.minImpressions) return false;
    if (r.ctr > opts.maxCtr) return false;
    if (opts.posMin !== undefined && r.position < opts.posMin) return false;
    if (opts.posMax !== undefined && r.position > opts.posMax) return false;
    return true;
  });
}

// ---------- AI rewrite ----------
async function aiJSON(systemPrompt: string, userPrompt: string): Promise<any> {
  const resp = await callAIGateway({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  }, { purpose: "structured", feature: "ctr-optimizer" });

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(text); } catch { return {}; }
}

async function rewriteMeta(input: { url: string; currentTitle?: string; currentDescription?: string; topQueries?: string[]; }) {
  const sys = `You are an elite SEO copywriter for MBA Compass (mbacompass.in). Rewrite meta titles and meta descriptions for maximum Google CTR.

RULES:
- Title formula: "<Primary Keyword> <Year/Number/Bracket> — <Specific Hook> | MBA Compass"
- Always include 2026 (current admission year) when relevant
- Use brackets like [2026], (Updated), or numbers (Top 10, ₹X LPA)
- Title 50-60 chars max, never over 60
- Description 140-158 chars, include keyword verbatim + benefit + soft CTA
- Match user search intent from the top queries
- Indian MBA aspirant audience — concrete, no fluff
- No emojis. Never repeat the same hook across pages.

Return ONLY valid JSON: {"title": "...", "description": "...", "reasoning": "..."}`;

  const user = `URL: ${input.url}
Current title: ${input.currentTitle || "(none)"}
Current description: ${input.currentDescription || "(none)"}
Top Google queries landing on this page: ${(input.topQueries || []).slice(0, 10).join(" | ") || "(unknown)"}

Rewrite the title + description.`;

  return aiJSON(sys, user);
}

async function generateFAQs(input: { url: string; topic?: string; topQueries?: string[]; }) {
  const sys = `You are an SEO expert generating FAQ rich snippets for MBA Compass pages.

RULES:
- Generate 6-8 FAQs that match real Indian MBA aspirant search intent
- Pull from the page's top Google queries to make questions match real searches
- Each answer 40-90 words, factual, direct, scannable
- No fluff, no "Great question!" preambles
- Answers should pass Google's FAQ rich-snippet eligibility (concrete, complete, self-contained)

Return ONLY valid JSON: {"faqs": [{"q": "...", "a": "..."}]}`;

  const user = `URL: ${input.url}
Topic: ${input.topic || "(infer from URL)"}
Real Google queries landing on this page: ${(input.topQueries || []).slice(0, 12).join(" | ") || "(unknown)"}

Generate FAQs.`;

  return aiJSON(sys, user);
}

async function suggestInternalLinks(input: { url: string; topQueries?: string[]; topPages?: { url: string; title?: string }[]; }) {
  const sys = `You are an internal-linking strategist for mbacompass.in.

Suggest 4-6 internal links that should be added FROM the user's top-traffic pages TO the underperforming target page. Each link uses descriptive anchor text matching the target page's primary keyword.

Return ONLY valid JSON: {"links": [{"from_url": "...", "anchor": "...", "context_sentence": "..."}]}`;

  const user = `Target page (struggling at position 4-10): ${input.url}
Top queries for the target: ${(input.topQueries || []).slice(0, 8).join(" | ")}

High-traffic pages where links could be inserted:
${(input.topPages || []).map((p) => `- ${p.url}${p.title ? " (" + p.title + ")" : ""}`).join("\n") || "- /\n- /colleges\n- /coaching"}

Suggest internal link insertions.`;

  return aiJSON(sys, user);
}

// ---------- Apply (persist to DB) ----------
const URL_TABLE_MAP: Array<{ prefix: string; table: string }> = [
  { prefix: "/college/", table: "colleges" },
  { prefix: "/institute/", table: "institutes" },
  { prefix: "/exam/", table: "exams" },
  { prefix: "/article/", table: "articles" },
  { prefix: "/colleges/", table: "city_pages" },
  { prefix: "/category/", table: "categories" },
];

function resolveTableAndSlug(pageUrl: string): { table: string; slug: string } | null {
  try {
    const u = new URL(pageUrl);
    const path = u.pathname.replace(/\/$/, "");
    if (path === "/colleges" || path === "/coaching" || path === "/blog") return null;
    for (const m of URL_TABLE_MAP) {
      if (path.startsWith(m.prefix)) {
        const slug = path.slice(m.prefix.length);
        if (!slug || slug.includes("/")) continue;
        return { table: m.table, slug };
      }
    }
  } catch {}
  return null;
}

// ---------- Main handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let userId: string | null = null;
  try {
    const auth = req.headers.get("authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (jwt) {
      const { data } = await supabase.auth.getUser(jwt);
      userId = data?.user?.id ?? null;
    }
  } catch {}

  let body: any = {};
  try { body = await req.json(); } catch {}
  const action = body.action;

  try {
    if (action === "fetch-gsc") {
      const rows = await fetchGSC({
        dimensions: body.dimensions || ["page", "query"],
        days: body.days ?? 28,
        rowLimit: body.rowLimit ?? 500,
        minImpressions: body.minImpressions ?? 100,
        maxCtr: body.maxCtr ?? 0.02,
        posMin: body.posMin,
        posMax: body.posMax,
      });
      return json({ rows });
    }

    if (action === "fetch-page-meta") {
      const r = resolveTableAndSlug(body.page_url);
      if (!r) return json({ error: "Cannot map URL to a table" }, 400);
      const { data, error } = await supabase
        .from(r.table)
        .select("meta_title,meta_description,name,title,faqs,updated_at")
        .eq("slug", r.slug)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json({ row: data, table: r.table, slug: r.slug });
    }

    if (action === "fetch-page-queries") {
      // top queries landing on a specific page
      const sa = await getServiceAccount();
      if (!sa) return json({ error: "GSC service account not configured" }, 500);
      const token = await getAccessToken(sa);
      const end = new Date();
      const start = new Date(end.getTime() - (body.days ?? 28) * 86400000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const site = `sc-domain:mbacompass.in`;
      const url = `${GSC_BASE}/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: fmt(start), endDate: fmt(end),
          dimensions: ["query"],
          rowLimit: 25,
          dimensionFilterGroups: [{
            filters: [{ dimension: "page", operator: "equals", expression: body.page_url }],
          }],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) return json({ error: JSON.stringify(data) }, 500);
      return json({ queries: (data.rows || []).map((r: any) => ({
        query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
      })) });
    }

    if (action === "bulk-rewrite") {
      // Auto-process N worst pages: fetch meta+queries, AI rewrite, return suggestions (no apply)
      const pages: string[] = body.pages || [];
      const results: any[] = [];
      for (const page_url of pages.slice(0, body.limit || 10)) {
        try {
          const r = resolveTableAndSlug(page_url);
          if (!r) { results.push({ page_url, error: "URL not mapped" }); continue; }
          const { data: row } = await supabase.from(r.table).select("meta_title,meta_description").eq("slug", r.slug).maybeSingle();
          // top queries
          const sa = await getServiceAccount();
          let topQueries: string[] = [];
          if (sa) {
            const token = await getAccessToken(sa);
            const end = new Date(); const start = new Date(end.getTime() - 28 * 86400000);
            const fmt = (d: Date) => d.toISOString().slice(0, 10);
            const qResp = await fetch(`${GSC_BASE}/sites/${encodeURIComponent("sc-domain:mbacompass.in")}/searchAnalytics/query`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                startDate: fmt(start), endDate: fmt(end), dimensions: ["query"], rowLimit: 10,
                dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: page_url }] }],
              }),
            });
            const qData = await qResp.json();
            topQueries = (qData.rows || []).map((x: any) => x.keys[0]);
          }
          const suggestion = await rewriteMeta({
            url: page_url,
            currentTitle: row?.meta_title || "",
            currentDescription: row?.meta_description || "",
            topQueries,
          });
          results.push({
            page_url,
            old_title: row?.meta_title || "",
            old_description: row?.meta_description || "",
            new_title: suggestion.title,
            new_description: suggestion.description,
            reasoning: suggestion.reasoning,
            top_queries: topQueries,
          });
        } catch (e: any) {
          results.push({ page_url, error: e?.message || String(e) });
        }
      }
      return json({ results });
    }

    if (action === "auto-fix-one") {
      // Full auto: fetch meta+queries → AI rewrite meta + FAQs → APPLY both + freshness bump
      const page_url = body.page_url;
      const opts = {
        rewriteMeta: body.rewriteMeta !== false,
        generateFaqs: body.generateFaqs !== false,
        bumpFreshness: body.bumpFreshness !== false,
      };
      const steps: any = { page_url, applied: {} };
      const r = resolveTableAndSlug(page_url);
      if (!r) return json({ error: "URL not mapped to a table", page_url }, 400);

      const { data: row } = await supabase.from(r.table)
        .select("meta_title,meta_description").eq("slug", r.slug).maybeSingle();
      if (!row) return json({ error: "Row not found for slug " + r.slug, page_url }, 404);

      // Top queries
      let topQueries: string[] = [];
      try {
        const sa = await getServiceAccount();
        if (sa) {
          const token = await getAccessToken(sa);
          const end = new Date(); const start = new Date(end.getTime() - 28 * 86400000);
          const fmt = (d: Date) => d.toISOString().slice(0, 10);
          const qResp = await fetch(`${GSC_BASE}/sites/${encodeURIComponent("sc-domain:mbacompass.in")}/searchAnalytics/query`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              startDate: fmt(start), endDate: fmt(end), dimensions: ["query"], rowLimit: 10,
              dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: page_url }] }],
            }),
          });
          const qData = await qResp.json();
          topQueries = (qData.rows || []).map((x: any) => x.keys[0]);
        }
      } catch (_) {}
      steps.top_queries = topQueries;

      // Meta rewrite + apply
      if (opts.rewriteMeta) {
        const sug = await rewriteMeta({
          url: page_url,
          currentTitle: row.meta_title || "",
          currentDescription: row.meta_description || "",
          topQueries,
        });
        if (sug?.title) {
          await supabase.from(r.table).update({
            meta_title: sug.title,
            meta_description: sug.description,
            updated_at: new Date().toISOString(),
          }).eq("slug", r.slug);
          await supabase.from("ctr_optimizations").insert({
            page_url, page_type: r.table, table_name: r.table, slug: r.slug,
            action: "auto-fix-meta",
            old_title: row.meta_title, new_title: sug.title,
            old_description: row.meta_description, new_description: sug.description,
            applied_by: userId,
          });
          steps.applied.meta = { old_title: row.meta_title, new_title: sug.title, new_description: sug.description };
        }
      }

      // FAQs + apply
      if (opts.generateFaqs) {
        const faqOut = await generateFAQs({ url: page_url, topic: row.meta_title || "", topQueries });
        const faqs = faqOut?.faqs || [];
        if (faqs.length > 0) {
          await supabase.from(r.table).update({
            faqs, updated_at: new Date().toISOString(),
          }).eq("slug", r.slug);
          await supabase.from("ctr_optimizations").insert({
            page_url, page_type: r.table, table_name: r.table, slug: r.slug,
            action: "auto-fix-faqs", payload: { count: faqs.length }, applied_by: userId,
          });
          steps.applied.faqs = faqs.length;
        }
      }

      // Freshness bump (free if meta or faqs already touched the row, but log it)
      if (opts.bumpFreshness) {
        await supabase.from(r.table).update({ updated_at: new Date().toISOString() }).eq("slug", r.slug);
        await supabase.from("ctr_optimizations").insert({
          page_url, page_type: r.table, table_name: r.table, slug: r.slug,
          action: "auto-fix-freshness", applied_by: userId,
        });
        steps.applied.freshness = true;
      }

      return json({ ok: true, ...steps });
    }

    if (action === "rewrite-meta") {
      const out = await rewriteMeta(body);
      return json(out);
    }

    if (action === "generate-faqs") {
      const out = await generateFAQs(body);
      return json(out);
    }

    if (action === "suggest-links") {
      const out = await suggestInternalLinks(body);
      return json(out);
    }

    if (action === "apply-rewrite") {
      const { page_url, new_title, new_description, old_title, old_description } = body;
      const r = resolveTableAndSlug(page_url);
      if (!r) return json({ error: "Cannot map URL to a database table" }, 400);

      const patch: any = {};
      if (new_title) patch.meta_title = new_title;
      if (new_description) patch.meta_description = new_description;
      patch.updated_at = new Date().toISOString();

      const { error } = await supabase.from(r.table).update(patch).eq("slug", r.slug);
      if (error) return json({ error: error.message }, 500);

      await supabase.from("ctr_optimizations").insert({
        page_url, page_type: r.table, table_name: r.table, slug: r.slug,
        action: "rewrite-meta",
        old_title, new_title, old_description, new_description,
        applied_by: userId,
      });
      return json({ ok: true, table: r.table, slug: r.slug });
    }

    if (action === "apply-faqs") {
      const { page_url, faqs } = body;
      const r = resolveTableAndSlug(page_url);
      if (!r) return json({ error: "Cannot map URL to a database table" }, 400);
      const { error } = await supabase.from(r.table).update({
        faqs: faqs || [],
        updated_at: new Date().toISOString(),
      }).eq("slug", r.slug);
      if (error) return json({ error: error.message }, 500);
      await supabase.from("ctr_optimizations").insert({
        page_url, page_type: r.table, table_name: r.table, slug: r.slug,
        action: "apply-faqs", payload: { count: (faqs || []).length },
        applied_by: userId,
      });
      return json({ ok: true });
    }

    if (action === "apply-freshness") {
      const { page_url } = body;
      const r = resolveTableAndSlug(page_url);
      if (!r) return json({ error: "Cannot map URL to a database table" }, 400);
      const { error } = await supabase.from(r.table).update({
        updated_at: new Date().toISOString(),
      }).eq("slug", r.slug);
      if (error) return json({ error: error.message }, 500);
      await supabase.from("ctr_optimizations").insert({
        page_url, page_type: r.table, table_name: r.table, slug: r.slug,
        action: "apply-freshness", applied_by: userId,
      });
      return json({ ok: true });
    }

    return json({ error: "Unknown action: " + action }, 400);
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
