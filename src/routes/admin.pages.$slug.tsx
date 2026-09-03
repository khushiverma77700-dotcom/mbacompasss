import { createFileRoute } from "@tanstack/react-router";
import AdminPageSEOReview from "@/pages/admin/AdminPageSEOReview";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/pages/$slug")({
  component: () => <AdminPageSEOReview />,
  pendingComponent: PublicPageSkeleton,
});
