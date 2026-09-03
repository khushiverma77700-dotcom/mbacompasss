import { createFileRoute } from "@tanstack/react-router";
import AdminCTAAnalytics from "@/pages/admin/AdminCTAAnalytics";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/cta-analytics")({
  component: () => <AdminCTAAnalytics />,
  pendingComponent: PublicPageSkeleton,
});
