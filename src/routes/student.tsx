import { createFileRoute, Outlet } from "@tanstack/react-router";
import StudentLayout from "@/pages/student/StudentLayout";
import StudentShellFallback from "@/components/student/StudentShellFallback";

export const Route = createFileRoute("/student")({
  component: StudentLayout,
  pendingComponent: StudentShellFallback,
});
