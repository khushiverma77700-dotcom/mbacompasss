import { createFileRoute } from "@tanstack/react-router";
import BlogPage from "@/pages/BlogPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { blogArticlesQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/blog")({
  head: () => ({ meta: [
    { title: "MBA Preparation Blog and College Guides | MBA Compass" },
    { name: "description", content: "Read MBA Compass articles on entrance exam preparation, college admissions, fees and MBA planning." },
    { property: "og:title", content: "MBA Preparation Blog and College Guides | MBA Compass" },
    { property: "og:description", content: "Explore MBA preparation articles and college admission guides from MBA Compass." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  // Prefetch server-side so the SSR HTML carries real article titles instead of
  // the skeleton grid. Key is shared with BlogPage's useQuery, so hydration
  // reuses this data (no client re-fetch).
  loader: async ({ context }) => { await context.queryClient.prefetchQuery(blogArticlesQuery); },
  component: () => <BlogPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <BlogPage />,
});
