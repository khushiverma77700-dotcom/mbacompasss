import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import { collegesListingQuery } from "@/lib/queries/listingQueries";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/type/$typeSlug")({
  loader: ({ context }) => context.queryClient.ensureQueryData(collegesListingQuery),
  head: ({ params }) => publicPageHead(`/colleges/type/${params.typeSlug}`, `${params.typeSlug} | MBA Compass`, "Explore MBA colleges, entrance exams and preparation resources on MBA Compass."),
  component: () => <CollegeHubPage kind="type" />,
  pendingComponent: PublicPageSkeleton,
});
