import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import { collegesListingQuery } from "@/lib/queries/listingQueries";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/by-exam/$examSlug")({
  loader: ({ context }) => context.queryClient.ensureQueryData(collegesListingQuery),
  head: ({ params }) => publicPageHead(`/colleges/by-exam/${params.examSlug}`, `${params.examSlug} | MBA Compass`, "Explore MBA colleges, entrance exams and preparation resources on MBA Compass."),
  component: () => <CollegeHubPage kind="exam" />,
  pendingComponent: PublicPageSkeleton,
});
