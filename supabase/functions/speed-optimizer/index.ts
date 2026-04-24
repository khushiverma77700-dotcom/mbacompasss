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

interface ImageAuditItem {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  format: string;
  isOptimized: boolean;
  issues: string[];
  publicUrl: string;
}

interface OptimizationResult {
  totalScanned: number;
  totalFixed: number;
  fixes: OptimizationFix[];
  categories: Record<string, number>;
  imageAudit?: {
    totalImages: number;
    totalSizeBytes: number;
    totalSizeFormatted: string;
    optimizedCount: number;
    unoptimizedCount: number;
    largeImages: ImageAuditItem[];
    nonWebpImages: ImageAuditItem[];
    allImages: ImageAuditItem[];
  };
  timestamp: string;
}

// ─── HTML Optimization Functions ──────────────────

function addLazyLoading(html: string): { result: string; count: number } {
  let count = 0;
  const result = html.replace(/<img\b(?![^>]*\bloading\s*=)/gi, (match) => {
    count++;
    return match + ' loading="lazy"';
  });
  return { result, count };
}

function addAsyncDecoding(html: string): { result: string; count: number } {
  let count = 0;
  const result = html.replace(/<img\b(?![^>]*\bdecoding\s*=)/gi, (match) => {
    count++;
    return match + ' decoding="async"';
  });
  return { result, count };
}

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

function minifyHtml(html: string): { result: string; saved: number } {
  const original = html.length;
  const result = html
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\n\s*\n/g, '\n');
  return { result, saved: original - result.length };
}

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

function optimizeHtmlContent(html: string): { optimized: string; fixes: string[] } {
  if (!html || html.length < 10) return { optimized: html, fixes: [] };
  const fixes: string[] = [];
  let content = html;

  const lazy = addLazyLoading(content);
  if (lazy.count > 0) { content = lazy.result; fixes.push(`Added loading="lazy" to ${lazy.count} images`); }
  const decode = addAsyncDecoding(content);
  if (decode.count > 0) { content = decode.result; fixes.push(`Added decoding="async" to ${decode.count} images`); }
  const dims = addImageDimensions(content);
  if (dims.count > 0) { content = dims.result; fixes.push(`Added dimension hints to ${dims.count} images`); }
  const links = fixExternalLinks(content);
  if (links.count > 0) { content = links.result; fixes.push(`Secured ${links.count} external links`); }
  const minified = minifyHtml(content);
  if (minified.saved > 50) { content = minified.result; fixes.push(`Removed ${minified.saved} bytes whitespace`); }

  return { optimized: content, fixes };
}

// ─── Image Audit Functions ────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function getImageFormat(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ext;
}

async function auditStorageImages(supabase: any): Promise<OptimizationResult["imageAudit"]> {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("", {
      limit: 500,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error || !files) {
      console.error("Storage list error:", error);
      return undefined;
    }

    // Also check subfolders
    const allFiles: any[] = [];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp', 'avif', 'ico'];

    for (const file of files) {
      if (file.metadata) {
        // It's a file
        const ext = getImageFormat(file.name);
        if (imageExts.includes(ext)) {
          allFiles.push({ ...file, path: file.name });
        }
      } else {
        // It's a folder, list its contents
        const { data: subFiles } = await supabase.storage.from("uploads").list(file.name, { limit: 200 });
        if (subFiles) {
          for (const sf of subFiles) {
            if (sf.metadata) {
              const ext = getImageFormat(sf.name);
              if (imageExts.includes(ext)) {
                allFiles.push({ ...sf, path: `${file.name}/${sf.name}` });
              }
            }
          }
        }
      }
    }

    const items: ImageAuditItem[] = [];
    let totalSize = 0;
    let optimizedCount = 0;

    for (const file of allFiles) {
      const size = file.metadata?.size || 0;
      totalSize += size;
      const format = getImageFormat(file.name);
      const issues: string[] = [];

      // Check format
      const isModernFormat = ['webp', 'avif'].includes(format);
      if (!isModernFormat && format !== 'svg' && format !== 'ico') {
        issues.push(`Not in modern format (${format.toUpperCase()}) — convert to WebP for 30-50% savings`);
      }

      // Check size
      if (size > 500000) {
        issues.push(`Large file (${formatBytes(size)}) — compress to under 500KB`);
      } else if (size > 200000) {
        issues.push(`Medium file (${formatBytes(size)}) — consider compressing to under 200KB`);
      }

      // Check for SVG without optimization markers
      if (format === 'svg' && size > 50000) {
        issues.push(`Large SVG (${formatBytes(size)}) — optimize with SVGO`);
      }

      const isOptimized = issues.length === 0;
      if (isOptimized) optimizedCount++;

      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(file.path);

      items.push({
        name: file.name,
        path: file.path,
        size,
        sizeFormatted: formatBytes(size),
        format,
        isOptimized,
        issues,
        publicUrl: urlData?.publicUrl || '',
      });
    }

    // Sort by size descending
    items.sort((a, b) => b.size - a.size);

    return {
      totalImages: items.length,
      totalSizeBytes: totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      optimizedCount,
      unoptimizedCount: items.length - optimizedCount,
      largeImages: items.filter(i => i.size > 200000),
      nonWebpImages: items.filter(i => !['webp', 'avif', 'svg', 'ico'].includes(i.format)),
      allImages: items,
    };
  } catch (err) {
    console.error("Image audit error:", err);
    return undefined;
  }
}

// ─── Main Handler ─────────────────────────────────

async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: roleRow } = await sbAdmin
    .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authFail = await requireAdmin(req);
    if (authFail) return authFail;

    const {
      mode = "scan",
      tables = ["articles", "colleges", "institutes", "city_pages", "college_sections"],
      includeImages = true,
    } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const allFixes: OptimizationFix[] = [];
    const categories: Record<string, number> = {};
    let totalScanned = 0;

    // ─── HTML Content Optimization ──────────────
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
      const { data: rows, error } = await supabase.from(table).select(fields.join(",")).limit(500).returns<Record<string, any>[]>();
      if (error || !rows) continue;

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
                fix.includes("external") ? "link-security" : "html-minification";
              categories[fixType] = (categories[fixType] || 0) + 1;
              allFixes.push({
                table, id: row.id, name: row[config.nameField] || row.id,
                field, fixType, description: fix,
                before: content.substring(0, 100), after: optimized.substring(0, 100),
              });
            }

            if (mode === "fix") {
              await supabase.from(table).update({ [field]: optimized }).eq("id", row.id);
            }
          }
        }
      }
    }

    // ─── Image Audit ────────────────────────────
    let imageAudit: OptimizationResult["imageAudit"] | undefined;
    if (includeImages) {
      imageAudit = await auditStorageImages(supabase);
      if (imageAudit) {
        if (imageAudit.nonWebpImages.length > 0) {
          categories["non-webp-images"] = imageAudit.nonWebpImages.length;
        }
        if (imageAudit.largeImages.length > 0) {
          categories["large-images"] = imageAudit.largeImages.length;
        }
      }
    }

    const result: OptimizationResult = {
      totalScanned,
      totalFixed: mode === "fix" ? allFixes.length : 0,
      fixes: allFixes,
      categories,
      imageAudit,
      timestamp: new Date().toISOString(),
    };

    // Save results
    const storageKey = mode === "fix" ? "speed_optimizer_last_fix" : "speed_optimizer_last_scan";
    const { data: existing } = await supabase
      .from("site_settings").select("id").eq("key", storageKey).maybeSingle();

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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
