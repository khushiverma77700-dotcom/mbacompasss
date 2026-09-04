import { createFileRoute } from "@tanstack/react-router";
import AdminCollegeApplications from "@/pages/admin/AdminCollegeApplications";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/college-applications")({
  component: () => <AdminCollegeApplications />,
  pendingComponent: PublicPageSkeleton,
});
