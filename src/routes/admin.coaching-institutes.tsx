import { createFileRoute } from "@tanstack/react-router";
import AdminCoachingInstitutes from "@/pages/admin/AdminCoachingInstitutes";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/coaching-institutes")({
  component: () => <AdminCoachingInstitutes />,
  pendingComponent: PublicPageSkeleton,
});
