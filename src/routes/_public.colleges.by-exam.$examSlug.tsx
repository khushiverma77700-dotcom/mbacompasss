import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { collegeDirectoryQuery } from "@/lib/queries/collegeDirectoryQuery";
import { directoryPage, directoryPageUrl } from "@/lib/directoryPagination";
import NotFound from "@/pages/NotFound";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/by-exam/$examSlug")({
  validateSearch: (search: Record<string, unknown>) => ({ ...search, page: directoryPage(search.page) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ context, params, deps }) => {
    const result = await context.queryClient.ensureQueryData(collegeDirectoryQuery(deps.page, "exam", params.examSlug.toLowerCase()));
    if (!result.rows.length) throw notFound();
  },
  head: ({ params, match }) => publicPageHead(directoryPageUrl(`/colleges/by-exam/${params.examSlug}`, match.loaderDeps.page), `MBA Colleges Accepting ${params.examSlug.toUpperCase()}${match.loaderDeps.page > 1 ? `: Page ${match.loaderDeps.page}` : ''} | MBA Compass`, `Compare colleges accepting ${params.examSlug.toUpperCase()}, including recorded fees, placements and entrance exams.`),
  component: () => <CollegeHubPage kind="exam" />,
  pendingComponent: PublicPageSkeleton,
  notFoundComponent: NotFound,
  errorComponent: () => <div role="alert" className="container py-12">College listings could not be loaded. Please try again.</div>,
});
