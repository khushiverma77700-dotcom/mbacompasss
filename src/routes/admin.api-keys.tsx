import { createFileRoute } from "@tanstack/react-router";
import AdminApiKeys from "@/pages/admin/AdminApiKeys";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/api-keys")({
  component: () => <AdminApiKeys />,
  pendingComponent: PublicPageSkeleton,
});
