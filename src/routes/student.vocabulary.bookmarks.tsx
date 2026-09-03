import { createFileRoute } from "@tanstack/react-router";
import StudentVocabularyBookmarks from "@/pages/student/vocabulary/StudentVocabularyBookmarks";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/vocabulary/bookmarks")({
  component: () => <StudentVocabularyBookmarks />,
  pendingComponent: StudentContentSkeleton,
});
