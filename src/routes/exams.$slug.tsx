import { createFileRoute } from "@tanstack/react-router";
import { ExamSlugRedirect } from "@/components/app-shell/RouteRedirects";

export const Route = createFileRoute("/exams/$slug")({
  component: () => <ExamSlugRedirect />,
});
