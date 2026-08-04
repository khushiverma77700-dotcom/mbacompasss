# Content Pruning Module for the AI SEO Dashboard

An AI-powered pruning engine that audits every URL on the site, assigns one of ten
recommendations with a written rationale, and — after admin approval — executes the
approved actions (including redirects, canonicals, noindex, and deletion).

Built in three phases so the decision engine can be validated on real data before any
write action is allowed to run.

## Phase 1 — Signals & engine (no writes)

**Page inventory.** One row per public URL, built from the same source the sitemap
generator already uses (colleges, institutes, courses, programmes, exams, articles,
news, city pages, category/coaching pages, static routes). Runs incrementally so new
pages join the inventory automatically as the site grows.

**Signals collected per URL**

- Content: word count, heading structure, FAQ presence, schema/JSON-LD present, entity
  coverage, readability, thin-content flags, AI-repetition score.
- Freshness: published date, last updated, and detection of stale facts (old fees,
  cutoffs, placements, rankings, admission dates, expired references).
- Duplication: near-duplicate and exact-duplicate clustering across pages, plus
  duplicate titles, descriptions, H1s, FAQs, and schema blocks.
- Cannibalization: pages competing on the same primary keyword or search intent,
  reusing the existing one-keyword-per-page data.
- Links: orphan pages, inbound internal link count, outbound link count, anchor-text
  quality, broken links, link-equity distribution.
- Index/crawl: canonical target, robots directives, sitemap membership, and the
  discovered/indexed state already tracked by the indexing status panel.
- Search Console: clicks, impressions, CTR, average position, and their 28-day and
  90-day trend per URL.
- Analytics: sessions and engagement per URL.
- Performance: page speed and Core Web Vitals from the existing health-check data.

**AI decision engine.** For each page (and each duplicate cluster) the engine produces
exactly one recommendation — Keep, Update, Merge, Redirect, Delete, Noindex,
Add Canonical, Rewrite, Expand, or Refresh — together with: problem, reason, SEO impact,
recommended solution, priority, expected improvement, and estimated difficulty. Merge and
Redirect recommendations name the specific target URL. Refresh recommendations name only
the outdated sections, not the whole page.

Four scores per page: SEO health, content quality, freshness, authority/internal-link.
An opportunity score combines impressions with position to surface pages that are close
to ranking.

Phase 1 ends with a validation run over the full inventory whose output is reviewed
before any execution code is enabled.

## Phase 2 — Dashboard

A new **Content Pruning** module inside the AI SEO Dashboard.

- Summary tiles: total pages, healthy, to update, to merge, to delete, to redirect,
  cannibalization conflicts, thin content, duplicates, high-opportunity, recently
  improved, estimated organic growth.
- Charts: recommendation distribution, health-score distribution, traffic before/after
  for actioned pages, indexing status, crawl-health trend, score trends over runs.
- Filters: page type (college, blog, tool, landing, course, exam, category), state, city,
  traffic band, index status, priority, recommendation, last-updated window, author.
- Page detail drawer: the four scores, AI summary, problems found, recommended actions,
  suggested improvements, duplicate cluster members, competing keywords, internal links
  in/out, and a before-vs-after impact estimate.
- Live run panel showing per-page progress, throughput, failures, and retries — matching
  the existing bulk-job panels.
- Bulk selection with Approve, Reject, Update, Merge, Redirect, Noindex, Canonical, and
  CSV export. Nothing executes without explicit approval.

## Phase 3 — Execution & one-click run

An executor that applies only approved items, one action type at a time, with every
change written to an audit log and a revert payload stored for each item.

- Update / Rewrite / Expand / Refresh → queued into the existing Re-SEO and
  content-refresh pipelines rather than duplicating that logic.
- Add Canonical / Noindex → written to the per-page SEO override layer so the SPA head
  tags and the prerendered HTML both reflect it.
- Redirect / Merge → a redirect table consulted by the prerender/edge layer, which
  issues a real 301 for crawlers and users; merged pages redirect to the surviving URL.
- Delete → hard delete of the source row, preceded by a stored snapshot for restore, an
  automatic 301 to the chosen replacement URL, and removal from the sitemap. Requires a
  typed confirmation and is blocked for any page with inbound backlinks or non-trivial
  traffic unless the admin overrides.

After execution: sitemap and robots refresh, affected URLs submitted for indexing, and a
final SEO impact report comparing before/after signals for the run.

**Run Content Pruning** then performs the whole sequence — scan, analyse, detect,
recommend, report, wait for approval, execute, report impact — in one click, and a
scheduled run keeps the inventory and recommendations current as new pages are added.

## Technical notes

- New tables: `pruning_runs`, `pruning_pages` (inventory + signals + scores),
  `pruning_recommendations` (decision, rationale, target URL, priority, approval state),
  `pruning_duplicate_clusters`, `pruning_actions` (execution log + revert payload),
  `seo_redirects` (from path, to path, type, reason, source item). Admin-only RLS,
  service_role access for the workers.
- New edge functions: `pruning-inventory` (build/refresh inventory),
  `pruning-signals` (GSC, Analytics, links, duplicates, freshness),
  `pruning-analyze-worker` (AI decisions, queue-driven like the existing Re-SEO worker),
  `pruning-execute` (approved actions only). All admin-guarded via `requireAdmin`.
- Search Console and Analytics are read through their connectors from server-side code
  only; a per-URL metrics cache avoids re-querying on every run.
- `ssr-prerender` gains a redirect lookup that returns 301 before rendering, and
  `serve-sitemap` / `refresh-sitemap` exclude deleted, redirected, and noindexed URLs.
- AI calls reuse the shared gateway helper and existing usage logging.
- Duplicate detection uses content shingling/embeddings computed server-side and cached
  per page revision so full-site comparison stays cheap at 1000+ pages.
- Search Console and Analytics connectors must be linked in this workspace before Phase 1
  signal collection can run; the engine degrades to on-page signals until then.
