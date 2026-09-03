import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/business-inquiry")({
  beforeLoad: () => {
    throw redirect({ to: "/business-inquiries", replace: true });
  },
});
