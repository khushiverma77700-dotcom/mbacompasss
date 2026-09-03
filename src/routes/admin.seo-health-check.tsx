import { createFileRoute } from "@tanstack/react-router";
import AdminSEOHealthCheck from "@/pages/admin/AdminSEOHealthCheck";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/seo-health-check")({
  component: () => <AdminSEOHealthCheck />,
  pendingComponent: PublicPageSkeleton,
});
