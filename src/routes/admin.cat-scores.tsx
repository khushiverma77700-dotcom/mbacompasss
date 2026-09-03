import { createFileRoute } from "@tanstack/react-router";
import AdminCATScores from "@/pages/admin/AdminCATScores";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/cat-scores")({
  component: () => <AdminCATScores />,
  pendingComponent: PublicPageSkeleton,
});
