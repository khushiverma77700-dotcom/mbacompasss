import { createFileRoute } from "@tanstack/react-router";
import CollegesPage from "@/pages/CollegesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { collegesListingQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/colleges")({
  // Prefetch the listing server-side so the SSR HTML contains real college
  // names/H1 instead of the client-side loading skeleton. Query key is shared
  // with useColleges(), so hydration reuses this data (no client re-fetch).
  loader: async ({ context }) => { await context.queryClient.prefetchQuery(collegesListingQuery); },
  component: () => <CollegesPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <CollegesPage />,
});
