## Phase 1: Auto-SEO Engine (Edge Function)
Create a new `auto-seo-engine` edge function that:
- Accepts a page/content type and generates short-tail + long-tail keywords based on content
- Generates unique meta titles (≤60 chars) and descriptions (150-160 chars) ensuring no duplicates
- Suggests internal linking opportunities
- Identifies content gaps vs competitors
- Returns structured data for both dashboard display and auto-insertion

## Phase 2: Frontend Keyword Display Component
- Create a `PageKeywords` component that renders AI-generated keywords beautifully at the bottom of each public page
- Pull keywords from site_settings SEO snapshots
- Display as styled tag clouds organized by short-tail vs long-tail

## Phase 3: Dashboard Enhancements
- Add "Auto-Generate All" button that bulk-processes all pages
- Uniqueness checker for meta titles/descriptions across all pages
- Content gap analysis section
- Internal linking suggestions panel
- User intent analysis display
- Content format recommendations (FAQ, video, guide)

## Phase 4: Daily 6 AM Competitor Auto-Analysis
- Create `seo-competitor-cron` edge function
- Set up pg_cron + pg_net for daily 6 AM execution
- Predefined competitors: Shiksha, Collegedunia, Careers360, MBAUniverse, InsideIIM, PagalGuy
- Store analysis results in site_settings
- Dashboard section showing comparison + one-click "Implement" actions

## Phase 5: UX & Performance Audit
- Page speed analysis integration
- Mobile usability checks
- Core Web Vitals monitoring section in dashboard
