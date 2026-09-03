import { createFileRoute } from "@tanstack/react-router";
import AdminCoupons from "@/pages/admin/AdminCoupons";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/coupons")({
  component: () => <AdminCoupons />,
  pendingComponent: PublicPageSkeleton,
});
