import { createFileRoute } from "@tanstack/react-router";
import CollegesPage from "@/pages/CollegesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { collegesListingPreviewQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/colleges")({
  // Prefetch only the FIRST screen server-side so the SSR HTML has real college
  // names/H1 without shipping the whole 5k-row catalogue as dehydrated JSON
  // (that made this page a ~5.8 MB download). The full list loads client-side.
  loader: async ({ context }) => { await context.queryClient.prefetchQuery(collegesListingPreviewQuery); },

  component: () => <CollegesPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <CollegesPage />,
});
