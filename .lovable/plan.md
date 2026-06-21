## Goal
Upgrade the AI Blog Writer (Admin → SEO & AI Tools → AI SEO Dashboard → Blog Titles → Write Blog via AI) so every generated article strictly follows your 25-point SEO + GEO + AI Search ruleset.

## Where the change happens
Single file: `supabase/functions/ai-blog-writer/index.ts`

This edge function already has a multi-step pipeline (plan → write sections → takeaways/FAQs → save). The prompts are good but don't enforce all 25 rules. The fix is prompt + validation upgrades — no schema or UI changes needed.

## What I'll change

### 1. Rewrite the master system prompt (`writerSystemPrompt`) into a strict 25-rule charter
Restructured into the exact sections from your spec:
- **Title (H1)** — 50–60 chars, primary keyword, benefit-driven, year/number/comparison
- **Meta Title** — ≤60 chars, keyword near start, different from H1
- **Meta Description** — 150–160 chars, keyword once, clear benefit
- **URL slug** — short, keyword-only, no filler words (max 5 words)
- **Intro** — first paragraph 50–80 words, primary keyword in first 100 words, states what article covers + addresses intent
- **Paragraph rules** — max 3–4 lines, one idea per paragraph, bold only for key info
- **Heading hierarchy** — H1 → H2 → H3 → H4, never skip
- **Keyword placement matrix** — Title / Meta Title / Meta Desc / URL / first 100 words / one H2 / conclusion (explicit checklist)
- **Keyword density** — 1–2% primary (15–25 mentions per 2000 words), never forced
- **Headings as user queries** — H2s phrased to answer real search questions
- **Data cadence** — a stat every 300–500 words, important numbers bolded, only recent/verified data
- **Tables** — required wherever comparing things
- **Lists** — required for any 3+ items
- **Featured-snippet blocks** — direct 1-line answer immediately under question-style H2s
- **GEO (ChatGPT / Gemini / Claude / Perplexity / AI Overviews)** — definitions, FAQ format, expert insights, comparisons, statistics
- **Entity SEO** — name relevant entities (IIM Ahmedabad, CAT, NMAT, AICTE, UGC, etc.) naturally
- **Internal linking** — 1 link per 300–500 words; placed after intro, mid-content, before conclusion
- **External linking** — 3–5 authoritative links (gov sites, official college sites, research/industry reports)
- **Images** — 3–5 images with keyword-based filenames + descriptive alt text
- **CTAs at 3 fixed positions** — after intro, mid-article, before conclusion (with the exact tone from your examples)
- **Key Takeaways section** — required just before conclusion
- **Conclusion** — 100–150 words, summary + primary keyword once + final CTA
- **FAQs** — 5–10 questions, each answer 40–80 words
- **EEAT** — phrases like "Based on placement reports…", "According to official admission data…", "Industry experts suggest…"
- **Fixed structural order** — Title → Meta → Intro → Quick Summary Table → Main H2/H3 → Stats → Images → Internal Links → Comparison Tables → Expert Insights → Key Takeaways → FAQs → Conclusion → Final CTA

### 2. Tighten the planner prompt
Force the section plan returned by the planner to mirror the fixed structural order above (Quick Summary Table, Key Takeaways, Expert Insights, About MBA Compass, Conclusion + CTA) so per-section writing can't drift.

### 3. Tighten the per-section writer prompt
- Enforce paragraph length (3–4 lines), one-idea-per-paragraph
- Require at least one stat per 300–500 words
- Require lists/tables whenever 3+ items appear
- Require 1 internal link per 300–500 words inside each section
- Require explicit `<img alt="..." src="...">` slots with keyword-based filenames at the 3 image positions
- Require the 3 CTAs at the fixed positions

### 4. Tighten the FAQ + closing prompt
- 5–10 FAQs, each answer 40–80 words (currently 8–12 / 60–120)
- Conclusion 100–150 words with primary keyword + closing CTA
- Key Takeaways block (4–6 bullets) before conclusion

### 5. Lightweight post-generation validators (server-side, non-blocking warnings)
After the article is assembled, compute and log:
- meta_title length (≤60), meta_description length (150–160)
- intro first paragraph word count (50–80)
- primary keyword count + density
- H2 count, table count, list count, image count, internal-link count, external-link count, FAQ count
- presence of Key Takeaways + Conclusion + About MBA Compass

Store these counts in the existing `ai_blog_generation_jobs.progress`/log fields so they show up in the dashboard. If any hard rule fails (e.g. meta_title > 60, FAQ count < 5), auto-trigger a single corrective re-prompt on just that piece instead of failing the whole job.

## What I will NOT change
- No DB migrations
- No changes to `AdminWriteBlog.tsx` UI
- No model swap (keeps your current OpenAI-shared-key setup)
- No new edge functions

## Risk
Prompts get longer → slightly higher token cost per blog (~10–15%). Worth it for the quality jump you described.

## After implementation
Generate one blog and we verify it satisfies all 25 rules; iterate prompt thresholds if anything misses.