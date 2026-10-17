import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MockBundlesListPage from "@/pages/courses/MockBundlesListPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/bundles")({
  head: () => publicPageHead("/bundles", "Bundles | MBA Compass", "Explore bundles information, guides and resources on MBA Compass."),
  component: () => <MockBundlesListPage />,
  pendingComponent: PublicPageSkeleton,
});
