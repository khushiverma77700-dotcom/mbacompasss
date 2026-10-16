// Server-renders detail pages (articles, colleges, exams) so crawlers receive
// the real title, description, canonical and content in the first HTML
// response instead of a loading skeleton. Query keys match the page hooks,
// so the prefetched row is reused after hydration with no second fetch.
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canonicalUrl } from "@/lib/canonical";
import { fitTitle } from "@/lib/collegeSeo";

type Table = "articles" | "colleges" | "exams";
const KEYS: Record<Table, string> = { articles: "article", colleges: "college", exams: "exam-page" };

export async function prefetchDetail(qc: QueryClient, table: Table, slug: string) {
  try {
    return await qc.ensureQueryData({
      queryKey: [KEYS[table], slug],
      queryFn: async () => {
        const { data, error } = await (supabase as any).from(table).select("*").eq("slug", slug).maybeSingle();
        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  } catch {
    return null; // never break the page; the component refetches client-side
  }
}

/** Final active redirect target for a path (follows up to 4 hops), or null. Never throws. */
export async function findSeoRedirect(path: string): Promise<string | null> {
  const seen = new Set([path]);
  let current = path;
  try {
    for (let hop = 0; hop < 4; hop++) {
      const { data } = await (supabase as any)
        .from("seo_redirects")
        .select("to_path")
        .eq("from_path", current)
        .eq("is_active", true)
        .maybeSingle();
      const to = data?.to_path as string | undefined;
      if (!to || !to.startsWith("/") || seen.has(to)) break;
      seen.add(to);
      current = to;
    }
  } catch {
    /* fall through with whatever was resolved */
  }
  return current !== path ? current : null;
}

const clip = (s: unknown, n = 160) => {
  const t = String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

export function detailHead(opts: {
  row: any;
  path: string;
  fallbackTitle: string;
  fallbackDescription: string;
  titleFrom: (row: any) => string;
  descriptionFrom: (row: any) => string;
  type: "article" | "website";
}) {
  const { row, path } = opts;
  const url = canonicalUrl(path);
  if (!row) {
    return {
      meta: [
        { title: opts.fallbackTitle },
        { name: "description", content: opts.fallbackDescription },
        { property: "og:title", content: opts.fallbackTitle },
        { property: "og:description", content: opts.fallbackDescription },
        { property: "og:type", content: opts.type },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  }
  const title = fitTitle(clip(row.meta_title || opts.titleFrom(row), 200));
  const description = clip(row.meta_description || opts.descriptionFrom(row) || opts.fallbackDescription);
  const image = [row.image_url, row.logo_url].find((v) => typeof v === "string" && /^https:\/\//.test(v));
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: opts.type },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
