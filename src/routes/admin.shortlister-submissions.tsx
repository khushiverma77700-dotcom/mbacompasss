import { createFileRoute } from "@tanstack/react-router";
import AdminShortlisterSubmissions from "@/pages/admin/AdminShortlisterSubmissions";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/shortlister-submissions")({
  component: () => <AdminShortlisterSubmissions />,
  pendingComponent: PublicPageSkeleton,
});
