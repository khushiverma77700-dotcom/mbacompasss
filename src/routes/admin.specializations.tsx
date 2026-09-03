import { createFileRoute } from "@tanstack/react-router";
import AdminSpecializations from "@/pages/admin/AdminSpecializations";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/specializations")({
  component: () => <AdminSpecializations />,
  pendingComponent: PublicPageSkeleton,
});
