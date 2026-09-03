import { createFileRoute } from "@tanstack/react-router";
import MockLeaderboardPage from "@/pages/mocks/MockLeaderboardPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/leaderboard/$slug")({
  component: () => <MockLeaderboardPage />,
  pendingComponent: PublicPageSkeleton,
});
