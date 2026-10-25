import { createFileRoute, notFound } from "@tanstack/react-router";
import { publicPageHead } from "@/lib/publicPageHead";
import { collegeDirectoryQuery } from "@/lib/queries/collegeDirectoryQuery";
import { directoryPage, directoryPageUrl } from "@/lib/directoryPagination";
import NotFound from "@/pages/NotFound";
import CollegeHubPage from "@/pages/CollegeHubPage";

export const Route = createFileRoute("/_public/colleges/by-state/$stateSlug")({
  validateSearch: (search: Record<string, unknown>) => ({ ...search, page: directoryPage(search.page) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ context, params, deps }) => {
    const result = await context.queryClient.ensureQueryData(collegeDirectoryQuery(deps.page, "state", params.stateSlug));
    if (!result.rows.length) throw notFound();
    return { name: result.name };
  },
  head: ({ params, loaderData, match }) => publicPageHead(directoryPageUrl(`/colleges/by-state/${params.stateSlug}`, match.loaderDeps.page), `MBA Colleges in ${loaderData?.name || params.stateSlug}${match.loaderDeps.page > 1 ? `: Page ${match.loaderDeps.page}` : ''} | MBA Compass`, `Compare MBA colleges in ${loaderData?.name || params.stateSlug}, including recorded fees, placements and accepted entrance exams.`),
  component: () => <CollegeHubPage kind="state" />,
  notFoundComponent: NotFound,
  errorComponent: () => <div role="alert" className="container py-12">College listings could not be loaded. Please try again.</div>,
});