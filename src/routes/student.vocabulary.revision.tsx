import { createFileRoute } from "@tanstack/react-router";
import StudentVocabularyRevision from "@/pages/student/vocabulary/StudentVocabularyRevision";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/vocabulary/revision")({
  component: () => <StudentVocabularyRevision />,
  pendingComponent: StudentContentSkeleton,
});
