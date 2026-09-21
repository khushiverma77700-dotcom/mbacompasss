# AI Blog Writer: reference-first research + Summary → Contents → Article

## 1. Reference Links (highest-priority sources)

**In the writer form (`/admin/seo/write-blog`)**
- New "Reference Links" box where one or many URLs are pasted (one per line or comma separated).
- Each valid link becomes a chip that can be removed; invalid text is rejected with a clear message.
- The links are saved with the rest of the brief draft, so they survive a page refresh.

**During research**
- Before any writing starts, every pasted link is read and its text extracted (via the already-connected Firecrawl reading service).
- Facts, statistics, dates, fees, rankings, cutoffs and definitions must come from these links first. They are labelled "primary sources" in the writing instructions and ranked above everything else.
- Extra searching happens only when the pasted links do not cover the topic (or none were given). Any extra source is fetched from trusted MBA/official sources and clearly recorded.
- The finished job reports which sources were used: each pasted link (read / could not be read) plus any additional source and the tool that found it. This appears in the admin result panel.
- Unverified numbers stay out: the instructions forbid inventing or estimating any figure, and anything not present in the sources or our own verified database must be written around, not guessed.

## 2. New article structure

Every generated article is assembled as:

```text
Summary  →  Table of Contents  →  Full article
```

- **Summary**: a standalone opening block answering the topic in 60-90 words (label is always "Summary").
- **Table of Contents**: generated automatically from the real H2/H3 headings after writing, with clickable links that jump to the matching heading (stable anchor ids added to every heading).
- **Full article**: existing deep sections, tables, FAQs and CTA, unchanged in quality rules.
- Dates, percentages, rupee amounts, percentiles, ranks and package figures inside paragraphs and lists are automatically bolded so key data stands out, without bolding whole sentences.
- Clean, light styling for the contents box consistent with the site theme.

## Technical notes

- New shared helper `supabase/functions/_shared/referenceResearch.ts`: scrapes reference URLs through `firecrawlGateway`, optional supplemental `firecrawlSearch`, returns a source report plus a prompt block that pins source priority and the no-unverified-data rule.
- New shared helper `supabase/functions/_shared/blogStructure.ts`: heading id injection, table-of-contents builder, key-fact bolding, and final `Summary → TOC → content` assembly.
- `supabase/functions/ai-blog-writer/index.ts`: `referenceUrls` added to the brief; research runs in the outline phase and is cached on the job; the reference block is appended to the outline, section, closing and single-shot prompts; structure/bolding applied right before the article is saved; the source report is returned in job stats.
- `src/pages/admin/AdminWriteBlog.tsx`: Reference Links field, validation, persistence, `referenceUrls` in the request, and a "Sources used" list in the result panel.
- `src/styles.css`: `.blog-toc` styling.
