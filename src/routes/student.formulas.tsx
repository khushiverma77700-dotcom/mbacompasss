import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/student/formulas")({
  component: () => <Outlet />,
});
