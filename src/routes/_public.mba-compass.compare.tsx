import { createFileRoute } from "@tanstack/react-router";
import MBACompassComparePage from "@/pages/MBACompassComparePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mba-compass/compare")({
  component: () => <MBACompassComparePage />,
  pendingComponent: PublicPageSkeleton,
});
