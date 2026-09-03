import { createFileRoute } from "@tanstack/react-router";
import AdminSupportTickets from "@/pages/admin/AdminSupportTickets";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/support-tickets")({
  component: () => <AdminSupportTickets />,
  pendingComponent: PublicPageSkeleton,
});
