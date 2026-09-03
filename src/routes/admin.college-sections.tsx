import { createFileRoute } from "@tanstack/react-router";
import AdminCollegeSections from "@/pages/admin/AdminCollegeSections";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/college-sections")({
  component: () => <AdminCollegeSections />,
  pendingComponent: PublicPageSkeleton,
});
