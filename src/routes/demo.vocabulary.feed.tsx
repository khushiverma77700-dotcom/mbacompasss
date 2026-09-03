import { createFileRoute } from "@tanstack/react-router";
import StudentVocabularyFeed from "@/pages/student/vocabulary/StudentVocabularyFeed";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/vocabulary/feed")({
  component: () => <StudentVocabularyFeed />,
  pendingComponent: StudentContentSkeleton,
});
