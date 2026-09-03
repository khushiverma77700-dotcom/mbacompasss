import { createFileRoute } from "@tanstack/react-router";
import BlogPage from "@/pages/BlogPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/blog")({
  component: () => <BlogPage />,
  pendingComponent: PublicPageSkeleton,
});
