import { createFileRoute } from "@tanstack/react-router";
import StudentVocabularySearch from "@/pages/student/vocabulary/StudentVocabularySearch";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/vocabulary/search")({
  component: () => <StudentVocabularySearch />,
  pendingComponent: StudentContentSkeleton,
});
