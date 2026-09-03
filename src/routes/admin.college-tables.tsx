import { createFileRoute } from "@tanstack/react-router";
import AdminCollegeTables from "@/pages/admin/AdminCollegeTables";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/college-tables")({
  component: () => <AdminCollegeTables />,
  pendingComponent: PublicPageSkeleton,
});
