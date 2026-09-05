import { createFileRoute } from "@tanstack/react-router";
import AdminWriteCourses from "@/pages/admin/AdminWriteCourses";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/courses_/generate-ai")({
  component: () => <AdminWriteCourses />,
  pendingComponent: PublicPageSkeleton,
});
