import { createFileRoute } from "@tanstack/react-router";
import AdminClearCache from "@/pages/admin/AdminClearCache";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/clear-cache")({
  component: () => <AdminClearCache />,
  pendingComponent: PublicPageSkeleton,
});
