import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/")({
  component: () => <AdminDashboard />,
  pendingComponent: PublicPageSkeleton,
});
