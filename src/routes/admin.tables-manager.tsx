import { createFileRoute } from "@tanstack/react-router";
import AdminTablesManager from "@/pages/admin/AdminTablesManager";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/tables-manager")({
  component: () => <AdminTablesManager />,
  pendingComponent: PublicPageSkeleton,
});
