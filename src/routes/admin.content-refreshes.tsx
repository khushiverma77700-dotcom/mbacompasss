import { createFileRoute } from "@tanstack/react-router";
import AdminContentRefreshes from "@/pages/admin/AdminContentRefreshes";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/content-refreshes")({
  component: () => <AdminContentRefreshes />,
  pendingComponent: PublicPageSkeleton,
});
