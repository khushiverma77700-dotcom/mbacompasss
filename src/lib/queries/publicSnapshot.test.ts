import { QueryClient, QueryObserver, dehydrate, hydrate } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { registerPublicSnapshot, refreshPublicSnapshot, PUBLIC_SNAPSHOT_MAX_AGE_MS } from "./publicSnapshot";

it("refreshes an old mounted college snapshot despite disabled mount refetch without removing initial data", async () => {
  const build = new QueryClient();
  build.setQueryData(["college", "iim-ahmedabad"], { fees: 20 }, { updatedAt: 1 });
  const state = dehydrate(build);
  const visitor = new QueryClient({ defaultOptions: { queries: { refetchOnMount: false, staleTime: Infinity } } });
  hydrate(visitor, state);
  registerPublicSnapshot(visitor, state);
  let reads = 0;
  const observer = new QueryObserver(visitor, { queryKey: ["college", "iim-ahmedabad"], queryFn: async () => { reads++; return { fees: 25 }; } });
  const unsubscribe = observer.subscribe(() => {});
  expect(visitor.getQueryData(["college", "iim-ahmedabad"])).toEqual({ fees: 20 });
  await refreshPublicSnapshot(visitor);
  expect(visitor.getQueryData(["college", "iim-ahmedabad"])).toEqual({ fees: 25 });
  await refreshPublicSnapshot(visitor);
  expect(reads).toBe(1);
  unsubscribe(); build.clear(); visitor.clear();
});

it("does not refetch private hydrated data", async () => {
  const client = new QueryClient();
  client.setQueryData(["student-profile"], { name: "Private" });
  registerPublicSnapshot(client, dehydrate(client));
  let reads = 0;
  const observer = new QueryObserver(client, { queryKey: ["student-profile"], staleTime: Infinity, queryFn: async () => { reads++; return {}; } });
  const unsubscribe = observer.subscribe(() => {});
  expect(await refreshPublicSnapshot(client)).toBe(false);
  expect(reads).toBe(0);
  unsubscribe(); client.clear();
});

it("reuses fresh public SSR data and refreshes it once it ages", async () => {
  const client = new QueryClient();
  const savedAt = Date.now();
  client.setQueryData(["college", "fresh"], { fees: 20 }, { updatedAt: savedAt });
  const state = dehydrate(client);
  registerPublicSnapshot(client, state);
  let reads = 0;
  const observer = new QueryObserver(client, {
    queryKey: ["college", "fresh"], staleTime: Infinity,
    queryFn: async () => { reads++; return { fees: 25 }; },
  });
  const unsubscribe = observer.subscribe(() => {});
  expect(await refreshPublicSnapshot(client)).toBe(false);
  expect(reads).toBe(0);
  const { vi } = await import("vitest");
  const clock = vi.spyOn(Date, "now").mockReturnValue(savedAt + PUBLIC_SNAPSHOT_MAX_AGE_MS);
  try {
    expect(await refreshPublicSnapshot(client)).toBe(true);
    expect(reads).toBe(1);
    expect(client.getQueryData(["college", "fresh"])).toEqual({ fees: 25 });
  } finally { clock.mockRestore(); unsubscribe(); client.clear(); }
});