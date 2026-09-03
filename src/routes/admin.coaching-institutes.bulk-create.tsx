import { createFileRoute } from "@tanstack/react-router";
import AdminBulkCreateCoachingInstitutes from "@/pages/admin/AdminBulkCreateCoachingInstitutes";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/coaching-institutes/bulk-create")({
  component: () => <AdminBulkCreateCoachingInstitutes />,
  pendingComponent: PublicPageSkeleton,
});
