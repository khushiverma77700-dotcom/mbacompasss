import { createFileRoute } from "@tanstack/react-router";
import ArticlePage from "@/pages/ArticlePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/article/$slug")({
  component: () => <ArticlePage />,
  pendingComponent: PublicPageSkeleton,
});
