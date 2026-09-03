import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mba-roi-calculator")({
  beforeLoad: () => {
    throw redirect({ to: "/roi-calculator", replace: true });
  },
});
