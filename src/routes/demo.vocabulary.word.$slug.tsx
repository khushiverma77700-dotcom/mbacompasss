import { createFileRoute } from "@tanstack/react-router";
import StudentVocabularyWord from "@/pages/student/vocabulary/StudentVocabularyWord";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/vocabulary/word/$slug")({
  component: () => <StudentVocabularyWord />,
  pendingComponent: StudentContentSkeleton,
});
