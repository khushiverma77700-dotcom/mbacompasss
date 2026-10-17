import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { collegesListingQuery } from "@/lib/queries/listingQueries";
import { locationColleges } from "@/lib/collegeHub";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/by-city/$citySlug")({
  loader: async ({ context, params }) => {
    const colleges = await context.queryClient.ensureQueryData(collegesListingQuery);
    if (!locationColleges(colleges, "city", params.citySlug).length) throw notFound();
  },
  head: ({ params }) => publicPageHead(`/colleges/by-city/${params.citySlug}`, `${params.citySlug} | MBA Compass`, "Explore MBA colleges, entrance exams and preparation resources on MBA Compass."),
  component: () => <CollegeHubPage kind="city" />,
  pendingComponent: PublicPageSkeleton,
});
