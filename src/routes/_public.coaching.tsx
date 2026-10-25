import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import CoachingPage from "@/pages/CoachingPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { institutesQuery } from "@/lib/queries/listingQueries";
import { directoryPage, directoryPageUrl } from "@/lib/directoryPagination";
import NotFound from "@/pages/NotFound";

export const Route = createFileRoute("/_public/coaching")({
  validateSearch: (search: Record<string, unknown>) => ({ ...search, page: directoryPage(search.page) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  head: ({ match }) => publicPageHead(directoryPageUrl('/coaching', match.loaderDeps.page), `MBA Coaching${match.loaderDeps.page > 1 ? `: Page ${match.loaderDeps.page}` : ' Institutes & CAT Courses'} | MBA Compass`, 'Compare MBA coaching institutes, CAT courses, fees, faculty and study modes to find preparation options that match your goals.'),
  // CoachingPage calls useInstitutes() with no argument, so the key is
  // ["institutes", undefined] — prefetched here with the identical key.
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(institutesQuery()); },
  component: () => <CoachingPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <div role="alert" className="container py-12">Coaching listings could not be loaded. Please try again.</div>,
  notFoundComponent: NotFound,
});
