# Smart Auto-Delivery for Advertisements

Goal: in Admin → Advertisement Manager, you enter only **how many views you want** (and optionally by when). The system then decides on its own where, when and to whom the ad shows, speeds up if it falls behind, and never slows the website down.

## What you will see in Admin

- A new **"Smart mode"** switch on each ad (on by default for new ads).
  - When on, you fill in only: creative, destination link, **target views** (e.g. 50,000) and an optional end date.
  - Manual page types, placements, keywords and device settings are hidden and handled automatically. You can still add exclusions (e.g. never on checkout pages).
- A **goal progress panel** per ad:
  - Views delivered vs target, with a progress bar.
  - Expected finish date at the current speed ("On track", "Behind — boosting", "Ahead — easing off", "Goal reached").
  - Where the views are coming from: top pages, page types, placements, mobile vs desktop.
  - Clicks and click rate for each placement, so you can see which spots work best.
- A plain-language **"What the system is doing"** note, e.g. "Most visitors are on article pages on mobile today, so this ad is shown more in mid-article spots."

## How the smart delivery works

1. **Goes where visitors are:** every few minutes the system looks at the last 7 days of real visits and ad views. Pages, page types and placements with more visitors get more of this ad.
2. **Learns what works:** placements and pages with a better click rate get a higher share. Weak spots still get a small share so the system keeps learning.
3. **Keeps pace with the goal:** it works out how many views are needed per day to hit the target by the end date.
   - Behind schedule: the ad's priority rises and it is allowed into more slots.
   - Ahead of schedule: it eases off so it doesn't finish too early.
   - No end date: it delivers steadily until the target is reached, then stops by itself.
4. **Respects visitors:** per-visitor limits (how often one person sees it) stay on, and the same ad never repeats on one page, so the push for more views doesn't annoy people.
5. **Shares fairly:** when several smart ads compete, the one furthest behind its goal gets the slot first.

## Keeping the site fast

- All the heavy thinking happens on the server on a timer, not in the visitor's browser.
- Visitors receive one small, pre-computed list of "where each ad should go" with the existing 5-minute cache — no extra loading.
- Ad spaces keep their reserved size, so nothing jumps while the page loads.

## Technical details

- Migration: add `smart_mode bool`, `goal_end_at timestamptz`, `smart_plan jsonb` (per page type/placement/device weights, boost factor, needed-per-day, status, explanation, updated_at) to `ad_campaigns`.
- Database function + pg_cron job (every 10 min) aggregates `ad_events` (impressions/clicks by page_path type, placement, device, last 7 days) and writes `smart_plan`. Exploration floor ~10% per placement; boost = clamp(needed_rate / actual_rate, 0.5, 3).
- `engine.ts`: for smart ads, eligibility ignores manual page_types/placements/keywords (keeps exclusions, caps, schedule); score = priority × weight × plan weight(pageType, placement, device) × boost; goal tracked through existing `impression_budget` + even pacing to `goal_end_at`. Unit tests: behind-goal ad wins slot, goal-reached ad stops, exclusions still apply, caps still apply.
- `AdminAdvertisements.tsx`: Smart mode form section, goal progress panel and breakdowns from existing analytics data.
