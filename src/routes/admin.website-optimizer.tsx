import { createFileRoute } from "@tanstack/react-router";
import AdminWebsiteOptimizer from "@/pages/admin/AdminWebsiteOptimizer";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/website-optimizer")({
  component: () => <AdminWebsiteOptimizer />,
  pendingComponent: PublicPageSkeleton,
});
