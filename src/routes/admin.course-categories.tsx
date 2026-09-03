import { createFileRoute } from "@tanstack/react-router";
import AdminCourseCategories from "@/pages/admin/AdminCourseCategories";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/course-categories")({
  component: () => <AdminCourseCategories />,
  pendingComponent: PublicPageSkeleton,
});
