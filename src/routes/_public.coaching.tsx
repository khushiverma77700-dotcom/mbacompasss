import { createFileRoute } from "@tanstack/react-router";
import CoachingPage from "@/pages/CoachingPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { institutesQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/coaching")({
  // CoachingPage calls useInstitutes() with no argument, so the key is
  // ["institutes", undefined] — prefetched here with the identical key.
  loader: ({ context }) => context.queryClient.ensureQueryData(institutesQuery()),
  component: () => <CoachingPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <CoachingPage />,
});
