import { createFileRoute } from "@tanstack/react-router";
import AuthorsPage from "@/pages/AuthorsPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/authors")({
  component: () => <AuthorsPage />,
  pendingComponent: PublicPageSkeleton,
});
