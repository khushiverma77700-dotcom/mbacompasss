import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import type { DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { packRows, unpackRows } from "./lib/queries/rowTransport";
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
    // Serialize the server-side React Query cache into the SSR payload and
    // rehydrate it on the client, so routes whose loaders prefetch a query
    // render real content in view-source instead of their loading skeleton.
    // Passed as a JSON string: the router validates payload serializability
    // structurally, and DehydratedState's mutation keys are typed `unknown[]`.
    dehydrate: (): { queryClientState: string } => ({
      queryClientState: JSON.stringify(
        dehydrate(queryClient, { shouldDehydrateMutation: () => false }),
      ),
    }),
    hydrate: (dehydrated: { queryClientState: string }) => {
      hydrate(queryClient, JSON.parse(dehydrated.queryClientState) as DehydratedState);
    },
  });

  return router;
};
