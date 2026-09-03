import { createFileRoute } from "@tanstack/react-router";
import AdminListingChangeRequests from "@/pages/admin/AdminListingChangeRequests";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/listing-change-requests")({
  component: () => <AdminListingChangeRequests />,
  pendingComponent: PublicPageSkeleton,
});
