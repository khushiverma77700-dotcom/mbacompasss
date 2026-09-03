import { createFileRoute } from "@tanstack/react-router";
import StudentLogin from "@/pages/student/StudentLogin";

export const Route = createFileRoute("/student/login")({
  component: () => <StudentLogin />,
});
