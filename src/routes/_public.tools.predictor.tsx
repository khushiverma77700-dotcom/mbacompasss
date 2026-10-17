import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_public/tools/predictor")({ beforeLoad: () => { throw redirect({ to: "/tools/college-shortlister", statusCode: 301 }); } });
