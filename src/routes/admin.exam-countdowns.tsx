import { createFileRoute } from "@tanstack/react-router";
import AdminExamCountdowns from "@/pages/admin/AdminExamCountdowns";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/exam-countdowns")({
  component: () => <AdminExamCountdowns />,
  pendingComponent: PublicPageSkeleton,
});
