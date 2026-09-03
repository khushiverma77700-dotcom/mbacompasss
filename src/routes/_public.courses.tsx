import { createFileRoute } from "@tanstack/react-router";
import MBACompassCoursesPage from "@/pages/MBACompassCoursesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { mbaCompassCoursesQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/courses")({
  // Prefetch server-side so the SSR HTML carries real course cards instead of
  // the skeleton grid. Key is shared with CoursesInner's useQuery, so hydration
  // reuses this data (no client re-fetch).
  loader: async ({ context }) => { await context.queryClient.prefetchQuery(mbaCompassCoursesQuery); },
  component: () => <MBACompassCoursesPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <MBACompassCoursesPage />,
});
