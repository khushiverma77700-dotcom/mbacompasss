# Redevelop the AI Blog Writer — topic-locked, humanized, verified

Applies to the writer reached from Admin → Articles (`/admin/seo/write-blog`). Finished drafts still save into Articles; nothing publishes without the checklist passing.

## 1. Simpler brief form (Step 1)
Fields: Blog Title, Primary Keyword, Secondary Keywords, Target Word Count (500 / 1,000 / 1,500 / 2,000 / Custom), Keyword Density %, Target Audience, Search Intent (auto-detected, editable), Additional Instructions, Reference / Source URLs (many), Sample Blogs (paste text or URLs, many).

## 2. New 12-phase pipeline (background job, progress shown live)
1. Understand title + detect intent (informational / comparison / navigational / transactional).
2. Build a **Topic Boundary**: Must Include / Can Include / Must Not Include, plus the exact list of allowed entities (e.g. the 22 IIMs). Shown to the admin and saved with the job.
3. Read reference URLs (existing Firecrawl reader), extract headings, tables and facts with source attribution.
4. Analyze sample blogs for style only (tone, paragraph length, heading pattern, table use) — produces a style profile; sample sentences are never passed to the writer verbatim.
5. Collect facts into a fact sheet; each fact tagged with its source. Only search the web when sources are thin.
6. Outline chosen by intent (no fixed template).
7. Write section by section, constrained to the boundary, fact sheet and style profile.
8. Accuracy check: every number/date/name compared to the fact sheet; unsupported ones are removed or flagged.
9. Humanization pass: vary sentences, remove banned phrases, repetition and filler.
10. SEO analysis.
11. Issue list.
12. Admin fixes issues, then Ready to Publish.

Entity guard: after writing, any college/exam name not in the boundary's allowed list is flagged and removed by the editor pass (stops XLRI/SPJIMR appearing in an IIM fee article).

## 3. Language rules
Banned list expanded (In today's competitive landscape, It is important to note, Let's dive in, In conclusion, Key Summary, Snapshot, Quick Snapshot, Key Takeaways, Unlock, Delve, Comprehensive guide, Whether you are...). The current cleanup that renames "Key Highlights" to "Snapshot" is removed. Opening block stays labelled "Summary" only where it suits the structure.

## 4. Workspace after generation — one simple toolbar
Generate Blog · Analyze SEO · Fact Check · Humanize · Fix Issues · Fix All Issues · Preview · Publish

Score strip: SEO /100 · Content Quality /100 · Humanization /100 · Accuracy /100 · Keyword Density (actual vs target, Good / Too Low / Too High).

- **Analyze SEO**: 16-part breakdown (intent match, keyword use, density, title, meta title/description, headings, depth, readability, internal links, external references, FAQ, alt text, slug, originality, freshness). Density/length/heading parts computed in code; judgement parts by AI.
- **Content Quality**: relevance, accuracy, humanization, readability, unnecessary content, repetition, factual confidence, completeness.
- **Issues** listed with exact explanation and a **Fix This** button; **Fix All Issues** applies safe fixes only (never invents facts).
- **Fact Check**: lists claims with status Verified / Source-supported / Potentially outdated / Needs manual review, with the source.
- **Internal links**: suggestions from real MBA Compass pages (anchor, target, suggested location); admin accepts each.
- **Sources list**: only URLs actually read; no fabricated links.
- **Preview**: H1, meta title/description, slug, article, tables, FAQs, links, references — all editable.
- **Publishing checklist** (topic relevance, intent, accuracy, freshness, no random colleges/stats, no stuffing, density, meta, headings, links, FAQ, readability, originality, completeness). Publish is enabled only when it passes; otherwise "Save as draft".

## Technical details
- `supabase/functions/ai-blog-writer/index.ts`: new phases `understand → boundary → research → style → facts → outline → sections → verify → humanize → finalize`, state stored in job stats; brief gains `audience`, `searchIntent`, `instructions`, `sampleBlogs`, `targetWords`. Uses the existing project AI helper (`_shared/aiGateway.ts`) per the key policy.
- New shared modules: `_shared/topicBoundary.ts`, `_shared/styleProfile.ts`, `_shared/blogHumanizer.ts` (banned phrases + repetition), `_shared/entityGuard.ts`.
- New edge function `ai-blog-editor` with actions `analyze_seo`, `fact_check`, `humanize`, `fix_issue`, `fix_all`, `internal_links`; deterministic scorer in `_shared/blogSeoScore.ts`.
- `deAiify` "Snapshot" renames removed from the writer.
- UI: `AdminWriteBlog.tsx` rebuilt into Brief → Generating → Workspace (toolbar, score strip, issues, fact check, preview editor, checklist); Publish inserts into `articles` with `is_published` only when checklist passes.
- Draft workspace saved on the job row so a refresh does not lose work.
