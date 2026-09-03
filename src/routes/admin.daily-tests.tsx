import { createFileRoute } from "@tanstack/react-router";
import AdminDailyTests from "@/pages/admin/AdminDailyTests";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/daily-tests")({
  component: () => <AdminDailyTests />,
  pendingComponent: PublicPageSkeleton,
});
