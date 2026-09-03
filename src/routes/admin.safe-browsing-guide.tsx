import { createFileRoute } from "@tanstack/react-router";
import AdminSafeBrowsingGuide from "@/pages/admin/AdminSafeBrowsingGuide";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/safe-browsing-guide")({
  component: () => <AdminSafeBrowsingGuide />,
  pendingComponent: PublicPageSkeleton,
});
