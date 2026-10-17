import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/type/$typeSlug")({
  head: ({ params }) => publicPageHead(`/colleges/type/${params.typeSlug}`, `${params.typeSlug} | MBA Compass`, "Explore typeslug information, guides and resources on MBA Compass."),
  component: () => <CollegeHubPage kind="type" />,
  pendingComponent: PublicPageSkeleton,
});
