import { createFileRoute } from "@tanstack/react-router";
import AdminSiteSettings from "@/pages/admin/AdminSiteSettings";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/site-settings")({
  component: () => <AdminSiteSettings />,
  pendingComponent: PublicPageSkeleton,
});
