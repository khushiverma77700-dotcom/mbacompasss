import { createFileRoute, Outlet } from "@tanstack/react-router";
import MocksListPage from "@/pages/mocks/MocksListPage";
import { mocksLandingSettingsQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/mocks")({
  // Layout route: renders <Outlet/> so child mock pages ($slug, result, review,
  // leaderboard, thank-you) can mount. The listing itself lives in
  // _public.mocks.index.tsx.
  loader: async ({ context }) => { await context.queryClient.prefetchQuery(mocksLandingSettingsQuery); },
  component: () => <Outlet />,
  errorComponent: () => <MocksListPage />,
});
