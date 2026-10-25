import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, notFound } from "@tanstack/react-router";
import CoachingPage from "@/pages/CoachingPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { institutesQuery } from "@/lib/queries/listingQueries";
import { coachingExams, matchesCoachingHub, type CoachingHub } from "@/lib/coachingHub";
import { getExamHubSeo } from "@/lib/coachingSeoTemplates";
import { directoryPage, directoryPageUrl, DIRECTORY_PAGE_SIZE } from "@/lib/directoryPagination";
import NotFound from "@/pages/NotFound";

export const Route = createFileRoute("/_public/coaching/exam/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({ ...search, page: directoryPage(search.page) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, context, deps }) => {
    if (!coachingExams.includes(params.slug)) throw notFound();
    const hub: CoachingHub = { path: `/coaching/exam/${params.slug}`, ...getExamHubSeo(params.slug), exam: params.slug };
    const rows = await context.queryClient.ensureQueryData(institutesQuery());
    const count = rows.filter((row) => matchesCoachingHub(row, hub)).length;
    if (!count || (deps.page - 1) * DIRECTORY_PAGE_SIZE >= count) throw notFound();
    return hub;
  },
  head: ({ loaderData, match }) => publicPageHead(directoryPageUrl(loaderData?.path || match.pathname, match.loaderDeps.page), match.loaderDeps.page > 1 ? `${loaderData?.exam?.toUpperCase()} Coaching: Page ${match.loaderDeps.page} | MBA Compass` : loaderData?.title || "MBA Coaching | MBA Compass", loaderData?.description || "Compare MBA entrance exam coaching courses and fees."),
  component: () => <CoachingPage hub={Route.useLoaderData()} />,
  pendingComponent: PublicPageSkeleton,
  notFoundComponent: NotFound,
  errorComponent: () => <div role="alert" className="container py-12">Coaching listings could not be loaded. Please try again.</div>,
});
