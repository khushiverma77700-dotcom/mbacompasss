import { createFileRoute } from "@tanstack/react-router";
import AdminExams from "@/pages/admin/AdminExams";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/exams")({
  component: () => <AdminExams />,
  pendingComponent: PublicPageSkeleton,
});
