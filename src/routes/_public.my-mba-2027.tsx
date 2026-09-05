import { createFileRoute, redirect } from "@tanstack/react-router";

// The applications hub now lives at /mba-application. The old address keeps
// working and sends visitors (and crawlers) to the canonical page.
export const Route = createFileRoute("/_public/my-mba-2027")({
  beforeLoad: () => {
    throw redirect({ to: "/mba-application", statusCode: 301 });
  },
});
