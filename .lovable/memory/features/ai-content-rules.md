---
name: AI Content Generation Rules
description: Shared rules for every long-form AI generator — banned buzzwords, mandatory MBA Compass section, Summary (not Quick Summary) label
type: feature
---

All long-form AI writers (`ai-blog-writer`, `ai-college-writer`, `ai-college-section`, `ai-institute-writer`, `ai-course-writer`, `generate-news`) import `MBA_COMPASS_SECTION_RULES` from `supabase/functions/_shared/aiContentRules.ts` and append it to their system prompt.

The shared rules enforce:
1. **Mandatory "About MBA Compass" H2 section** (120-180 words, after FAQs, before final CTA, 2-3 internal links from /mba-compass, /college-shortlister, /profile-analyzer, /mba-roi-calculator, /compare, /mocks). Required on every blog, college page, exam page, institute page, course page, guide, news article and resource article.
2. **Expanded AI-buzzword blacklist** — zero tolerance for "delve", "unlock", "navigate", "landscape", "elevate", "transformative", "tapestry", "stands as a", "plays a pivotal role", "a myriad of", "in essence", "world-class", "robust", "leverage", "synergy", etc.
3. **Terminology** — never write "Quick Summary" / "TL;DR"; use "Summary" only. `ai-blog-writer` also runs a post-processing regex in `stripExternalLinks` that rewrites any stray "Quick Summary" → "Summary".

When adding a new long-form AI generator, import `MBA_COMPASS_SECTION_RULES` and append it to the system message.
