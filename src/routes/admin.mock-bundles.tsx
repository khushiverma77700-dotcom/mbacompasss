import { createFileRoute } from "@tanstack/react-router";
import AdminMockBundles from "@/pages/admin/AdminMockBundles";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/mock-bundles")({
  component: () => <AdminMockBundles />,
  pendingComponent: PublicPageSkeleton,
});
