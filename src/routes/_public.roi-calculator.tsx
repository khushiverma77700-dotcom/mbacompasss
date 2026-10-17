import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_public/roi-calculator")({
  beforeLoad: ({ location }) => { throw redirect({ href: `/tools/roi-calculator${location.searchStr}`, statusCode: 301 }); },
});
