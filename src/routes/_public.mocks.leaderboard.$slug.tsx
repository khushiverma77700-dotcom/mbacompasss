import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MockLeaderboardPage from "@/pages/mocks/MockLeaderboardPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/leaderboard/$slug")({
  head: ({ params }) => publicPageHead(`/mocks/leaderboard/${params.slug}`, `${params.slug} | MBA Compass`, "Explore slug information, guides and resources on MBA Compass."),
  component: () => <MockLeaderboardPage />,
  pendingComponent: PublicPageSkeleton,
});
