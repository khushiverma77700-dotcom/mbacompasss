import { createFileRoute } from "@tanstack/react-router";
import StudentApplications from "@/pages/student/StudentApplications";
import StudentShellFallback from "@/components/student/StudentShellFallback";

export const Route = createFileRoute("/student/applications")({
  component: () => <StudentApplications />,
  pendingComponent: StudentShellFallback,
});
