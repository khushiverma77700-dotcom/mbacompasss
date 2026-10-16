import { createFileRoute, redirect } from "@tanstack/react-router";

// Retain the existing institute URL as the only indexable coaching detail URL.
export const Route = createFileRoute("/_public/coaching/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/institute/$slug", params: { slug: params.slug }, statusCode: 301 });
  },
});