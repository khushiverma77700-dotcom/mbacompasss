import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mba-programme-compare")({
  beforeLoad: () => {
    throw redirect({ to: "/compare", replace: true });
  },
});
