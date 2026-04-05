import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface OptimizationFix {
  table: string;
  id: string;
  name: string;
  field: string;
  fixType: string;
  description: string;
  before: string;
  after: string;
}

interface OptimizationResult {
  totalScanned: number;
  totalFixed: number;
  fixes: OptimizationFix[];
  categories: Record<string, number>;
  timestamp: string;
}

// Add loading="lazy" to img tags that don't have it
function addLazyLoading(html: string): { result: string; count: number } {
  let count = 0;
  const result = html.replace(/<img\b(?![^>]*\bloading\s*=)/gi, (match) => {
    count++;
    return match + ' loading="lazy"';
  });
  return { result, count };
}

// Add decoding="async" to img tags
function addAsyncDecoding(html: string): { result: string; count: number } {
  let count = 0;
  const result = html.replace(/<img\b(?![^>]*\bdecoding\s*=)/gi, (match) => {
    count++;
    return match + ' decoding="async"';
  });
  return { result, count };
}

// Add rel="noopener noreferrer" to external links with target="_blank"
function fixExternalLinks(html: string): { result: string; count: number } {
  let count = 0;
  const result = html.replace(/<a\b([^>]*target\s*=\s*["']_blank["'][^>]*)(?!\brel\s*=)/gi, (match, attrs) => {
    if (!/\brel\s*=/.test(attrs)) {
      count++;
      return match.replace(/>$/, '') + ' rel="noopener noreferrer">';
    }
    return match;
  });
  return { result, count };
}

// Remove excessive whitespace from HTML content
function minifyHtml(html: string): { result: string; saved: number } {
  const original = html.length;
  const result = html
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\n\s*\n/g, '\n');
  return { result, saved: original - result.length };
}

// Add width/height to img tags that are missing them
function addImageDimensions(html: string): { result: string; count: number } {
  let count = 0;
  const result = html.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
    const hasWidth = /\bwidth\s*=/.test(attrs);
    const hasHeight = /\bheight\s*=/.test(attrs);
    if (!hasWidth && !hasHeight) {
      count++;
      return match.replace(/>$/, ' width="auto" height="auto">');
    }
    return match;
  });
  return { result, count };
}

// Fix all known HTML perf issues in one pass
function optimizeHtmlContent(html: string): { optimized: string; fixes: string[] } {
  if (!html || html.length < 10) return { optimized: html, fixes: [] };

  const fixes: string[] = [];
  let content = html;

  const lazy = addLazyLoading(content);
  if (lazy.count > 0) {
    content = lazy.result;
    fixes.push(`Added loading="lazy" to ${lazy.count} images`);
  }

  const decode = addAsyncDecoding(content);
  if (decode.count > 0) {
    content = decode.result;
    fixes.push(`Added decoding="async" to ${decode.count} images`);
  }

  const dims = addImageDimensions(content);
  if (dims.count > 0) {
    content = dims.result;
    fixes.push(`Added dimension hints to ${dims.count} images`);
  }

  const links = fixExternalLinks(content);
  if (links.count > 0) {
    content = links.result;
    fixes.push(`Secured ${links.count} external links with rel="noopener"`);
  }

  const minified = minifyHtml(content);
  if (minified.saved > 50) {
    content = minified.result;
    fixes.push(`Removed ${minified.saved} bytes of unnecessary whitespace`);
  }

  return { optimized: content, fixes };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { mode = "scan", tables = ["articles", "colleges", "institutes", "city_pages", "college_sections"] } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const allFixes: OptimizationFix[] = [];
    const categories: Record<string, number> = {};
    let totalScanned = 0;

    // Define which fields to scan per table
    const tableFields: Record<string, { contentFields: string[]; nameField: string }> = {
      articles: { contentFields: ["content", "excerpt", "intro"], nameField: "title" },
      colleges: { contentFields: ["description", "admission_process"], nameField: "name" },
      institutes: { contentFields: ["description"], nameField: "name" },
      city_pages: { contentFields: ["intro_content", "detailed_content", "faq_content"], nameField: "name" },
      college_sections: { contentFields: ["content"], nameField: "title" },
    };

    for (const table of tables) {
      const config = tableFields[table];
      if (!config) continue;

      const fields = ["id", config.nameField, ...config.contentFields];
      const { data: rows, error } = await supabase.from(table).select(fields.join(",")).limit(500);
      if (error || !rows) {
        console.error(`Error fetching ${table}:`, error);
        continue;
      }

      for (const row of rows) {
        totalScanned++;

        for (const field of config.contentFields) {
          const content = row[field];
          if (!content || typeof content !== "string" || content.length < 20) continue;

          const { optimized, fixes } = optimizeHtmlContent(content);

          if (fixes.length > 0) {
            for (const fix of fixes) {
              const fixType = fix.includes("lazy") ? "lazy-loading" :
                fix.includes("decoding") ? "async-decoding" :
                fix.includes("dimension") ? "image-dimensions" :
                fix.includes("external") ? "link-security" :
                "html-minification";

              categories[fixType] = (categories[fixType] || 0) + 1;

              allFixes.push({
                table,
                id: row.id,
                name: row[config.nameField] || row.id,
                field,
                fixType,
                description: fix,
                before: content.substring(0, 100),
                after: optimized.substring(0, 100),
              });
            }

            // Apply fix if mode is "fix"
            if (mode === "fix") {
              const { error: updateError } = await supabase
                .from(table)
                .update({ [field]: optimized })
                .eq("id", row.id);
              if (updateError) {
                console.error(`Failed to update ${table}/${row.id}/${field}:`, updateError);
              }
            }
          }
        }
      }
    }

    const result: OptimizationResult = {
      totalScanned,
      totalFixed: mode === "fix" ? allFixes.length : 0,
      fixes: allFixes,
      categories,
      timestamp: new Date().toISOString(),
    };

    // Save scan/fix results to site_settings
    const storageKey = mode === "fix" ? "speed_optimizer_last_fix" : "speed_optimizer_last_scan";
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", storageKey)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("site_settings").update({ value: result as any }).eq("id", existing.id);
    } else {
      await supabase.from("site_settings").insert({ key: storageKey, value: result as any });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("speed-optimizer error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
