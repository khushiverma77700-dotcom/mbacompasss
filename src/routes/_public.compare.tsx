import { comparisonCoursesQuery } from "@/lib/queries/listingQueries";
import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ComparePage from "@/pages/ComparePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/compare")({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(comparisonCoursesQuery); },
  head: () => publicPageHead('/compare', 'Compare MBA Coaching Courses & Fees | MBA Compass', 'Compare coaching courses, fees, curriculum, faculty and study modes side by side. Find MBA exam preparation options that fit your needs.'),
  component: () => <ComparePage />,
  pendingComponent: PublicPageSkeleton,
});
