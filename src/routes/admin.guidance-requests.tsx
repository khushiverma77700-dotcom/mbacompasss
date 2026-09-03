import { createFileRoute } from "@tanstack/react-router";
import AdminGuidanceRequests from "@/pages/admin/AdminGuidanceRequests";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/guidance-requests")({
  component: () => <AdminGuidanceRequests />,
  pendingComponent: PublicPageSkeleton,
});
