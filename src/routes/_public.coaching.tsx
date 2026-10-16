import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CoachingPage from "@/pages/CoachingPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { institutesQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/coaching")({
  head: () => publicPageHead('/coaching', 'MBA Coaching Institutes & CAT Courses | MBA Compass', 'Compare MBA coaching institutes, CAT courses, fees, faculty and study modes to find preparation options that match your goals.'),
  // CoachingPage calls useInstitutes() with no argument, so the key is
  // ["institutes", undefined] — prefetched here with the identical key.
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(institutesQuery()); },
  component: () => <CoachingPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <CoachingPage />,
});
