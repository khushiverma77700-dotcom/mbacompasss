import { createFileRoute } from "@tanstack/react-router";
import AdminCoachingOfWeek from "@/pages/admin/AdminCoachingOfWeek";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/coaching-of-week")({
  component: () => <AdminCoachingOfWeek />,
  pendingComponent: PublicPageSkeleton,
});
