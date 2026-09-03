import { createFileRoute } from "@tanstack/react-router";
import { CourseSlugRedirect } from "@/components/app-shell/RouteRedirects";

export const Route = createFileRoute("/course/$slug")({
  component: () => <CourseSlugRedirect />,
});
