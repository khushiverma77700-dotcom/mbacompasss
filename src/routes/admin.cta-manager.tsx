import { createFileRoute } from "@tanstack/react-router";
import AdminCTAManager from "@/pages/admin/AdminCTAManager";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/cta-manager")({
  component: () => <AdminCTAManager />,
  pendingComponent: PublicPageSkeleton,
});
