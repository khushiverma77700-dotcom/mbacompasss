import { createFileRoute } from "@tanstack/react-router";
import StudentVocabularyHub from "@/pages/student/vocabulary/StudentVocabularyHub";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/vocabulary")({
  component: () => <StudentVocabularyHub />,
  pendingComponent: StudentContentSkeleton,
});
