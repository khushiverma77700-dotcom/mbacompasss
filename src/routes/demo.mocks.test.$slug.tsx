import { createFileRoute } from "@tanstack/react-router";
import MockTestIntroPage from "@/pages/mocks/MockTestIntroPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/mocks/test/$slug")({
  component: () => <MockTestIntroPage />,
  pendingComponent: StudentContentSkeleton,
});
