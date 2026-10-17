import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_public/college-finder")({
  beforeLoad: ({ location }) => { throw redirect({ href: `/tools/college-finder${location.searchStr}`, statusCode: 301 }); },
});
