import { createFileRoute } from "@tanstack/react-router";
import AdminBusinessInquiries from "@/pages/admin/AdminBusinessInquiries";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/business-inquiries")({
  component: () => <AdminBusinessInquiries />,
  pendingComponent: PublicPageSkeleton,
});
