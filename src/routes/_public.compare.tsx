import { createFileRoute } from "@tanstack/react-router";
import ComparePage from "@/pages/ComparePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/compare")({
  component: () => <ComparePage />,
  pendingComponent: PublicPageSkeleton,
});
