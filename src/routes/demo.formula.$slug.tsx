import { createFileRoute } from "@tanstack/react-router";
import FormulaDetailPage from "@/pages/formulas/FormulaDetailPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/formula/$slug")({
  component: () => <FormulaDetailPage />,
  pendingComponent: StudentContentSkeleton,
});
