// Pre-publish SEO validator — used by admin "Validate before publish" flow
// and by bulk operations. Mirrors the logic in src/lib/seoValidator.ts so a
// single rule set runs both client-side and server-side.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Severity = "error" | "warning";
interface Issue { field: string; message: string; severity: Severity }
interface SEOInput {
  contentType: string;
  recordId?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  h1_tag?: string | null;
  primary_keyword?: string | null;
  keywords?: string[] | null;
  slug?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  twitter_title?: string | null;
  schema_markup?: unknown;
  url?: string | null;
}

const STOP = new Set(["the","a","an","of","and","or","but","in","on","at","to","for","with","by","as","is","it","this","that","these","those","be","are","was","were"]);

const REQUIRED: Record<string,string[]> = {
  Article:["headline","author","datePublished"],
  NewsArticle:["headline","author","datePublished"],
  BlogPosting:["headline","author","datePublished"],
  FAQPage:["mainEntity"],
  Course:["name","provider"],
  Organization:["name"],
  EducationalOrganization:["name"],
  CollegeOrUniversity:["name"],
  BreadcrumbList:["itemListElement"],
  Review:["author","reviewRating"],
  AggregateRating:["ratingValue","reviewCount"],
};

function normSchemas(input: unknown): any[] {
  if (input == null) return [];
  let v: any = input;
  if (typeof v === "string") {
    const s = v.trim(); if (!s) return [];
    try { v = JSON.parse(s); } catch { return [{ __invalid: true }]; }
  }
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object");
  if (typeof v === "object") return [v];
  return [];
}

function validate(input: SEOInput): { ok: boolean; errors: Issue[]; warnings: Issue[]; passed: string[] } {
  const errors: Issue[] = [], warnings: Issue[] = [], passed: string[] = [];
  const primary = (input.primary_keyword || "").toLowerCase().trim();
  const has = (s: string | null | undefined) => !!primary && !!s && s.toLowerCase().includes(primary);

  const mt = (input.meta_title || "").trim();
  if (!mt) errors.push({field:"meta_title",message:"Meta title is required.",severity:"error"});
  else {
    if (mt.length < 30) warnings.push({field:"meta_title",message:`Short (${mt.length} chars). Aim 50–60.`,severity:"warning"});
    else if (mt.length > 60) errors.push({field:"meta_title",message:`Too long (${mt.length} chars). Keep under 60.`,severity:"error"});
    else passed.push("Meta title length");
    if (primary && !has(mt)) warnings.push({field:"meta_title",message:`Missing primary keyword "${input.primary_keyword}".`,severity:"warning"});
  }

  const md = (input.meta_description || "").trim();
  if (!md) errors.push({field:"meta_description",message:"Meta description is required.",severity:"error"});
  else {
    if (md.length < 120) warnings.push({field:"meta_description",message:`Short (${md.length} chars). Aim 150–160.`,severity:"warning"});
    else if (md.length > 165) errors.push({field:"meta_description",message:`Too long (${md.length} chars). Keep under 160.`,severity:"error"});
    else passed.push("Meta description length");
    if (!/[.!?]$/.test(md)) warnings.push({field:"meta_description",message:"Should end with sentence punctuation.",severity:"warning"});
    if (primary && !has(md)) warnings.push({field:"meta_description",message:`Missing primary keyword.`,severity:"warning"});
  }

  const h1 = (input.h1_tag || "").trim();
  if (!h1) warnings.push({field:"h1_tag",message:"H1 tag is empty.",severity:"warning"});
  else if (mt && h1.toLowerCase() === mt.toLowerCase()) warnings.push({field:"h1_tag",message:"H1 identical to meta title.",severity:"warning"});

  const slug = (input.slug || "").trim();
  if (!slug) errors.push({field:"slug",message:"Slug is required.",severity:"error"});
  else {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push({field:"slug",message:"Must be lowercase kebab-case.",severity:"error"});
    else passed.push("Slug format");
    if (slug.length > 70) warnings.push({field:"slug",message:`Long (${slug.length} chars). Aim ≤ 60.`,severity:"warning"});
    const stops = slug.split("-").filter((w) => STOP.has(w));
    if (stops.length >= 3) warnings.push({field:"slug",message:`${stops.length} stop words: ${stops.join(", ")}.`,severity:"warning"});
  }

  const kws = Array.isArray(input.keywords) ? input.keywords.filter((k:any)=>typeof k==="string"&&k.trim()) : [];
  if (kws.length < 5) warnings.push({field:"keywords",message:`Only ${kws.length} keywords. Add ≥ 5.`,severity:"warning"});
  else if (kws.length > 30) warnings.push({field:"keywords",message:`${kws.length} keywords — too many.`,severity:"warning"});
  else passed.push("Keyword count");

  if (!input.og_image) warnings.push({field:"og_image",message:"OG image missing.",severity:"warning"});

  const schemas = normSchemas(input.schema_markup);
  if (schemas.length === 0) {
    warnings.push({field:"schema_markup",message:"No JSON-LD schema attached.",severity:"warning"});
  } else {
    schemas.forEach((s, idx) => {
      if (s.__invalid) { errors.push({field:`schema[${idx}]`,message:"Invalid JSON.",severity:"error"}); return; }
      const ctx = s["@context"];
      if (!ctx || (typeof ctx === "string" && !/schema\.org/i.test(ctx))) errors.push({field:`schema[${idx}]`,message:`Missing @context "https://schema.org".`,severity:"error"});
      const t = s["@type"];
      if (!t) { errors.push({field:`schema[${idx}]`,message:"Missing @type.",severity:"error"}); return; }
      const types = Array.isArray(t) ? t : [t];
      for (const tt of types) {
        const req = REQUIRED[String(tt)];
        if (req) for (const f of req) {
          if (s[f] == null || (Array.isArray(s[f]) && s[f].length === 0)) {
            errors.push({field:`schema[${idx}].${f}`,message:`${tt} requires "${f}".`,severity:"error"});
          }
        }
      }
    });
    passed.push(`${schemas.length} schema block(s)`);
  }

  return { ok: errors.length === 0, errors, warnings, passed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();

    // Bulk mode: { items: SEOInput[] }
    if (Array.isArray(body?.items)) {
      const results = body.items.map((it: SEOInput) => ({ ...validate(it), contentType: it.contentType, recordId: it.recordId, url: it.url }));
      // Optional: persist
      if (body.persist === true) {
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const rows = results.filter((r: any) => r.recordId).map((r: any) => ({
          content_type: r.contentType, record_id: r.recordId, url: r.url || null,
          passed: r.ok, errors: r.errors, warnings: r.warnings,
          error_count: r.errors.length, warning_count: r.warnings.length,
        }));
        if (rows.length) await sb.from("seo_validation_reports").insert(rows);
      }
      return new Response(JSON.stringify({ ok: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Single mode
    const result = validate(body as SEOInput);
    if (body.persist === true && body.recordId && body.contentType) {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await sb.from("seo_validation_reports").insert({
        content_type: body.contentType, record_id: body.recordId, url: body.url || null,
        passed: result.ok, errors: result.errors, warnings: result.warnings,
        error_count: result.errors.length, warning_count: result.warnings.length,
      });
    }
    return new Response(JSON.stringify({ ok: true, ...result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[validate-seo] error", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
