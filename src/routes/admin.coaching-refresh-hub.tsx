import { createFileRoute } from "@tanstack/react-router";
import AdminCoachingRefreshHub from "@/pages/admin/AdminCoachingRefreshHub";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/coaching-refresh-hub")({
  component: () => <AdminCoachingRefreshHub />,
  pendingComponent: PublicPageSkeleton,
});
