import { createFileRoute } from "@tanstack/react-router";
import AdminSEOIntelligence from "@/pages/admin/AdminSEOIntelligence";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/seo-intelligence")({
  component: () => <AdminSEOIntelligence />,
  pendingComponent: PublicPageSkeleton,
});
