import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/day-planner")({
  component: () => <Outlet />,
});
