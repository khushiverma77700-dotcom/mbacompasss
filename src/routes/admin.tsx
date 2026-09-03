import { createFileRoute, Outlet } from "@tanstack/react-router";
import AdminLayout from "@/pages/admin/AdminLayout";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  pendingComponent: PublicPageSkeleton,
});
