import { createFileRoute } from "@tanstack/react-router";
import MockLeaderboardPage from "@/pages/mocks/MockLeaderboardPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/mocks/leaderboard/$slug")({
  component: () => <MockLeaderboardPage />,
  pendingComponent: StudentContentSkeleton,
});
