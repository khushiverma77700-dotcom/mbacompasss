import { createFileRoute } from "@tanstack/react-router";
import AdminLeads from "@/pages/admin/AdminLeads";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/leads")({
  component: () => <AdminLeads />,
  pendingComponent: PublicPageSkeleton,
});
