import { createFileRoute } from "@tanstack/react-router";
import StudentLeaderboard from "@/pages/student/StudentLeaderboard";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/leaderboard")({
  component: () => <StudentLeaderboard />,
  pendingComponent: StudentContentSkeleton,
});
