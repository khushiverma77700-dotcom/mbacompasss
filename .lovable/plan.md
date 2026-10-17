# Prepare long articles before visitors open them

## Confirmed issue
Long articles still run full-body formatting and sanitization on their first server render. The largest current published sample has 133,472 characters and takes about 64 ms to enhance locally, before the rest of the page renders. The memory cache cannot protect a cold server instance. Monitoring supplied production CPU errors; the last-hour log lookup returned no matching errors, so the live failure has not been independently reproduced.

## Proposed correction
- Prepare article display HTML when an editor saves or approves an article, rather than on each visitor's first request.
- Preserve complete content, contents links, tables, internal links and security sanitization. Do not truncate articles or weaken security.
- Prepare existing published articles in resumable batches without changing original text or publishing drafts.
- Reuse prepared HTML only when it matches the current source content and preparation version.
- Bound description and answer-summary extraction before full-body processing; calculate reading statistics during preparation.
- Keep a compatible fallback for articles not yet prepared. Verify the largest articles under cold-request conditions before switching public reading paths.

## Technical details
- Add nullable prepared-display fields, source identity, processor version and reading statistics through an additive migration, preserving permissions.
- Audit every article save/generation/import path and use one shared preparation function. Draft status and editor approval remain unchanged.
- Preserve identical allowlisted server/browser HTML; do not rely on a process-local cache for correctness.
- Test source matching, stale prepared-data fallback, draft visibility, full-content preservation and security filtering.
- Benchmark published cold requests for the named large articles, including crawler-visible HTML and hydration.

## Already corrected separately
- Hydrated public records now refresh in the background when mounted; static initial HTML remains available. Build-time HTML itself still requires republishing to change.
- Smart ad saves preserve booked end dates and honor earlier goal deadlines. Scheduling and freshness tests pass.

## Verification limitations
The signed-in ad-save check needs your account signed in within the preview. An existing ad-sidebar hydration warning appeared during the college browser check; it is outside these three findings and was not changed.