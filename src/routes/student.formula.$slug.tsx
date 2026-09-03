import { createFileRoute } from "@tanstack/react-router";
import FormulaDetailPage from "@/pages/formulas/FormulaDetailPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/formula/$slug")({
  component: () => <FormulaDetailPage />,
  pendingComponent: StudentContentSkeleton,
});
