import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_public/profile-analyzer")({
  beforeLoad: ({ location }) => { throw redirect({ href: `/tools/profile-analyzer${location.searchStr}`, statusCode: 301 }); },
});
