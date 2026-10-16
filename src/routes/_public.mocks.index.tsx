import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MocksListPage from "@/pages/mocks/MocksListPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { mocksLandingSettingsQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/mocks/")({
  head: () => publicPageHead('/mocks', 'CAT & MBA Entrance Mock Tests | MBA Compass', 'Explore CAT and MBA entrance mock tests, practice sets and performance analysis. Compare available preparation plans on MBA Compass.'),
  // MocksListPage renders a skeleton until landing settings arrive, so prefetch
  // them server-side under the same key the page's useQuery subscribes to.
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(mocksLandingSettingsQuery); },
  component: () => <MocksListPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <MocksListPage />,
});
