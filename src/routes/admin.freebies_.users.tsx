import { createFileRoute } from "@tanstack/react-router";
import AdminFreebieUsers from "@/pages/admin/AdminFreebieUsers";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/freebies_/users")({
  component: () => <AdminFreebieUsers />,
  pendingComponent: PublicPageSkeleton,
});
