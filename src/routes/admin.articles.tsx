import { createFileRoute } from "@tanstack/react-router";
import AdminArticles from "@/pages/admin/AdminArticles";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/articles")({
  component: () => <AdminArticles />,
  pendingComponent: PublicPageSkeleton,
});
