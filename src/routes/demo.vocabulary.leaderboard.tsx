import { createFileRoute } from "@tanstack/react-router";
import StudentVocabularyLeaderboard from "@/pages/student/vocabulary/StudentVocabularyLeaderboard";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/vocabulary/leaderboard")({
  component: () => <StudentVocabularyLeaderboard />,
  pendingComponent: StudentContentSkeleton,
});
