---
name: Mocks Landing Page
description: /mocks is a high-converting CAT mock test sales page; all content managed via admin
type: feature
---
The `/mocks` route is a conversion-focused landing page (not a listing). All content (hero, pricing, urgency, benefits, comparison, testimonials, FAQs, Meta Pixel ID, SEO) is managed in the admin at `/admin/mocks-landing`, backed by the singleton `mocks_landing_settings` table.

Key behaviours:
- Hero "Get Instant Access" CTA scrolls to pricing section (sticky on mobile too).
- "Buy Now" CTAs open `MockCheckoutDialog` for the test selected in `cta_target_test_id` (falls back to latest published mock).
- Meta Pixel events fired: PageView + ViewContent on load, AddToCart on scroll-to-pricing, InitiateCheckout on Buy Now click, Purchase on `/mocks/thank-you`.
- After successful payment, `MockCheckoutReturnPage` redirects to `/mocks/thank-you?test=<slug>` which fires Purchase + shows Profile Analyzer & College Shortlister upsells.
- Countdown timer on hero card uses `offer_ends_at`; auto-hides when expired.
