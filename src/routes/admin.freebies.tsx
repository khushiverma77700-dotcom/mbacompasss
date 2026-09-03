import { createFileRoute } from "@tanstack/react-router";
import AdminFreebies from "@/pages/admin/AdminFreebies";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/freebies")({
  component: () => <AdminFreebies />,
  pendingComponent: PublicPageSkeleton,
});
