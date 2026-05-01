## Goal
Ship 5 connected SEO upgrades on top of the existing AI SEO engine — without breaking what's already working (`ai-seo-enhance`, `auto-seo-engine`, `full-page-seo-audit`, `ai-keyword-research`).

Most of the building blocks already exist. This plan **enhances** them rather than rebuilding:
- `ai_usage_logs` table already tracks provider, model, tokens, latency, status, error
- `AdminAIUsage.tsx` page (1095 lines) already exists at `/admin/ai-usage`
- `ai-keyword-research` function already returns intent + difficulty + volume
- `AISEOSuggestions.tsx` already renders SEO output in the editors
- `full-page-seo-audit` already calls Firecrawl and returns `competitors[]`

---

## 1. Competitor Gap Report (Firecrawl-powered)

**Where:** `full-page-seo-audit` edge function + new component `src/components/admin/CompetitorGapReport.tsx`, surfaced inside `AISEOSuggestions.tsx`.

**Backend changes** (`supabase/functions/full-page-seo-audit/index.ts`):
- After Firecrawl returns the top 5 competing URLs, call Firecrawl `/scrape` (markdown + html, `onlyMainContent: true`) for the top 3 results in parallel.
- Extract from each competitor: H1/H2/H3 list, FAQ blocks (`<h2>question?</h2>` patterns + `FAQPage` JSON-LD), schema types present (`Article`, `Course`, `Organization`, `FAQPage`, `BreadcrumbList`, `Review`, `Rating`).
- Send the extracted competitor structure to the AI tool call as a new `competitorGap` field (`missingHeadings[]`, `missingFaqs[]`, `missingSchemas[]`, `contentDepthGap` = our wordCount vs avg competitor wordCount).
- Add `competitor_gap` JSON column to AI response normalization.

**Frontend:**
- New collapsible card "Competitor Gap Report" inside `AISEOSuggestions.tsx` showing 3 columns: Missing Headings, FAQ Opportunities, Schema Gaps. Each item has a one-click "Add to suggestions" that appends to `contentSuggestions[]` / `faqs[]` / `schemaMarkup[]`.

**Cost note:** scraping 3 competitor pages ≈ 3 Firecrawl credits per audit. Only runs when `runCompetitorScan: true` (already opt-in).

---

## 2. Configurable Keyword Research Mode (50+ kw, intent-tagged, saved)

**Where:** `ai-keyword-research` edge function (already returns intent) + new UI controls in `AISEOSuggestions.tsx`.

**Backend changes:**
- Already returns intent. Add a `mode` parameter: `"comprehensive"` (50+ kw, 6 buckets — current behavior) | `"focused"` (20 kw) | `"topic-cluster"` (existing) | `"voice-search"` (existing).
- Add `save_to: { contentType, recordId }` optional param. When provided, the function writes the keyword set into a new `seo_keyword_research` table (one row per record, JSONB column `keywords` with full payload, `updated_at`).

**DB migration** — new table:
```sql
create table public.seo_keyword_research (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,        -- 'college' | 'institute' | 'article'
  record_id uuid not null,
  primary_keyword text,
  keywords jsonb not null default '[]'::jsonb,
  total_count integer default 0,
  generated_at timestamptz default now(),
  unique(content_type, record_id)
);
-- RLS: admins manage; public can SELECT (used by SEOHead too)
```

**Frontend:**
- New "Deep Keyword Research" button in the SEO panel of each editor (`AdminWriteCollege`, `AdminWriteInstitute`, `AdminWriteBlog`). Opens a modal with mode dropdown + count slider (20–80).
- On generate: shows table of keywords with columns Keyword, Volume, Difficulty, Intent badge (color-coded: informational=blue, commercial=amber, transactional=green, navigational=gray), Trending icon.
- Bulk-select checkboxes → "Save selected to page keywords" (writes to existing `keywords[]` field) or "Save all to research store" (writes to `seo_keyword_research`).

---

## 3. Pre-Publish Validation for Meta Tags + JSON-LD

**Where:** new shared lib `src/lib/seoValidator.ts` + integrated into `AdminWriteBlog`, `AdminWriteCollege`, `AdminWriteInstitute` save flows + a new edge function `validate-seo` (so bulk operations can validate too).

**Validation rules** (all configurable, but sensible defaults):
- `meta_title`: 30–60 chars, must contain primary keyword, no duplicate across published pages of same type.
- `meta_description`: 120–160 chars, must contain primary keyword, must end with sentence punctuation.
- `h1_tag`: present, 20–70 chars, different from `meta_title`.
- `slug`: kebab-case only, no stop words, ≤ 60 chars.
- `keywords[]`: ≥ 5, ≤ 25 items.
- `og_image` / `twitter_image`: URL reachable (HEAD 200), ≥ 1200×630.
- `schema_markup`: each JSON-LD object validated:
  - has `@context` = `https://schema.org`
  - has `@type` from allowed set
  - required fields per type (Article: headline+author+datePublished+image; FAQPage: mainEntity[]; Course: name+provider; etc.)
  - parses as valid JSON
- Returns `{ ok: boolean, errors: [{field, message, severity: 'error'|'warning'}] }`.

**UI integration:**
- "Validate before publish" button next to Save in each editor → shows a `Sheet` with grouped pass/warn/fail.
- Block "Publish" toggle when severity=error exists; allow override with admin confirm dialog.
- Reuse the same lib in `auto-seo-engine` bulk mode → write a `seo_validation_report` row per page so admins can see "47 pages have validation errors" in the SEO dashboard.

