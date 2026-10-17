import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_public/iim-waitlist-movement")({
  beforeLoad: ({ location }) => { throw redirect({ href: `/tools/iim-waitlist-movement${location.searchStr}`, statusCode: 301 }); },
});
