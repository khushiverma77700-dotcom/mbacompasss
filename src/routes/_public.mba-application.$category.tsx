import { createFileRoute } from "@tanstack/react-router";
import ApplicationTrackerPage from "@/pages/tracker/ApplicationTrackerPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router-compat";
import {
  type CategoryKey,
  categoryFromSlug,
  matchesCategory,
  publicTrackersQuery,
} from "@/lib/applicationTracker";
import { APPLICATION_BASE, categoryPageMeta } from "@/lib/applicationSeo";
import { canonicalUrl } from "@/lib/canonical";

/**
 * Indexable category landing pages — only the four real categories plus the
 * curated Recommended tab get a URL. Anything else 404s so filter noise never
 * creates thin duplicate pages.
 */
export const Route = createFileRoute("/_public/mba-application/$category")({
  loader: async ({ context, params }) => {
    const category = categoryFromSlug(params.category);
    if (!category || category === "all") return { category: null };
    const rows = await context.queryClient.ensureQueryData(publicTrackersQuery);
    return { category, meta: categoryPageMeta(category, rows.filter((r) => matchesCategory(r, category))) };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.category || !loaderData.meta) {
      return { meta: [{ title: "Page not found" }, { name: "robots", content: "noindex" }] };
    }
    const { title, description, canonical } = loaderData.meta;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: CategoryLanding,
  pendingComponent: PublicPageSkeleton,
  errorComponent: NotListed,
  notFoundComponent: NotListed,
});

function CategoryLanding() {
  const { category } = Route.useLoaderData();
  if (!category) return <NotListed />;
  return <ApplicationTrackerPage presetCategory={category as Exclude<CategoryKey, "all">} />;
}

function NotListed() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-10 text-center">
      <h1 className="text-[1.375rem] font-semibold text-slate-900">This application category is not listed</h1>
      <p className="text-sm text-slate-600">Browse every open MBA college and exam application form instead.</p>
      <Button asChild>
        <Link to={APPLICATION_BASE}>View all MBA applications</Link>
      </Button>
      <p className="text-sm text-slate-400">
        <a href={canonicalUrl(APPLICATION_BASE)}>MBA application forms 2027</a>
      </p>
    </div>
  );
}
