import { createFileRoute, notFound } from "@tanstack/react-router";
import ArticlePage from "@/pages/ArticlePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { detailHead, prefetchDetail } from "@/lib/detailPageSeo";
import { buildArticleSchema } from "@/lib/aeoSchema";
import { resolveArticleDisplay } from "@/lib/articleDisplay";

export const Route = createFileRoute("/_public/article/$slug")({
  loader: async ({ context, params }) => {
    const row = await prefetchDetail(context.queryClient, "articles", params.slug);
    if (!row) throw notFound();
    return { row };
  },
  head: ({ loaderData, params }) => {
    const base = detailHead({
      row: loaderData?.row,
      path: `/article/${params.slug}`,
      fallbackTitle: "MBA Articles and Insights | MBA Compass",
      fallbackDescription: "MBA college guides, entrance exam insights and preparation advice from MBA Compass.",
      titleFrom: (r) => `${r.title} | MBA Compass`,
      descriptionFrom: (r) => r.excerpt || r.content,
      type: "article",
    });
    const row = loaderData?.row;
    if (!row) return base;
    const display = resolveArticleDisplay(row.content || "", row.prepared_display);
    return { ...base, scripts: [...("scripts" in base ? base.scripts : []), { type: "application/ld+json", children: JSON.stringify(buildArticleSchema({ ...row, preparedWordCount: display?.words })) }] };
  },
  component: () => <ArticlePage />,
  pendingComponent: PublicPageSkeleton,
});
