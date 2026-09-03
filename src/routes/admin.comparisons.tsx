import { createFileRoute } from "@tanstack/react-router";
import AdminComparisons from "@/pages/admin/AdminComparisons";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/comparisons")({
  component: () => <AdminComparisons />,
  pendingComponent: PublicPageSkeleton,
});
