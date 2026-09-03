import { createFileRoute } from "@tanstack/react-router";
import MockBundleDetailPage from "@/pages/courses/MockBundleDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/bundles/$slug")({
  component: () => <MockBundleDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
