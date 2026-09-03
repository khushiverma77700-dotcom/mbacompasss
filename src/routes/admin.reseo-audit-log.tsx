import { createFileRoute } from "@tanstack/react-router";
import AdminReseoAuditLog from "@/pages/admin/AdminReseoAuditLog";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/reseo-audit-log")({
  component: () => <AdminReseoAuditLog />,
  pendingComponent: PublicPageSkeleton,
});
