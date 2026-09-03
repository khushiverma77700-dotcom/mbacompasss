import { createFileRoute } from "@tanstack/react-router";
import MockBundlesListPage from "@/pages/courses/MockBundlesListPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/bundles")({
  component: () => <MockBundlesListPage />,
  pendingComponent: PublicPageSkeleton,
});
