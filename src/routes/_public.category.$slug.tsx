import { createFileRoute } from "@tanstack/react-router";
import CategoryPage from "@/pages/CategoryPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/category/$slug")({
  component: () => <CategoryPage />,
  pendingComponent: PublicPageSkeleton,
});
