import { createFileRoute } from "@tanstack/react-router";
import MBACompassCoursesPage from "@/pages/MBACompassCoursesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { mbaCompassCoursesQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/courses")({
  head: () => ({ meta: [
    { title: "Courses & Mock Test Programs | MBA Compass" },
    { name: "description", content: "Compare MBA Compass CAT, XAT and MBA entrance preparation courses and review their features, prices and no-refund terms before enrolling." },
    { property: "og:title", content: "Courses & Mock Test Programs | MBA Compass" },
    { property: "og:description", content: "Compare MBA Compass preparation courses, prices and no-refund terms before enrolling." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  // Prefetch server-side so the SSR HTML carries real course cards instead of
  // the skeleton grid. Key is shared with CoursesInner's useQuery, so hydration
  // reuses this data (no client re-fetch).
  loader: async ({ context }) => { await context.queryClient.prefetchQuery(mbaCompassCoursesQuery); },
  component: () => <MBACompassCoursesPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <MBACompassCoursesPage />,
});
