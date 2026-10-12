import { createFileRoute } from "@tanstack/react-router";
import ArticlePage from "@/pages/ArticlePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { detailHead, prefetchDetail } from "@/lib/detailPageSeo";

export const Route = createFileRoute("/_public/article/$slug")({
  loader: async ({ context, params }) => ({
    row: await prefetchDetail(context.queryClient, "articles", params.slug),
  }),
  head: ({ loaderData, params }) =>
    detailHead({
      row: loaderData?.row,
      path: `/article/${params.slug}`,
      fallbackTitle: "MBA Articles and Insights | MBA Compass",
      fallbackDescription: "MBA college guides, entrance exam insights and preparation advice from MBA Compass.",
      titleFrom: (r) => `${r.title} | MBA Compass`,
      descriptionFrom: (r) => r.excerpt || r.content,
      type: "article",
    }),
  component: () => <ArticlePage />,
  pendingComponent: PublicPageSkeleton,
});
