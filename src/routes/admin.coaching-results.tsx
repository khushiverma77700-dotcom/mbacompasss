import { createFileRoute } from "@tanstack/react-router";
import AdminCoachingResults from "@/pages/admin/AdminCoachingResults";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/coaching-results")({
  component: () => <AdminCoachingResults />,
  pendingComponent: PublicPageSkeleton,
});
