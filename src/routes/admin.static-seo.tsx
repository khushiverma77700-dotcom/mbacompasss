import { createFileRoute } from "@tanstack/react-router";
import AdminStaticPageSEO from "@/pages/admin/AdminStaticPageSEO";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/static-seo")({
  component: () => <AdminStaticPageSEO />,
  pendingComponent: PublicPageSkeleton,
});
