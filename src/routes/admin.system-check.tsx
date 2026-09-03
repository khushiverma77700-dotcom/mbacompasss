import { createFileRoute } from "@tanstack/react-router";
import AdminSystemCheck from "@/pages/admin/AdminSystemCheck";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/system-check")({
  component: () => <AdminSystemCheck />,
  pendingComponent: PublicPageSkeleton,
});
