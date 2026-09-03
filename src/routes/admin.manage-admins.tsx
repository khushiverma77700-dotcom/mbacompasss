import { createFileRoute } from "@tanstack/react-router";
import AdminManageAdmins from "@/pages/admin/AdminManageAdmins";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/manage-admins")({
  component: () => <AdminManageAdmins />,
  pendingComponent: PublicPageSkeleton,
});
