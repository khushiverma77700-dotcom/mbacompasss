import { createFileRoute } from "@tanstack/react-router";
import AdminInstituteResults from "@/pages/admin/AdminInstituteResults";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/institute-results")({
  component: () => <AdminInstituteResults />,
  pendingComponent: PublicPageSkeleton,
});
