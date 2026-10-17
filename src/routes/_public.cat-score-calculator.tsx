import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_public/cat-score-calculator")({
  beforeLoad: ({ location }) => { throw redirect({ href: `/tools/cat-score-calculator${location.searchStr}`, statusCode: 301 }); },
});
