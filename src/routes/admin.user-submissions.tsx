import { createFileRoute } from "@tanstack/react-router";
import AdminUserSubmissions from "@/pages/admin/AdminUserSubmissions";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/user-submissions")({
  component: () => <AdminUserSubmissions />,
  pendingComponent: PublicPageSkeleton,
});
