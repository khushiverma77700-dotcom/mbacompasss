import { createFileRoute } from "@tanstack/react-router";
import AdminSitemap from "@/pages/admin/AdminSitemap";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/sitemap")({
  component: () => <AdminSitemap />,
  pendingComponent: PublicPageSkeleton,
});
