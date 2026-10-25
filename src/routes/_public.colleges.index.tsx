import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, notFound } from "@tanstack/react-router";
import CollegesPage from "@/pages/CollegesPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { collegeDirectoryQuery } from "@/lib/queries/collegeDirectoryQuery";
import { directoryPage, directoryPageUrl } from "@/lib/directoryPagination";
import NotFound from "@/pages/NotFound";

export const Route = createFileRoute("/_public/colleges/")({
  validateSearch: (search: Record<string, unknown>) => ({ ...search, page: directoryPage(search.page) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  head: ({ match }) => publicPageHead(directoryPageUrl('/colleges', match.loaderDeps.page), `MBA Colleges in India${match.loaderDeps.page > 1 ? `: Page ${match.loaderDeps.page}` : ': Fees & Placements'} | MBA Compass`, 'Explore MBA colleges by location, exams, fees and placements. Compare admissions and shortlist business schools on MBA Compass.'),
  loader: async ({ context, deps }) => {
    const result = await context.queryClient.ensureQueryData(collegeDirectoryQuery(deps.page));
    if (!result.rows.length && deps.page > 1) throw notFound();
  },

  component: () => <CollegesPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <div role="alert" className="container py-12">College listings could not be loaded. Please try again.</div>,
  notFoundComponent: NotFound,
});
