## Goal
Add proper "Generate via AI" flow + "AI SEO (audit + auto-rewrite)" to the new Coaching Institute admin so the entire 35-section profile + SEO can be produced automatically and Google-rankable.

## 1. Generate via AI dialog (new)
Add a **Generate via AI** button to:
- `/admin/coaching-institutes` list (top-right next to "Add Institute")
- `/admin/coaching-institutes/:id` detail page header

Clicking it opens a dialog (`AICoachingInstituteDialog`) asking:
- Institute name *
- Website
- City + State (StateCitySelect)
- Mode (Online / Offline / Hybrid)
- Primary target keyword *
- Secondary keywords (chips)
- Exams covered (chips, defaults: CAT, XAT, NMAT, SNAP, CMAT)
- Flagship programs (chips, optional)

On submit → calls new edge function `ai-coaching-institute-generate` → on success either:
- (from list) creates institute row → redirects to its detail page
- (from detail) overwrites/merges into the current row

## 2. New edge function `ai-coaching-institute-generate`
Tool-calling JSON output that returns BOTH:
- `basic`: { name, slug, institute_type, city, state, description, website, phone, email, mode, success_rate, students_count, rating, meta_title, meta_description, keywords, primary_keyword }
- `sections`: object keyed by every `INSTITUTE_SECTIONS` id, each `{ enabled: true, data: <shape matching the field schema> }` — overview, key_highlights, courses_offered, faculty (3-5), pros_cons, why_choose, faqs (5-7), results, fees, locations, social, ctas, etc.

System prompt re-uses the strict rules from `ai-institute-writer` (MBA-only, no blanks, real ${currentYear} data, semantic HTML, primary keyword in first 100 words, 2 H2s, internal links, last-updated stamp).

Model: `google/gemini-2.5-flash` (cost-balanced, matches existing institute writer).

## 3. AI SEO button (audit + auto-rewrite)
New **"Run AI SEO"** button in the editor header (next to Save). Opens `AISeoInstitutePanel`:

Step A — Audit (calls existing `auto-seo-engine` with `mode: "full_audit"`, `contentType: "institute"`, `pageId`).
Shows scorecard: title, meta, URL, keyword placement, content score, E-E-A-T, image audit (re-uses `seoValidators.ts` chips like `SeoEnhanceFields`).

Step B — Auto-rewrite weak sections.
Iterates over enabled prose sections (overview, why_choose, methodology, results, fees, etc.). For any section whose body text scores below 70 in `scoreContent` OR fails keyword placement, calls a new edge function `ai-coaching-institute-rewrite-section` which rewrites just that section's HTML with primary keyword + freshness + semantic structure. Updates `sections[id].data` in place and saves. Also runs `mode: "faq_generate"` to refresh FAQ schema.

Live progress list shows each section with status (Skipped / Rewriting / Improved score).

## 4. Files

**New**
- `supabase/functions/ai-coaching-institute-generate/index.ts` — full profile generator
- `supabase/functions/ai-coaching-institute-rewrite-section/index.ts` — single-section rewriter
- `src/components/admin/AICoachingInstituteDialog.tsx` — pre-generation brief dialog
- `src/components/admin/AISeoInstitutePanel.tsx` — audit + auto-rewrite panel

**Modified**
- `src/pages/admin/AdminCoachingInstitutes.tsx` — add "Generate via AI" button
- `src/pages/admin/AdminCoachingInstituteDetail.tsx` — add "Generate via AI" + "Run AI SEO" buttons in header
- `src/lib/instituteSections.ts` — export helper `mergeGeneratedSections(existing, generated)` used by both flows

## Notes
- No DB migration needed — `institutes.sections` JSONB and `institute_courses` already exist.
- Re-uses `auto-seo-engine` so SEO rules stay identical to the college SEO engine.
- All AI calls go through `callAIGateway` and log via `logAIUsage`.