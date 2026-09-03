import { createFileRoute } from "@tanstack/react-router";
import BlogPage from "@/pages/BlogPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { blogArticlesQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/blog")({
  // Prefetch server-side so the SSR HTML carries real article titles instead of
  // the skeleton grid. Key is shared with BlogPage's useQuery, so hydration
  // reuses this data (no client re-fetch).
  loader: async ({ context }) => { await context.queryClient.prefetchQuery(blogArticlesQuery); },
  component: () => <BlogPage />,
  pendingComponent: PublicPageSkeleton,
  errorComponent: () => <BlogPage />,
});
