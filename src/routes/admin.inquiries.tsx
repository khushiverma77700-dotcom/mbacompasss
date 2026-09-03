import { createFileRoute } from "@tanstack/react-router";
import AdminInquiries from "@/pages/admin/AdminInquiries";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/inquiries")({
  component: () => <AdminInquiries />,
  pendingComponent: PublicPageSkeleton,
});
