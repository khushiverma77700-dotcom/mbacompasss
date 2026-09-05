import { createFileRoute } from "@tanstack/react-router";
import AdminCoachingInstituteDetail from "@/pages/admin/AdminCoachingInstituteDetail";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/coaching-institutes_/$id")({
  component: () => <AdminCoachingInstituteDetail />,
  pendingComponent: PublicPageSkeleton,
});
