import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/personalized-hub")({
  component: () => <Outlet />,
});
