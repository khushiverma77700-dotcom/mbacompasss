import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CollegesPage from "@/pages/CollegesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { collegesListingPreviewQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/colleges/")({
  head: () => publicPageHead('/colleges', 'MBA Colleges in India: Fees & Placements | MBA Compass', 'Explore MBA colleges by location, exams, fees and placements. Compare admissions and shortlist business schools on MBA Compass.'),
  // Prefetch only the FIRST screen server-side so the SSR HTML has real college
  // names/H1 without shipping the whole 5k-row catalogue as dehydrated JSON
  // (that made this page a ~5.8 MB download). The full list loads client-side.
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(collegesListingPreviewQuery); },

  component: () => <CollegesPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <CollegesPage />,
});
