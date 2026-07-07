# Deep SEO Audit + Approval + Live Injection

Turn `/admin/pages/cat-mock-1` into a real, multi-step AI-driven audit that ends by publishing approved changes to the live page.

## Flow the user will see

```
1. Read page content       ──►  fetch HTML, extract title/desc/H1/body/links/images
2. Web research            ──►  Firecrawl search: "CAT mock test", SERP top 10, related
3. Competitor analysis     ──►  scrape top 3 SERP results, extract their title/H1/topics
4. Keyword gap             ──►  Lovable AI diff (our page words vs competitor corpus)
5. SEO checklist           ──►  same rule set as SEO Dashboard (title/desc len, kw density,
                                 H1/H2, alt text, OG/Twitter, JSON-LD, canonical, wc, links)
6. Proposed changes        ──►  Lovable AI writes new title, meta description, H1, intro
                                 paragraph, FAQ additions, JSON-LD, OG tags, keywords list
7. Review + approve        ──►  side-by-side diff, per-field accept/reject, one-click Approve
8. Publish live            ──►  writes to page_seo_overrides row; page reads it and renders
```

Each step streams a status card (pending → running → done/failed) with its findings.

## Data model

New table `page_seo_overrides` (one row per page slug):

- `slug` (pk, e.g. `cat-mock-1`)
- `title`, `description`, `h1`, `intro_html`, `og_image`
- `keywords` (text[]), `faq` (jsonb), `json_ld` (jsonb)
- `applied_at`, `applied_by`, `source_audit_id`
- RLS: `authenticated` read, admin write (via `has_role`)

New table `page_seo_audits`:

- `id`, `slug`, `status`, `steps` (jsonb — per-step logs), `checklist` (jsonb),
  `competitors` (jsonb), `keyword_gap` (jsonb), `proposal` (jsonb — the writable fields),
  `approved` (bool), `created_by`, `created_at`
- RLS: admin-only.

## Backend

Edge function `deep-seo-audit` (new):

- `POST { slug, targetKeyword }` → creates audit row, kicks off `EdgeRuntime.waitUntil`.
- Streams progress by updating `steps` jsonb after each stage (client polls every 2s).
- Step 1: fetch `${SITE_URL}/${slug}` HTML, parse with `deno-dom`.
- Step 2/3: Firecrawl `/v2/search` for the keyword (top 10), then `/v2/scrape` on top 3
  competitors (markdown only). Firecrawl connector required — will prompt to link.
- Step 4: Lovable AI (`google/gemini-2.5-flash`) prompt: "given our text and competitor
  corpus, list missing keywords/topics".
- Step 5: run existing checklist logic (same as `AdminPageSEOReview.tsx` analyze()).
- Step 6: Lovable AI generates full proposal JSON (strict schema) targeting the checklist
  gaps + keyword-gap terms, honoring keyword density ≤ 3%.
- Marks audit `status = ready_for_review`.

Edge function `apply-seo-override` (new):

- `POST { auditId, accepted: {...} }` — admin-guarded, writes selected fields into
  `page_seo_overrides` and flips `page_seo_audits.approved = true`.

## Frontend

Rewrite `src/pages/admin/AdminPageSEOReview.tsx`:

- "Run deep audit" button starts edge function, then polls the audit row.
- Renders 5 step cards with live status + expandable findings.
- Renders a "Proposed changes" panel with per-field checkboxes and current vs proposed diff
  (title, description, H1, intro, keywords, FAQ, JSON-LD, OG image).
- "Approve & publish" calls `apply-seo-override`; on success shows "Live on /cat-mock-1".

Update `src/pages/CatMock1Page.tsx`:

- On mount, fetch `page_seo_overrides` row where `slug = 'cat-mock-1'`.
- If present, override the `<Helmet>` title/description/OG/JSON-LD and the visible H1 /
  intro paragraph / FAQ items / keywords with the stored values (fallback = current
  hardcoded content).
- Ensures approved changes go live instantly without a redeploy.

## Connectors and secrets

- **Firecrawl** — required for search + competitor scrape. Trigger
  `standard_connectors--connect` for `firecrawl` in the same turn.
- `LOVABLE_API_KEY` — already present.
- No new user-entered secrets.

## Files touched

- `supabase/migrations/…_page_seo_overrides.sql` (2 tables, RLS, grants)
- `supabase/functions/deep-seo-audit/index.ts` (new)
- `supabase/functions/apply-seo-override/index.ts` (new)
- `src/pages/admin/AdminPageSEOReview.tsx` (rewrite around the new flow)
- `src/pages/CatMock1Page.tsx` (read + apply override)

## Out of scope for this pass

- Semrush-backed keyword volumes (can be added later via the Semrush connector).
- Applying overrides to pages other than `/cat-mock-1` (the schema supports it; UI wires
  only the one slug for now).

Confirm and I'll build it end-to-end.