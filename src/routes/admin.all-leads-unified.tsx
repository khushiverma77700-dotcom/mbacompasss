import { createFileRoute } from "@tanstack/react-router";
import AdminAllLeads from "@/pages/admin/AdminAllLeads";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/all-leads-unified")({
  component: () => <AdminAllLeads />,
  pendingComponent: PublicPageSkeleton,
});
