import { createFileRoute } from "@tanstack/react-router";
import MocksListPage from "@/pages/mocks/MocksListPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { mocksLandingSettingsQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/mocks")({
  // MocksListPage renders a skeleton until landing settings arrive, so prefetch
  // them server-side under the same key the page's useQuery subscribes to.
  loader: ({ context }) => context.queryClient.ensureQueryData(mocksLandingSettingsQuery),
  component: () => <MocksListPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <MocksListPage />,
});
