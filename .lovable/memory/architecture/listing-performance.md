---
name: Listing Performance
description: Colleges directory is served from a pre-built snapshot (colleges_listing_cache) refreshed hourly; SSR ships only a 120-row preview, never the full catalogue.
type: feature
---
- `public.colleges_listing()` reads the materialised view `public.colleges_listing_cache` (was ~2.6s per call, now ~14ms). Never revert it to computing over `colleges` directly.
- `public.refresh_colleges_listing_cache()` rebuilds the snapshot. Hourly cron at `7 * * * *`; also called from admin college save/delete/bulk paths via `src/lib/refreshCollegesCache.ts`. Any new admin write path to `colleges` must call it.
- The materialised view is not exposed to the Data API; refresh is limited to service role or admins.
- Never fetch the whole 5k-row catalogue in the browser for counts or related lists:
  - city counts → `public.colleges_location_counts()` + `countCollegesForAliases` (`useCollegeLocationCounts`).
  - related colleges → `useSuggestedColleges(slug)` (limit 6).
- SSR must never prefetch `collegesListingQuery` (all ~5.2k rows): dehydrating it made `/colleges` a ~5.8 MB HTML download. The route loader prefetches `collegesListingPreviewQuery` (first 120 rows, key `["colleges","preview"]`) only; `CollegesPage` renders that until the full client-side list arrives. Page is now ~0.57 MB.
