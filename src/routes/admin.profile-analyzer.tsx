import { createFileRoute } from "@tanstack/react-router";
import AdminProfileAnalyzer from "@/pages/admin/AdminProfileAnalyzer";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/profile-analyzer")({
  component: () => <AdminProfileAnalyzer />,
  pendingComponent: PublicPageSkeleton,
});
