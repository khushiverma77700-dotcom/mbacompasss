import { createFileRoute } from "@tanstack/react-router";
import AdminPersonalizedHub from "@/pages/admin/AdminPersonalizedHub";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/personalized-hub")({
  component: () => <AdminPersonalizedHub />,
  pendingComponent: PublicPageSkeleton,
});
