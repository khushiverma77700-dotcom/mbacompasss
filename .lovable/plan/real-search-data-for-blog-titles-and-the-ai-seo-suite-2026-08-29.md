# Real search data for Blog Titles and the AI SEO suite

## What is wrong today

Verified in the code:

- The Blog Titles tab and Keyword Research tab both get their numbers from `ai-keyword-research`, where search volume, CPC, difficulty and competition are **invented by the language model**. Blog Titles has no real data source at all, which is why the same round numbers repeat.
- Keyword Research does fetch real Google Autocomplete, Trends autocomplete, Wikipedia and "people also ask" style expansions — so the keyword *strings* are real, but every *number* attached to them is a guess.
- Blog articles are written to a strong content spec already (keyword placement, internal links, FAQs, tables), but the writer never receives volume, difficulty, SERP or competitor data, so topic and keyword choices are not data-driven.
- Blog article pages render no structured data on the client. Article schema exists only in the prerender path, and FAQ + breadcrumb schema for articles is missing.

## What will be built

### 1. One keyword-metrics service, two real providers

A new shared module plus a `keyword-metrics` backend function becomes the single source of truth for keyword numbers:

- **DataForSEO** — Google Ads Keyword Planner volume, 12-month monthly trend, CPC and competition index for the India / English market. This is the primary volume source.
- **Semrush** (connected account) — keyword difficulty, SERP competition, related and question keywords, and competitor keyword gaps.
- **Google Search Console** (already connected in this project) — actual clicks, impressions, CTR and average position for keywords the site already ranks for. Where GSC has data it wins, because it is our own measured traffic.

Every returned metric carries a `source` and `fetched_at`. Results are cached in a new `keyword_metrics_cache` table (30-day freshness for volume, 7-day for GSC) so repeat lookups cost nothing and bulk runs stay inside provider limits.

### 2. Blog Titles becomes data-driven

New flow when you enter a topic:

1. Expand the topic into real candidate keywords (Google Autocomplete, PAA, Semrush related/questions).
2. Fetch real metrics for every candidate through the service above.
3. Score each candidate: volume, difficulty vs our authority, intent, trend direction, and whether we already rank for it in GSC.
4. Only then ask the model to write titles — one title per selected keyword, with the real numbers passed in as facts it may not change.

The table gains: real volume, 12-month trend sparkline, CPC, Semrush difficulty, current GSC position (if any), an opportunity score, and a **source badge** on every row. Where a provider has no data, the cell shows the AI estimate in grey with an "est." marker and a tooltip explaining it is unverified.

### 3. Blog writer uses the data

When you send a title to the writer, it now receives the keyword's real metrics, the top-10 SERP snapshot for that keyword, the secondary and question keywords with their own volumes, and the pages we already rank with. The prompt is extended so the article covers the actual question set people search, places the primary keyword against measured competitor patterns, and never states a search figure that did not come from a provider.

The writer also returns, and the article page renders, complete structured data: BlogPosting, FAQPage, BreadcrumbList, plus author and publisher blocks — client-side and in the prerendered HTML so crawlers see the same thing.

### 4. Same data across the admin SEO tools

The keyword-metrics service is wired into the other places that currently guess: Keyword Research, Content Gaps, Competitor Analysis, Re-SEO / Auto-SEO scoring, the SEO health check and the pruning engine. A "data source" column and a provider-health strip (quota left, last successful call, cache hit rate) is added to the SEO dashboard so you can see when a provider is failing rather than silently falling back to estimates.

### 5. SEO strategy layer

On top of accurate numbers, a strategy panel that compares our GSC performance against Semrush competitor gaps and reports, per money page: keywords we rank 4-20 for and could push to page one, keywords competitors own that we have no page for, cannibalisation between our own pages, and decayed pages worth refreshing. Each row links straight into Re-SEO or the blog writer with the keyword pre-loaded.

## Setup you need to do

- **DataForSEO** — create an account at dataforseo.com and give me the API login and password; I will store them as backend secrets. Pay-per-use, roughly a few cents per hundred keywords.
- **Semrush** — I will open the connect card so you can authorise your Semrush account. Your plan's limits apply.

Both are called only from backend functions; no key ever reaches the browser.

## Technical details

- New table `keyword_metrics_cache` (keyword, locale, provider payloads, JSONB monthly trend, fetched_at) with RLS and grants: read for authenticated admins, full access for service role.
- New edge function `keyword-metrics` with modes `lookup`, `bulk`, `expand`, `serp`, `gsc`. Batches DataForSEO in blocks of 100 keywords, honours `Retry-After` on 429, and returns partial results with a per-keyword status rather than failing the whole request.
- Shared helper `_shared/keywordMetrics.ts` used by `ai-keyword-research`, `ai-blog-writer`, `auto-seo-engine`, `seo-reoptimize-worker`, `deep-seo-audit` and the pruning workers, so there is one code path for provider selection, caching and source tagging.
- AI calls continue to run through `_shared/aiGateway.ts` on the two existing OpenAI keys; no new AI provider is added.
- The response type gains `metrics: { value, source, confidence, fetched_at }` per keyword, and the frontend renders `source === "ai_estimate"` distinctly. No number is ever rendered without a source.
- Affected backend functions are redeployed and each provider path is tested with a live call before the work is reported done.
