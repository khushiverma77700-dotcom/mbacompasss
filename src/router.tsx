import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import type { DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Ported from the pre-migration App.tsx QueryClient — public content
  // (colleges, exams, articles) rarely changes intra-session, so repeat
  // navigations become instant cache hits.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Replaces the old hand-rolled hover/tap chunk prefetcher (ROUTE_PREFETCHERS
    // + GlobalNavigationPrefetch in the pre-migration App.tsx).
    defaultPreload: "intent",
  });

  return router;
};
