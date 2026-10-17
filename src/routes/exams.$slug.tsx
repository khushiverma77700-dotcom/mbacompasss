import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/exams/$slug")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/exam/$slug", params, statusCode: 301 }); },
});
