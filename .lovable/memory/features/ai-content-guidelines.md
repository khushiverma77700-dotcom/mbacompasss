---
name: AI Content Generation Guidelines
description: Mandatory rules for all AI-generated content (blogs, college/exam/resource pages) — mentor voice, banned phrases, SEO, internal links, data tables, structure, MBA Compass brand section
type: feature
---

# AI Content Generation Guidelines (B School Buzz)

Applies to EVERY AI-generated content surface: ai-blog-writer, ai-edit-content, college pages, exam pages, resource pages.

## Voice
- Senior MBA mentor talking 1-on-1 to an Indian aspirant. Warm, direct, practical. Use "you/your". Contractions OK. 8th-grade English.
- BANNED phrases (zero tolerance): unlock, delve/delve into, landscape, navigate/navigating, furthermore, moreover, in today's fast-paced world, in the realm of, embark on a journey, ever-evolving, it's worth noting, look no further, stay tuned, dive into, unleash, harness the power, game-changer, cutting-edge, world-class, robust, leverage, synergy, paradigm, seamless, holistic, in conclusion, to sum up, as we all know, needless to say.

## SEO
- Primary keyword in title, slug, H1, meta title (≤60 chars), meta description (140-160 chars), first 100 words, ≥1 H2, closing paragraph. Density ~0.8-1.2%.
- 8-12 secondary/LSI keywords woven naturally.
- Heading hierarchy: H1 (page) → H2 → H3 → H4 only when needed. No H5/H6.
- FAQs: 8-12 PAA-style Q&A, answers 60-120 words.

## Internal linking
- 2-4 contextual links per H2; 8-15 per article. Anchors are descriptive entity names — never "click here"/"read more".
- URL patterns: /college/<slug>, /exams/<slug>, /blog/<slug>, /category/<slug>, /colleges-in/<city>, /coaching, /college-shortlister, /profile-analyzer, /mba-roi-calculator, /mba-compass, /mocks, /compare, /ai-coaching-finder.
- External authority sources cited as plain text with `[src:Source Year]` marker — no external <a> tags, no bare URLs.

## Topic focus
- Title is the scope fence. Every paragraph must serve the search intent. No history dumps, no generic "What is an MBA?", no padding ("As we've seen…", "It is important to note…").

## Data-driven
- Every H2 carries ≥1 real number (NIRF rank, cutoff, fees INR, package, %, dates, recruiters).
- ≥4 tables per article. Templates: college comparison, exam comparison, fees & placement, eligibility, important dates, course details, year-on-year trends.
- No "N/A", "—", "varies", "contact for details". Use tight realistic ranges + [src:…].
- Units consistent: INR LPA / lakh / crore, "98.5 %ile".

## Readability
- Paragraphs 2-3 sentences (~40-60 words). Break long H2s with H3/H4.
- Convert any 3+ item enumeration into list/table.
- Bold lead 2-4 words of important paragraphs and key numbers.
- Mobile-first: no nested tables, ≤6 columns.

## Personalization
- Indian MBA aspirants, students, working professionals (1-7 yrs exp).
- Segment-aware: freshers vs work-ex, engineers vs non-engineers, female (diversity), repeaters, GEM pool, NC-OBC/SC/ST/EWS, Tier-1 vs Tier-2.
- 2-3 named-persona worked examples per article.
- Explain every MBA term plainly on first use (PGP, PPO, GD-PI-WAT, %ile, NIRF, ROI, summers, finals).
- Address common doubts inside the relevant section, not as a separate Myths block.

## Article structure (fixed order)
1. Introduction (Quick Summary <p> + 2-3 hook paragraphs)
2. Key Highlights (6-10 bullets, bold lead + data point)
3. Detailed Explanation (5-10 H2 sections)
4. Comparison Tables (when applicable)
5. Important Data & Statistics
6. FAQs (H2 "Frequently Asked Questions")
7. **About MBA Compass** (H2, 120-180 words, educational not promotional) — MANDATORY on every article. Explains: what MBA Compass is (MBA discovery/decision platform by B School Buzz), how it helps shortlist colleges + analyze profile + compare + mock prep, and the financial-decision angle (fees, ROI, packages, long-term wealth from the MBA decision). Ends with 2-3 internal links from /mba-compass, /college-shortlister, /profile-analyzer, /mba-roi-calculator, /compare, /mocks.
8. Conclusion + CTA

## Implementation
Enforced in `supabase/functions/ai-blog-writer/index.ts` → `writerSystemPrompt()` and the closing-chunk prompt/schema (`aboutCompassHtml` field).
