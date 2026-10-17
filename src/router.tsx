import { QueryClient, dehydrate, hydrate, timeoutManager } from "@tanstack/react-query";
import type { DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { packRows, unpackRows } from "./lib/queries/rowTransport";
import { routeTree } from "./routeTree.gen";
import { installUploadCompression } from "./lib/imageCompression";
import { registerPublicSnapshot } from "./lib/queries/publicSnapshot";


let serverTimeoutsInstalled = false;
export const getRouter = () => {
  // All server query GC timers must release the build process, including
  // per-component overrides that would otherwise hold prerendering open.
  if (typeof window === "undefined" && !serverTimeoutsInstalled) {
    serverTimeoutsInstalled = true;
    timeoutManager.setTimeoutProvider({
      setTimeout: (cb, ms) => {
        const id = setTimeout(cb, ms);
        (id as unknown as { unref?: () => void }).unref?.();
        return id;
      },
      clearTimeout: (id) => clearTimeout(id),
      setInterval: (cb, ms) => {
        const id = setInterval(cb, ms);
        (id as unknown as { unref?: () => void }).unref?.();
        return id;
      },
      clearInterval: (id) => clearInterval(id),
    });
  }
  installUploadCompression();
  // Ported from the pre-migration App.tsx QueryClient — public content
  // (colleges, exams, articles) rarely changes intra-session, so repeat
  // navigations become instant cache hits.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 60 * 1000,
        gcTime: typeof window === "undefined" ? Infinity : 24 * 60 * 60 * 1000,
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
    // Row arrays travel column-oriented (see rowTransport) so 4k+ repeated
    // field names don't dominate the payload.
    dehydrate: (): { queryClientState: string } => {
      const state = dehydrate(queryClient, { shouldDehydrateMutation: () => false });
      for (const query of state.queries) {
        query.state.data = packRows(query.state.data);
      }
      return { queryClientState: JSON.stringify(state) };
    },
    hydrate: (dehydrated: { queryClientState: string }) => {
      const state = JSON.parse(dehydrated.queryClientState) as DehydratedState;
      for (const query of state.queries) {
        query.state.data = unpackRows(query.state.data);
      }
      hydrate(queryClient, state);
      registerPublicSnapshot(queryClient, state);
    },
  });


  return router;
};
