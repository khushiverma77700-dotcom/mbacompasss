import { createFileRoute } from "@tanstack/react-router";
import StudentFormulaBook from "@/pages/student/formulas/StudentFormulaBook";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/formulas/")({
  component: () => <StudentFormulaBook />,
  pendingComponent: StudentContentSkeleton,
});
