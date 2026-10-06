# Refine AI Blog Writer output and keyword bank

## Changes
- Treat supplied links and uploaded documents as private research inputs: use their verified facts without repeatedly naming sources in article prose. Keep source attribution, excerpts, and figure checks inside the admin workspace.
- Enforce richer article composition: concise opening answer, substantive paragraphs, comparison tables where data supports them, useful bullet lists, an FAQ section, an opening overview, and a closing practical-points section.
- Remove the words “Summary”, “Key”, and “Snapshot” from generated headings, labels, fallback copy, quality checks, and post-processing. Existing generated drafts will be cleaned when the editor’s Humanize/Fix tools rewrite them; new drafts will follow the rule automatically.
- Strengthen deterministic formatting so dates, fees, percentages, ranks, percentiles, packages, counts, and other concise high-value facts are bolded without bolding whole sentences.
- Generate a deduplicated bank of 100–200 closely related short-tail, long-tail, and question keywords for every new article. Save the full bank in the article’s SEO keywords and show it in the admin workspace.
- Publish only a smaller, curated set of natural related searches at the end of the reader-facing article, avoiding a 100–200-term public keyword dump and keyword stuffing.
- Update the writer’s quality checks so required paragraphs, tables, lists, FAQs, important-points section, banned labels, and keyword-bank size are measured before publishing.

## Technical details
- Update the writer prompts and fallbacks in `supabase/functions/ai-blog-writer/index.ts` and shared planning/structure rules.
- Add deterministic source-label cleanup and broader data highlighting in the shared article structure pass.
- Extend the editor workspace to load and display the saved keyword bank.
- Keep all source URLs available for admin fact and figure review; do not fabricate search-demand metrics when Semrush data is unavailable.
