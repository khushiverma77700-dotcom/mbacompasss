import { createFileRoute } from "@tanstack/react-router";
import StudentLeaderboard from "@/pages/student/StudentLeaderboard";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/leaderboard")({
  component: () => <StudentLeaderboard />,
  pendingComponent: StudentContentSkeleton,
});
