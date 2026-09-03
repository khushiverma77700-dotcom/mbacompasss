import { createFileRoute } from "@tanstack/react-router";
import AdminCourses from "@/pages/admin/AdminCourses";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/courses")({
  component: () => <AdminCourses />,
  pendingComponent: PublicPageSkeleton,
});
