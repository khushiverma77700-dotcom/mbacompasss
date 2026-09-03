import { createFileRoute } from "@tanstack/react-router";
import AdminReverseSiloing from "@/pages/admin/AdminReverseSiloing";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/reverse-siloing")({
  component: () => <AdminReverseSiloing />,
  pendingComponent: PublicPageSkeleton,
});
