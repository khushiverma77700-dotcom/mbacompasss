import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/daily-test")({
  component: () => <Outlet />,
});
