import { createFileRoute } from "@tanstack/react-router";
import AdminUsers from "@/pages/admin/AdminUsers";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/users")({
  component: () => <AdminUsers />,
  pendingComponent: PublicPageSkeleton,
});
