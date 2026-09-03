import { createFileRoute } from "@tanstack/react-router";
import FormulasListPage from "@/pages/formulas/FormulasListPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/formulas/list")({
  component: () => <FormulasListPage />,
  pendingComponent: StudentContentSkeleton,
});
