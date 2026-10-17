import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MBACompassComparePage from "@/pages/MBACompassComparePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mba-compass/compare")({
  head: () => publicPageHead("/mba-compass/compare", "Compare | MBA Compass", "Explore compare information, guides and resources on MBA Compass."),
  component: () => <MBACompassComparePage />,
  pendingComponent: PublicPageSkeleton,
});
