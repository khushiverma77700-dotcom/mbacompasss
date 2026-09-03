import { createFileRoute } from "@tanstack/react-router";
import AdminMockOrders from "@/pages/admin/AdminMockOrders";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/mock-orders")({
  component: () => <AdminMockOrders />,
  pendingComponent: PublicPageSkeleton,
});
