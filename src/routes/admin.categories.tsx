import { createFileRoute } from "@tanstack/react-router";
import AdminCategories from "@/pages/admin/AdminCategories";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/categories")({
  component: () => <AdminCategories />,
  pendingComponent: PublicPageSkeleton,
});
