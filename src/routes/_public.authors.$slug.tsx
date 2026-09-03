import { createFileRoute } from "@tanstack/react-router";
import AuthorDetailPage from "@/pages/AuthorDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/authors/$slug")({
  component: () => <AuthorDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
