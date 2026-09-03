import { createFileRoute } from "@tanstack/react-router";
import AdminMasterRefresh from "@/pages/admin/AdminMasterRefresh";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/master-refresh")({
  component: () => <AdminMasterRefresh />,
  pendingComponent: PublicPageSkeleton,
});
