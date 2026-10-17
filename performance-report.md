# Performance and content quality — October 17, 2026

## Measured published baseline
- Lighthouse mobile: Performance **37**, SEO **100**.
- LCP: **8.03 seconds**; CLS: **0**; total blocking time: **1.32 seconds**.
- Homepage JavaScript script/preload inventory: **1,254,786 bytes raw / 392,562 bytes gzip** (52 assets). This is not the total application bundle.

## Measured asset changes
| Assets | Before | After | Reduction |
|---|---:|---:|---:|
| 21 city/WhatsApp images | 2,360,228 bytes | 2,086,162 bytes | 11.6% |
| Four retained student font files | 282,268 bytes | 100,532 bytes | 64.4% |

Fonts are self-hosted with swap and at most two weights per family. The unused intermediate Manrope weight and unused font packages were removed. Ads and editorial enrichment now import after first interaction, as does analytics; unnecessary motion imports were removed from comparison/CTA sections. Native route splitting is already enabled; homepage sections retain lazy boundaries and real server HTML.

## Content and checks
- Removed unsupported student/review/rating/conversion claims and fabricated topper examples from the homepage.
- Replaced independent fee/cutoff/ROI tables with original-preferred college facts, also used by detail pages. IIM Ahmedabad fee reads ₹27,50,000 in both.
- Closed registrations/exams are excluded; upcoming dates sort first using Indian calendar days; timeline refreshes by current month.
- Verified 390px and 1280px homepage rendering, college navigation, zero page errors/overflow and intrinsic dimensions on every homepage image. Eleven rule/regression tests pass.

## Not yet established
There is no production bundle output in this preview. A production-only plugin emits `bundle-report.json` (raw/gzip sizes, static/dynamic imports) for an honest after-publication comparison. Development-module sizes and local development Lighthouse scores are not substitutes for optimized production results.

Performance 90+, SEO 90+, LCP below 2.5 seconds and CLS below 0.1 remain targets, not verified outcomes. Re-run mobile Lighthouse on the published update. Existing database uploads and every remaining route have not all been converted/audited; no destructive database media migration was performed.