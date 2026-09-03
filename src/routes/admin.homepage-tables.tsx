import { createFileRoute } from "@tanstack/react-router";
import AdminTablesManager from "@/pages/admin/AdminTablesManager";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/homepage-tables")({
  component: () => <AdminTablesManager />,
  pendingComponent: PublicPageSkeleton,
});
