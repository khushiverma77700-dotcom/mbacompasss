import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/exams")({
  beforeLoad: () => {
    throw redirect({ to: "/exam", replace: true });
  },
});
