# First-Party Advertisement Manager

One central system: create a promotion once in Admin, and the site decides where, how often and to whom it shows, across all current and future pages. Ads are labelled "Sponsored"/"Promoted", match the site's light-blue look, and never block page content.

## Phase 1 — Core engine and admin (this build)

**Admin → Advertisement Manager** (new page, admin-only)
- List of all ads with ID, status (Draft / Scheduled / Active / Paused / Ended), dates, priority, impressions, clicks, CTR.
- Create / Edit / Duplicate / Pause / Resume / Delete / Preview; bulk pause, resume and delete.
- Ad form: name, type (image, GIF, poster, text + CTA, image + CTA, HTML creative), separate desktop and mobile creatives with size hints (728x90, 970x250, 300x250, 336x280 / 320x100, 320x250), destination URL, CTA text, start/end dates, priority (1–10), weight.
- Targeting: page types (home, article, college, exam, tool, listing, landing, static), include/exclude URL patterns (e.g. `/blog/*`), categories, keywords matched against page title and content, device (desktop / mobile / both).
- Placement: top, after intro, mid-article, before FAQ, end of content, sidebar, sticky bottom, optional pop-up.
- Density per campaign: max ads per page, minimum paragraphs between ads, article-length rules (short articles get fewer ads).
- Frequency cap per visitor (per day / per session), stored in the browser only.

**Global settings**: master on/off, max ads per page, pages to always exclude (checkout, mock tests, auth, admin, student dashboard), pop-up allowed or not.

**Display engine (site-wide)**
- One lightweight slot component placed in the shared article, college, exam, listing, tool and home layouts, so every new page gets ads automatically.
- Article bodies get ads inserted between paragraphs according to length and density rules.
- Selection: filter eligible ads by date, status, page, device, keywords and cap, then pick by priority with weighted rotation; never the same ad twice on one page.
- Fallback to a default house ad when nothing matches; no empty boxes, no layout shift (reserved space), lazy-loaded images, `rel="sponsored"` links, hidden from search snippets.

**Tracking**
- Impressions counted when at least half the ad is visible for one second; clicks via a tracked redirect that only goes to the ad's saved URL (no open redirect).
- Optional conversion tracking when the visitor reaches a set "thank-you" path.

## Phase 2 — Analytics dashboard
- Summary cards: active ads, impressions, clicks, CTR, conversions today and over time.
- Per-ad and per-placement reports, day-wise and cumulative charts, top pages, device split, live refresh.
- Performance score per ad and simple recommendations (e.g. "low CTR on mobile — try the 320x100 creative").
- CSV export with date filters.

## Out of scope / notes
- Existing "Offer Banners" stay as they are; they can later be migrated into this system.
- No third-party ad networks; first-party promotions only.
- Pop-ups are off by default and limited to once per visitor per day if enabled.

## Technical details
- Tables: `ad_campaigns` (targeting/placement/density as structured JSON), `ad_creatives`, `ad_events` (impression/click/conversion, page path, device, date), `ad_settings`, plus a daily rollup table for fast reports. Admin-only write access via role checks; public read of active ads only through a narrow view; event inserts via a validated server function with basic rate limiting.
- Active ads cached client-side (5-min cache) so pages make one small request.
- Creatives uploaded to the existing public uploads bucket.
- Routes: `/admin/advertisements`, `/admin/advertisements/analytics`, `/api/public/ad-click/$id`.
