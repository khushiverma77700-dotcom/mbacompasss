import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/by-city/$citySlug")({
  head: ({ params }) => publicPageHead(`/colleges/by-city/${params.citySlug}`, `${params.citySlug} | MBA Compass`, "Explore cityslug information, guides and resources on MBA Compass."),
  component: () => <CollegeHubPage kind="city" />,
  pendingComponent: PublicPageSkeleton,
});
