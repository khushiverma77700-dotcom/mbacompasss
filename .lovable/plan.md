# AI Exam Page Builder + Universal Exam Template

Goal: in Admin → Colleges & Exams → Exams, add an "AI Create Exam" flow where you type only the **exam name + year** (plus optional official website / notes) and AI generates a complete, modular exam page. The public page `/exam/:slug` is rebuilt as one reusable premium template that renders only the modules the exam actually has.

## What you'll get

**Admin (`/admin/exams`)**
- New primary button: **AI Create Exam**. Dialog inputs: Exam Name, Year, optional official website, optional exam category (Management / Engineering / Law / Govt / Other — auto-detected if blank), optional extra instructions.
- Live generation console (same style as other AI dashboards): per-section progress rows (Hero → Quick Answer → Highlights → Dates → Overview → Eligibility → Registration → Fees → Pattern → Marking → Syllabus → Papers → Difficulty → Preparation → Cutoffs → Colleges → Counselling → Admit Card → Exam Day → Result → Comparisons → Updates → FAQs → SEO), with status, tokens used and errors. Runs in background — closing the browser does not kill it; reopening resumes the view.
- Result opens a **section-by-section review editor**: every generated block is editable (rich text / table rows / date rows / FAQ list), each with a "Regenerate this section" button. Save as Draft or Publish.
- Existing exams get an **Enrich with AI** action that fills only missing modules and leaves existing content untouched.

**Public exam page (`/exam/:slug`)**
Rebuilt template following your flow: hero (logo, name, year, full form, status pills, metadata row, 2 CTAs, Last updated) → Quick Answer box → highlight cards → Important Dates table → sticky TOC + sticky sidebar (desktop) → all content modules → colleges/institutes modules placed at the 4 logical points (after Overview, after Pattern, after Cutoff, after Result) → comparisons → FAQ accordion → Related searches / Related exams → Sources & editorial box. Mobile: cards, accordions, horizontally scrollable tables (reusing the existing table-slider hook), sticky bottom CTA bar. Any module without data is hidden, never shown empty.

Interactive tools (Score/Percentile/Rank/College predictor) are surfaced as links to the existing calculators and shortlister — no new calculators are built in this pass.

## Data & accuracy

- Research step uses Firecrawl restricted to the official exam domain (+ conducting body domain) so figures come from the latest official notification; sources captured per section and shown in the Sources box.
- Anything not confirmed by a source is left blank and the module hides — no "TBA" placeholders (consistent with existing site rule).
- Content rules reused: no external links in body content, no AI buzzword list, mandatory "About MBA Compass" section, "Summary" wording.

## Technical outline

1. **Migration**: add `exams.exam_year int`, `logo_url text`, `official_website text`, `status text`, `registration_status text`, `reviewed_by text`, `sources jsonb`, `sections jsonb` (the modular payload: quick_answer, highlights, dates, overview, eligibility, registration, fees, pattern, marking, syllabus, resources, papers, difficulty, preparation, cutoffs, counselling, admit_card, exam_day, centres, result, comparisons, updates, related). New table `exam_generation_jobs` (exam name, year, status, step, log jsonb, result jsonb, error) with GRANTs for `authenticated` + `service_role`, RLS admin-only via `has_role`.
2. **Edge functions**: `ai-exam-writer` (per-section generation, Firecrawl-grounded, `_shared/aiGateway.ts` + `MBA_COMPASS_SECTION_RULES`, admin-guarded) and `exam-generation-worker` (queue drain + self-kick, mirroring `master-refresh-worker`), so jobs survive a closed browser.
3. **Admin UI**: `src/components/admin/ExamAIGenerator.tsx` (dialog + live console via job polling) and `src/components/admin/ExamSectionsEditor.tsx` (modular review/edit), wired into `AdminExams.tsx`.
4. **Public template**: `src/pages/ExamDetailPage.tsx` rewritten to render `sections` through small module components in `src/components/exam/` (HeroBlock, QuickAnswer, HighlightCards, DatesTable, ModuleSection, CollegeModule, FaqAccordion, SourcesBox, StickyTocSidebar, MobileCtaBar). Uses existing `useScrollableTables`, `aiContentEnhancer`, `LastUpdatedBadge`, semantic tokens only.
5. **SEO**: title `[Exam] [Year]: Dates, Syllabus, Pattern, Eligibility & Cutoff`, self-referencing canonical on `/exam/:slug` (year stays on the same URL — no duplicate year URLs), JSON-LD WebPage + BreadcrumbList + FAQPage + ItemList, exam routes already in the sitemap/SSR pipeline so prerendering picks up the new HTML.

## Out of scope for this pass
New score/rank/percentile calculators, exam-centre live availability data, and per-exam infographic image generation (hooks are left in the schema so they can be added later).
