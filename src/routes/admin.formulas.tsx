import { createFileRoute } from "@tanstack/react-router";
import AdminFormulas from "@/pages/admin/AdminFormulas";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/formulas")({
  component: () => <AdminFormulas />,
  pendingComponent: PublicPageSkeleton,
});
