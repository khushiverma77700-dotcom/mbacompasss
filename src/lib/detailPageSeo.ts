// Server-renders detail pages (articles, colleges, exams) so crawlers receive
// the real title, description, canonical and content in the first HTML
// response instead of a loading skeleton. Query keys match the page hooks,
// so the prefetched row is reused after hydration with no second fetch.
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canonicalUrl } from "@/lib/canonical";

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
  const title = clip(row.meta_title || opts.titleFrom(row), 70);
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
