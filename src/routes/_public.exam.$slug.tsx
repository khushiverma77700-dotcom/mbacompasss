import { createFileRoute } from "@tanstack/react-router";
import ExamDetailPage from "@/pages/ExamDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/exam/$slug")({
  component: () => <ExamDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
