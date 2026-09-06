import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/mba-compass")({
  component: () => <Outlet />,
});
