import { createFileRoute, notFound } from "@tanstack/react-router";
import { publicPageHead } from "@/lib/publicPageHead";
import { collegesListingQuery } from "@/lib/queries/listingQueries";
import { locationColleges } from "@/lib/collegeHub";
import CollegeHubPage from "@/pages/CollegeHubPage";

export const Route = createFileRoute("/_public/colleges/by-state/$stateSlug")({
  loader: async ({ context, params }) => {
    const colleges = await context.queryClient.ensureQueryData(collegesListingQuery);
    const matches = locationColleges(colleges, "state", params.stateSlug);
    if (!matches.length) throw notFound();
    return { name: matches[0]?.state || params.stateSlug };
  },
  head: ({ params, loaderData }) => publicPageHead(`/colleges/by-state/${params.stateSlug}`, `MBA Colleges in ${loaderData?.name || params.stateSlug} | MBA Compass`, `Compare MBA colleges in ${loaderData?.name || params.stateSlug}, including recorded fees, placements and accepted entrance exams.`),
  component: () => <CollegeHubPage kind="state" />,
});