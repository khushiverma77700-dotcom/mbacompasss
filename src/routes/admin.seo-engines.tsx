import { createFileRoute } from "@tanstack/react-router";
import AdminSEOEngines from "@/pages/admin/AdminSEOEngines";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/seo-engines")({
  component: () => <AdminSEOEngines />,
  pendingComponent: PublicPageSkeleton,
});
