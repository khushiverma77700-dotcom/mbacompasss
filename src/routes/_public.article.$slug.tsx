import { createFileRoute } from "@tanstack/react-router";
import ArticlePage from "@/pages/ArticlePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/article/$slug")({
  head: () => ({ meta: [
    { title: "MBA Articles and Insights | MBA Compass" },
    { name: "description", content: "MBA college guides, entrance exam insights and preparation advice from MBA Compass." },
    { property: "og:title", content: "MBA Articles and Insights | MBA Compass" },
    { property: "og:description", content: "Explore college guides and MBA preparation insights." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <ArticlePage />,
  pendingComponent: PublicPageSkeleton,
});
