import { createFileRoute } from "@tanstack/react-router";
import AdminCTROptimizer from "@/pages/admin/AdminCTROptimizer";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/ctr-optimizer")({
  component: () => <AdminCTROptimizer />,
  pendingComponent: PublicPageSkeleton,
});
