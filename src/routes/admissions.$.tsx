import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admissions/$")({
  beforeLoad: () => {
    throw redirect({ to: "/colleges", search: { page: 1 }, replace: true });
  },
});
