import { createFileRoute } from "@tanstack/react-router";
import AdminContentPruning from "@/pages/admin/AdminContentPruning";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/content-pruning")({
  component: () => <AdminContentPruning />,
  pendingComponent: PublicPageSkeleton,
});
