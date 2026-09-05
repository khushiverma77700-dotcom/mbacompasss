import { createFileRoute } from "@tanstack/react-router";
import AdminExamCompleteness from "@/pages/admin/AdminExamCompleteness";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/exams_/completeness")({
  component: () => <AdminExamCompleteness />,
  pendingComponent: PublicPageSkeleton,
});
