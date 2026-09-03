import { createFileRoute } from "@tanstack/react-router";
import MockResultPage from "@/pages/mocks/MockResultPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/result/$attemptId")({
  component: () => <MockResultPage />,
  pendingComponent: PublicPageSkeleton,
});
