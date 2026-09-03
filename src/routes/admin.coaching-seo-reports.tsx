import { createFileRoute } from "@tanstack/react-router";
import AdminCoachingSEOReports from "@/pages/admin/AdminCoachingSEOReports";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/coaching-seo-reports")({
  component: () => <AdminCoachingSEOReports />,
  pendingComponent: PublicPageSkeleton,
});
