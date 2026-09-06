import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/student/day-planner")({
  component: () => <Outlet />,
});
