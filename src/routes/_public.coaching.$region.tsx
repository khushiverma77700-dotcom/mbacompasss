import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, redirect, notFound } from "@tanstack/react-router";
import CoachingPage from "@/pages/CoachingPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { readCoachingRegion } from "@/lib/coachingHub.functions";
import { matchesCoachingHub, type CoachingHub } from "@/lib/coachingHub";
import { institutesQuery } from "@/lib/queries/listingQueries";
import { getRegionHubSeo } from "@/lib/coachingSeoTemplates";
import { directoryPage, directoryPageUrl, DIRECTORY_PAGE_SIZE } from "@/lib/directoryPagination";
import NotFound from "@/pages/NotFound";

export const Route = createFileRoute("/_public/coaching/$region")({
  validateSearch: (search: Record<string, unknown>) => ({ ...search, page: directoryPage(search.page) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, context, deps }) => {
    const [resolved, rows] = await Promise.all([readCoachingRegion({ data: { slug: params.region } }), context.queryClient.ensureQueryData(institutesQuery())]);
    if (resolved.instituteSlug) throw redirect({ to: "/institute/$slug", params: { slug: resolved.instituteSlug }, statusCode: 301 });
    const region = resolved.region;
    const state = region?.type === "state" ? region.name : undefined;
    const city = state ? undefined : region?.name || params.region.replace(/-/g, " ");
    const hub: CoachingHub = { path: `/coaching/${params.region}`, ...getRegionHubSeo(params.region, state ? "state" : "city"), city, state, aliases: region?.city_aliases || [] };
    const count = rows.filter((row) => matchesCoachingHub(row, hub)).length;
    if (!count || (deps.page - 1) * DIRECTORY_PAGE_SIZE >= count) throw notFound();
    return hub;
  },
  head: ({ loaderData, match }) => publicPageHead(directoryPageUrl(loaderData?.path || match.pathname, match.loaderDeps.page), match.loaderDeps.page > 1 ? `MBA Coaching in ${loaderData?.city || loaderData?.state}: Page ${match.loaderDeps.page}` : loaderData?.title || "MBA Coaching | MBA Compass", loaderData?.description || "Compare regional MBA coaching courses and fees."),
  component: () => <CoachingPage hub={Route.useLoaderData()} />,
  pendingComponent: PublicPageSkeleton,
  notFoundComponent: NotFound,
  errorComponent: () => <div role="alert" className="container py-12">Coaching listings could not be loaded. Please try again.</div>,
});
