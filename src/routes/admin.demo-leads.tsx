import { createFileRoute } from "@tanstack/react-router";
import AdminDemoLeads from "@/pages/admin/AdminDemoLeads";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/demo-leads")({
  component: () => <AdminDemoLeads />,
  pendingComponent: PublicPageSkeleton,
});
