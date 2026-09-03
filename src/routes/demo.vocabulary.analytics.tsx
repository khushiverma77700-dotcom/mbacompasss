import { createFileRoute } from "@tanstack/react-router";
import StudentVocabularyAnalytics from "@/pages/student/vocabulary/StudentVocabularyAnalytics";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/vocabulary/analytics")({
  component: () => <StudentVocabularyAnalytics />,
  pendingComponent: StudentContentSkeleton,
});
