import { createFileRoute } from "@tanstack/react-router";
import AdminSourceDomains from "@/pages/admin/AdminSourceDomains";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/source-domains")({
  component: () => <AdminSourceDomains />,
  pendingComponent: PublicPageSkeleton,
});
