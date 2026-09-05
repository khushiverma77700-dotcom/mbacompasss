import { createFileRoute } from "@tanstack/react-router";
import ApplicationDetailPage from "@/pages/tracker/ApplicationDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { trackerBySlugQuery } from "@/lib/applicationTracker";
import { collegePageMeta } from "@/lib/applicationSeo";

/**
 * One reusable template for every college and exam application page, so
 * hundreds of admin-managed records get unique, data-driven SEO without any
 * frontend change.
 */
export const Route = createFileRoute("/_public/mba-application/college/$slug")({
  loader: async ({ context, params }) => {
    const row = await context.queryClient.ensureQueryData(trackerBySlugQuery(params.slug));
    return { meta: row ? collegePageMeta(row) : null };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.meta) {
      return { meta: [{ title: "Application not found" }, { name: "robots", content: "noindex" }] };
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
  component: CollegeApplication,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <ApplicationDetailPage slug="" />,
});

function CollegeApplication() {
  const { slug } = Route.useParams();
  return <ApplicationDetailPage slug={slug} />;
}
