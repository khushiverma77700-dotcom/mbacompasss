import { createFileRoute } from "@tanstack/react-router";
import AdminMBACompassCourses from "@/pages/admin/AdminMBACompassCourses";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/mba-compass-courses")({
  component: () => <AdminMBACompassCourses />,
  pendingComponent: PublicPageSkeleton,
});
