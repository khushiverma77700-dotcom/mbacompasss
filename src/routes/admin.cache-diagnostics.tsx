import { createFileRoute } from "@tanstack/react-router";
import AdminCacheDiagnostics from "@/pages/admin/AdminCacheDiagnostics";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/cache-diagnostics")({
  component: () => <AdminCacheDiagnostics />,
  pendingComponent: PublicPageSkeleton,
});
