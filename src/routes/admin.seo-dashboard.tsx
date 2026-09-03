import { createFileRoute } from "@tanstack/react-router";
import AdminSEODashboard from "@/pages/admin/AdminSEODashboard";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/seo-dashboard")({
  component: () => <AdminSEODashboard />,
  pendingComponent: PublicPageSkeleton,
});
