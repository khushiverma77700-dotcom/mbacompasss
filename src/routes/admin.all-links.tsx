import { createFileRoute } from "@tanstack/react-router";
import AdminAllLinks from "@/pages/admin/AdminAllLinks";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/all-links")({
  component: () => <AdminAllLinks />,
  pendingComponent: PublicPageSkeleton,
});
