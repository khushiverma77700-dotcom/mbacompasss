import { createFileRoute } from "@tanstack/react-router";
import AdminShortlisterColleges from "@/pages/admin/AdminShortlisterColleges";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/shortlister-colleges")({
  component: () => <AdminShortlisterColleges />,
  pendingComponent: PublicPageSkeleton,
});
