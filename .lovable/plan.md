# Authority-led course sales page

## What will change
- Recompose the course header into a sales-focused offer area with a clear value proposition, factual proof metrics, and a sticky enrollment panel.
- Strengthen the page flow around product evidence: dashboard preview, included benefits, mock coverage, learning path, and objections.
- Add a polished text-testimonial section using existing approved testimonial data where suitable; hide it when credible testimonials are unavailable rather than inventing claims.
- Repeat the enrollment action at natural decision points and add a compact mobile purchase bar without changing login, phone verification, payment, enrollment, compare, or brochure behavior.
- Apply the locked light Sky/Emerald palette and Sora/Manrope typography only to course detail pages.

## Technical details
- Refactor `MBACompassCourseDetailPage` into smaller presentation helpers while preserving its current queries and Razorpay flow.
- Reuse the existing Button, Card, Badge, Accordion, dashboard showcase, and semantic design tokens.
- Add page-specific metadata for the course detail route.
- Keep all rendered claims conditional on real course fields and linked mock data.

## Verification
- Check the target course at desktop and mobile sizes.
- Confirm enrollment, compare, brochure, dashboard carousel, FAQ, and sticky mobile action remain usable.
- Check the preview for visual overlap, console errors, and current build status.