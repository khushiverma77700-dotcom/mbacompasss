# Admin API Key Manager

Build a database-backed secrets registry editable from the admin panel, and migrate all existing edge functions to read keys from it.

## 1. Database

New table `public.api_credentials`:
- `key_name` (text, unique) — e.g. `RAZORPAY_KEY_ID`
- `key_value` (text) — actual secret value
- `category` (text) — payments / ai / sms / seo / other
- `description` (text) — human label e.g. "Razorpay Live Key ID"
- `is_active` (boolean, default true)
- `last_used_at` (timestamptz)
- `updated_by` (uuid)
- standard `id`, `created_at`, `updated_at`

**RLS**: Only users with `admin` role can SELECT / INSERT / UPDATE / DELETE. No public read at all. Edge functions bypass RLS via service-role client.

**Audit table** `api_credential_audit`: logs every change (who, when, action, key_name, old/new value masked).

## 2. Seeding

Migration seeds rows for every key currently in Supabase Secrets, with empty values. Admin then pastes the actual values into the UI on first visit. (We can't read existing Supabase Secrets programmatically — they have to be re-entered once.)

Categories seeded:
- **Payments**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- **AI**: `OPENAI_API_KEY`, `GEMINI_API_KEY`
- **SMS / OTP**: `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `FAST2SMS_API_KEY`, `TWILIO_FROM_NUMBER`
- **SEO / Indexing**: `GOOGLE_INDEXING_SERVICE_ACCOUNT`, `GOOGLE_INDEXING_CLIENT_EMAIL`, `GOOGLE_INDEXING_PRIVATE_KEY`, `GOOGLE_PSI_API_KEY`
- **Scraping**: `FIRECRAWL_API_KEY`

(Locked-in-Supabase: `LOVABLE_API_KEY`, `SUPABASE_*`, `TWILIO_API_KEY` — these stay in env only, not exposed in admin UI.)

## 3. Edge function helper

New shared helper `supabase/functions/_shared/getCredential.ts`:
```
getCredential(name) → checks in-memory cache (60s TTL)
                    → falls back to DB lookup
                    → falls back to Deno.env.get(name)
                    → throws if missing
```
This means: if admin hasn't entered a value yet, function still works using the env var. Once admin saves a value, DB takes over. **Zero downtime migration.**

Refactor ~30 edge functions to call `getCredential('RAZORPAY_KEY_SECRET')` instead of `Deno.env.get('RAZORPAY_KEY_SECRET')`. Done in batches by category.

## 4. Admin UI — `/admin/api-keys`

Single page, accessible to anyone with `admin` role.

Layout:
- Top bar: "Add New Key" button + category filter tabs.
- Grouped cards by category (Payments / AI / SMS / SEO / Scraping / Other).
- Each row: Key name, description, value (shown in full when editing per your choice), active toggle, "Last used" timestamp, Edit / Delete buttons.
- "Add New Key" opens a dialog: name, value, category, description. Saves to DB. Immediately available to edge functions on next call (after 60s cache expiry, or manual "Refresh cache" button calls a `flush-credentials-cache` edge function).

Validation: key name must match `^[A-Z][A-Z0-9_]*$`, no spaces.

## 5. Audit log tab

Sub-tab on the same page showing recent changes: who edited what key, when, action (created/updated/deleted/activated/deactivated). Values masked in audit log (only first 4 + last 4 chars shown).

## 6. Files

```
supabase/migrations/<ts>_api_credentials.sql        (new)
supabase/functions/_shared/getCredential.ts         (new)
supabase/functions/flush-credentials-cache/index.ts (new)
src/pages/admin/ApiKeysAdmin.tsx                    (new)
src/components/admin/ApiKeyRow.tsx                  (new)
src/components/admin/ApiKeyDialog.tsx               (new)
src/App.tsx                                         (add route)
src/components/admin/AdminSidebar.tsx               (add nav link)

Refactored (replace Deno.env.get with getCredential):
- razorpay-create-order, razorpay-verify, razorpay-webhook
- send-otp, verify-otp, send-msg91-otp
- profile-analyzer, ai-blog-writer, ai-coaching-finder, ai-course-writer,
  ai-institute-writer, ai-keyword-research, ai-page-summary, ai-seo-enhance,
  ai-website-optimizer, auto-seo-engine, college-shortlister, mba-college-finder,
  meta-validator-fix, premium-profile-report, roi-calculator,
  seo-competitor-cron, generate-mock-questions, personalized-mock-generate
- google-indexing-submit, google-indexing-refresh
- pagespeed-audit
- firecrawl-scrape
```

## 7. Security notes

- Keys live in Postgres (encrypted at rest by Supabase).
- Only `admin` role can read — RLS strictly enforced.
- Edge functions use service-role to bypass RLS server-side.
- All writes audit-logged.
- Cache TTL keeps DB load low (one read per key per minute per function instance).
- Existing Supabase Secrets remain as automatic fallback — nothing breaks if a row is empty.

## 8. Out of scope

- Rotating keys with a single click (could be a v2 — would call respective provider APIs).
- Per-environment (test/live) split — single value per key for now.
- Sharing keys across multiple Lovable projects.

Once approved, I'll execute in this order: migration → helper → admin UI → batch-refactor edge functions by category.
