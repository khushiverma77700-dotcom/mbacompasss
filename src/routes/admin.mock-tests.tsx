import { createFileRoute } from "@tanstack/react-router";
import AdminMockTests from "@/pages/admin/AdminMockTests";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/mock-tests")({
  component: () => <AdminMockTests />,
  pendingComponent: PublicPageSkeleton,
});