**DB migration:**
```sql
create table public.seo_validation_reports (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  record_id uuid not null,
  url text,
  passed boolean not null,
  errors jsonb default '[]'::jsonb,
  warnings jsonb default '[]'::jsonb,
  validated_at timestamptz default now()
);
create index on seo_validation_reports (content_type, record_id);
create index on seo_validation_reports (passed, validated_at desc);
```

---

## 4. Detailed AI Usage Logs (already exists — enhance + filter)

`ai_usage_logs` already captures `provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost, latency_ms, status, error_message, feature, user_id, created_at`. The schema is fine.

**Backend change** — make `logAIUsage` helper consistent across all SEO functions (currently some pass `"openai/gpt-5"`, others pass just `"gpt-5-nano"` — see sample query above). Normalize to `provider/model` format.

**Frontend changes** to `AdminAIUsage.tsx`:
- New "AI SEO" tab (filter `feature LIKE 'seo-%' OR feature IN ('ai-seo-enhance','auto-seo-engine','full-page-seo-audit','ai-keyword-research','meta-validator-fix','seo-auto-fix')`).
- Per-feature breakdown table: Feature | Calls | Avg Tokens | Avg Latency | Total Cost | Error Rate.
- Time-series chart: tokens & cost per day for last 30 days, grouped by feature.
- Failures table at bottom (status='error') with `error_message` truncated + click to expand.

---

## 5. Real-Time AI SEO Health Page

**New page:** `/admin/seo-health` (`src/pages/admin/AdminSEOHealth.tsx`) + new edge function `seo-health-check`.

**`seo-health-check` edge function** runs these probes in parallel and returns JSON:
- For each SEO function (`ai-seo-enhance`, `auto-seo-engine`, `full-page-seo-audit`, `ai-keyword-research`, `meta-validator-fix`, `seo-auto-fix`, `validate-seo`, `seo-competitor-cron`):
  - **Last call:** most recent `ai_usage_logs` row for that feature → status, latency, error.
  - **Last 24h stats:** total calls, error rate, p95 latency.
  - **Live ping:** lightweight `OPTIONS` request to confirm function boots (timeout 3s).
- **External deps:**
  - Firecrawl: `GET /v2/team/credits` → returns remaining credits.
  - Lovable AI Gateway: tiny `HEAD`-style call to confirm key works.
  - Supabase RLS: count `seo_validation_reports` to confirm DB writes work.

**Frontend page:**
- Header with global status traffic light (green = all healthy, amber = degraded, red = down).
- 8 function cards in a grid. Each card: name, last-call timestamp, p95 latency sparkline, error count last 24h, live boot status badge.
- "External services" row: Firecrawl credits remaining + last error, Lovable AI status + last 402/429.
- "Recent failures" table (last 50 errors across all SEO features) with `error_message`, function, time, retry button (re-invokes the function with same payload from log).
- Auto-refresh every 30s (toggle button to pause).

Hooked into admin nav under "Diagnostics" group.

---

## Build Order (so each step ships value independently)

1. **DB migrations** (safe, additive): `seo_keyword_research`, `seo_validation_reports` tables.
2. **`src/lib/seoValidator.ts`** + `validate-seo` edge function — pure logic, used by everything else.
3. **Pre-publish validation UI** in 3 editors (`AdminWriteBlog/College/Institute`).
4. **Keyword research modal** (mode selector + intent badges + save-to-record).
5. **Competitor gap report** — extend `full-page-seo-audit`, render in `AISEOSuggestions.tsx`.
6. **Normalize `logAIUsage`** + new "AI SEO" tab in `AdminAIUsage.tsx`.
7. **`/admin/seo-health`** page + `seo-health-check` function.

---

## Cost & risk notes

- Competitor scrape: +3 Firecrawl credits per full audit (~$0.003). Stays opt-in.
- Validation runs locally — zero AI cost.
- Keyword research mode reuses existing `ai-keyword-research` (gemini-2.5-flash) — same cost as today.
- Health page polls DB, not AI — zero AI cost.
- All new tables have RLS (admins manage; public read where needed for SEO render).
- No changes to `ai-seo-enhance` model selection — keeps the recent gpt-5-mini cost-optimization.

---

## Files touched (summary)

**Edge functions (new):** `validate-seo`, `seo-health-check`
**Edge functions (modified):** `full-page-seo-audit`, `ai-keyword-research`, `auto-seo-engine`, `ai-seo-enhance` (just `logAIUsage` normalization)
**Migrations:** 2 new tables + RLS
**New pages:** `src/pages/admin/AdminSEOHealth.tsx`
**New components:** `src/components/admin/CompetitorGapReport.tsx`, `src/components/admin/KeywordResearchModal.tsx`, `src/components/admin/SEOValidationSheet.tsx`
**New libs:** `src/lib/seoValidator.ts`
**Modified:** `src/components/admin/AISEOSuggestions.tsx`, `src/pages/admin/AdminAIUsage.tsx`, `src/pages/admin/AdminWriteBlog.tsx`, `src/pages/admin/AdminWriteCollege.tsx`, `src/pages/admin/AdminWriteInstitute.tsx`, `src/pages/admin/adminNav.ts`, `src/App.tsx`