import { createFileRoute } from "@tanstack/react-router";
import AdminMocksLanding from "@/pages/admin/AdminMocksLanding";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/mocks-landing")({
  component: () => <AdminMocksLanding />,
  pendingComponent: PublicPageSkeleton,
});
