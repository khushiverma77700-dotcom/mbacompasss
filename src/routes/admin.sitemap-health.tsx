import { createFileRoute } from "@tanstack/react-router";
import AdminSitemapHealth from "@/pages/admin/AdminSitemapHealth";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/sitemap-health")({
  component: () => <AdminSitemapHealth />,
  pendingComponent: PublicPageSkeleton,
});
