import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { collegeDirectoryQuery } from "@/lib/queries/collegeDirectoryQuery";
import { directoryPage, directoryPageUrl } from "@/lib/directoryPagination";
import NotFound from "@/pages/NotFound";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/by-city/$citySlug")({
  validateSearch: (search: Record<string, unknown>) => ({ ...search, page: directoryPage(search.page) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ context, params, deps }) => {
    const result = await context.queryClient.ensureQueryData(collegeDirectoryQuery(deps.page, "city", params.citySlug));
    if (!result.rows.length) throw notFound();
    return { name: result.name };
  },
  head: ({ params, loaderData, match }) => publicPageHead(directoryPageUrl(`/colleges/by-city/${params.citySlug}`, match.loaderDeps.page), `MBA Colleges in ${loaderData?.name || params.citySlug}${match.loaderDeps.page > 1 ? `: Page ${match.loaderDeps.page}` : ''} | MBA Compass`, `Compare MBA colleges in ${loaderData?.name || params.citySlug}, including recorded fees, placements and accepted entrance exams.`),
  component: () => <CollegeHubPage kind="city" />,
  pendingComponent: PublicPageSkeleton,
  notFoundComponent: NotFound,
  errorComponent: () => <div role="alert" className="container py-12">College listings could not be loaded. Please try again.</div>,
});
