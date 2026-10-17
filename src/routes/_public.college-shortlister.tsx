import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_public/college-shortlister")({
  beforeLoad: ({ location }) => { throw redirect({ href: `/tools/college-shortlister${location.searchStr}`, statusCode: 301 }); },
});
