import { createFileRoute } from "@tanstack/react-router";
import AdminInstitutes from "@/pages/admin/AdminInstitutes";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/institutes")({
  component: () => <AdminInstitutes />,
  pendingComponent: PublicPageSkeleton,
});
