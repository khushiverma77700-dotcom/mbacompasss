import { createFileRoute } from "@tanstack/react-router";
import AdminColleges from "@/pages/admin/AdminColleges";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/colleges")({
  component: () => <AdminColleges />,
  pendingComponent: PublicPageSkeleton,
});
