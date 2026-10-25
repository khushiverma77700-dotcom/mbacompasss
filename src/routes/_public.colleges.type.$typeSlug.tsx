import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { collegeDirectoryQuery } from "@/lib/queries/collegeDirectoryQuery";
import { directoryPage, directoryPageUrl } from "@/lib/directoryPagination";
import NotFound from "@/pages/NotFound";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/type/$typeSlug")({
  validateSearch: (search: Record<string, unknown>) => ({ ...search, page: directoryPage(search.page) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ context, params, deps }) => {
    const result = await context.queryClient.ensureQueryData(collegeDirectoryQuery(deps.page, "type", params.typeSlug.toLowerCase()));
    if (!result.rows.length) throw notFound();
  },
  head: ({ params, match }) => publicPageHead(directoryPageUrl(`/colleges/type/${params.typeSlug}`, match.loaderDeps.page), `${params.typeSlug.replace(/-/g, " ")} MBA Colleges${match.loaderDeps.page > 1 ? `: Page ${match.loaderDeps.page}` : ''} | MBA Compass`, "Compare MBA colleges by category, recorded fees, placements and accepted entrance exams."),
  component: () => <CollegeHubPage kind="type" />,
  pendingComponent: PublicPageSkeleton,
  notFoundComponent: NotFound,
  errorComponent: () => <div role="alert" className="container py-12">College listings could not be loaded. Please try again.</div>,
});
