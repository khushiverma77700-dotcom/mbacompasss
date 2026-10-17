# Roadmap

## Core Web Vitals and homepage quality — October 17
- [ ] Measure current delivery/bundle baseline and implement safe image, font and deferred-script improvements
- [ ] Remove unsupported homepage claims, comparison badge typo and independent college statistics
- [ ] Share dynamic upcoming-exam filtering and current-month timeline rules, with tests
- [ ] Verify homepage on mobile/desktop and report bundle/performance measurements honestly

## Public structure and structured data — October 17
- [x] Standardise college/exam/tool URLs with permanent legacy redirects; audit literal internal navigation, preserve valid student routes
- [x] Verify custom missing-page HTTP 404 responses for unknown pages and unknown college records
- [x] Generate build sitemaps from the public prerender manifest: 5,177 selected public URLs in six child sitemaps plus index; real content dates only; update robots exclusions
- [x] Align Organization/WebSite, article/college/visible-FAQ and breadcrumb markup; visible article attribution and public breadcrumbs
- [x] Verify clean filtered canonical URLs, public tool navigation, article bylines and single primary schemas; 19 focused tests pass
- [ ] Confirm updated redirects, search tags and all generated HTML files on the live site — requires publishing; preview does not establish published output

## Requested monitoring corrections — October 17
- [x] Prepare long articles before requests — 188 prepared, 170 remain published; trigger covers every writer, source/token checks protect concurrent edits; 17 tests and draft lifecycle verification pass. Preview returns full largest-article HTML in 0.67–0.74s; published runtime needs deployment.
- [x] Restore fresh public content after static-page hydration (background refresh and route revalidation; browser confirms updated college heading)
- [x] Preserve Smart-mode ad end dates (five schedule tests pass); signed-in save verification awaits a preview account

## Public crawlability and static HTML
- [x] Audit all 5,223 live college URLs: 5,219 return full content; four fail on malformed optional lists. Shared normalization fixes all four in preview; ten tests pass.
- [ ] Confirm four corrected pages on the live site after publishing — no publish was requested
- [x] Enumerate requested public routes and published dynamic records for capped native prerendering (5,174 selected; redirect aliases excluded)
- [x] Prefetch requested public content and supply unique route metadata; remove meta keywords
- [x] Verify crawler-visible HTML and IIM Ahmedabad source (real article, exam, coaching and college responses; 16 tests passed)
- [x] Align editorial sanitization; repeated article, exam and college browser checks report no page errors and contents navigation works
- [ ] Confirm all 5,174 generated static files in the publication output — publication build has not run; preview checks do not establish this

## Formal mobile application UI
- [x] Simplify page spacing, mobile filters and application dossiers
- [x] Recompose recommended colleges with readable names and aligned actions
- [x] Verify real records, countdowns and interactions at 320/390/766/1280px; nine deadline tests pass

## Application directory refinement
- [x] Fix shared IST deadline calculations and live countdowns (six deadline/order tests passed)
- [x] Make advisor recommendations reliable, readable and navigable (saved picks only, clear closed states, shared ordering)
- [x] Improve approved information sections and detail pages (expandable information, facts, placements, linked contents)
- [x] Verify clocks ticking, recommendation arrows/filter, expanded details and narrow-screen layouts without overflow or runtime errors

## Article and blog readability
- [x] Replace raw contents with styled section links across public articles and blogs
- [x] Split long passages safely, preserve facts and links, and format genuine lists/subheads
- [x] Verify anchor navigation and content preservation (five tests; real article has 22 valid contents links, no horizontal overflow or runtime errors)

## Advertisement format improvements
- [x] Remove all header delivery and replace stretched promotion strips with size-aware display creatives
- [x] Add multiple-size uploads per campaign and accurate format previews
- [x] Verify display formats, placement rules, and preview resizing (ten tests; temporary public preview sample; authenticated admin upload flow remains unverified)

## Dynamic advertisement delivery
- [x] Discover nested article content and late-loaded sections; place ads within reading flow
- [x] Use existing desktop sidebar space with scroll-following, responsive creatives
- [x] Rank eligible ads using current-tab entry page and reading interests without cross-site profiling
- [x] Improve admin real-page preview and verify placement, resizing, and selection safeguards (six tests; public article and campaign preview checked)
- [ ] Verify signed-in admin gallery and draft previews — requesting account session is unavailable

## Editorial interlinking
- [x] Add restrained database-backed entity linking to public editorial content
- [x] Add admin blog directory and per-blog editorial link dossiers with live links
- [x] Verify matching safeguards and public article behavior (five tests; six automatic links on a live article; no runtime errors)
- [ ] Verify authenticated admin dossier and draft-save flow — requesting account could not be signed in; needs preview sign-in

## Course refund disclosure
- [x] Show no-refund terms on course listings, course details, and beside enrollment actions
- [x] Align MBA Compass course offer metadata without changing third-party institute policies

## Connectors (new workspace)
- [x] Connect Firecrawl
- [ ] Connect Google Search Console — connection card declined
- [ ] Connect Semrush

## /mba-application fixes
- [x] Tables not horizontally scrollable (left/right slide)
- [x] "My Application" button must open a dedicated application tracking portal, not the student dashboard
- [x] Expenses breakdown must be far more detailed
- [x] Replace the directory table with a formal sectioned application-dossier layout
- [x] Add three record actions, expandable college highlights, richer facts, and live deadline urgency
- [x] Make every public application dossier field manageable from the admin editor
- [x] Simplify the admin application list into responsive summary records with progressive actions

## Preview stability
- [x] Resolve all errors reported in `/tmp/observability/build-errors.log`

## AI Profile Analyser report
- [x] Prevent structured AI narrative data from appearing as raw code
- [x] Recompose the report summary into formal score, strategy, strength, risk, and verdict sections

## AI Blog Writer output
- [x] Research missing details from full supplemental pages, allow evidence-based labelled estimates, and remove competitor attribution/incomplete table rows (8 safeguard tests pass; writer deployed)
- [x] Replace missing-data boilerplate with supplied-link-first, recent public-source research and editor-only gaps
- [x] Remove robotic Yes/Short answer paragraph openers and test shared output cleanup
- [x] Connect Firecrawl and verify the recent-source search request returns page evidence
- [ ] Verify a complete newly generated article in the signed-in writer — not yet exercised end-to-end
- [x] Keep reference attribution in admin while using source facts silently in public prose
- [x] Enforce overview, paragraphs, tables, pointers, FAQs, important points, and bold data
- [x] Generate a 100–200-term admin keyword bank with a smaller public related-search set
- [ ] Add decision-led chapters with editable table, alert, and internal-link plans
- [ ] Add grouped contents navigation, semantic alerts, back-to-contents links, and mobile checks
- [ ] Expand the editor report with repetition, table-width, alert, and link validation

## Student dashboard redesign
- [x] Apply the selected Institutional Executive composition in the Academic Blue system
- [x] Scope Sora and Manrope typography to the student experience
- [x] Verify signed-in desktop and mobile dashboard presentation
- [x] Highlight My Applications across the public directory, student navigation, and application workspace

## Course detail sales redesign
- [x] Lock the authority-led Sky/Emerald sales direction
- [x] Recompose the course page around factual offer, proof, and enrollment actions
- [x] Add approved text testimonials with an honest empty state until records are available
- [x] Verify desktop and mobile course-page presentation and interactions
- [x] Add automatic testimonial rotation, compact section navigation, and repeated buy-now bands
- [x] Replace the sparse first screen with a dense offer summary and remove the empty media panel
- [x] Add preparation journey, ideal-student guidance, access summary, analysis workflow, and fallback FAQs
- [x] Add exam-wise animated charts, a detailed coverage table, complete offer groupings, and scroll-led motion
- [x] Detail vocabulary, formula, insight, analytics, planner, predictor, and practice tools with an automatic feature slider
- [x] Keep the automatic text-testimonial slider connected to approved reviews with an honest verified-feedback state

## Homepage college deadlines
- [x] Add an auto-scrolling college application deadlines section above the tools section
- [x] Make deadline cards, placement packages, fees, links, logos, visibility, and order admin-managed
- [x] Add six starter college entries and verify desktop/mobile presentation

## Project monitoring findings
- [x] Keep the SEO approvals injected count stable across refreshes
- [x] Prevent category landing pages from overwriting the main application filters
- [x] Match public recommended-application order to the admin order
- [ ] Preserve structured draft fields during review and guarded publishing
- [ ] Keep AI exam jobs in review until a canonical exam is published
- [ ] Make anonymous-to-signed-in shortlister submission updates RLS-safe and visible on failure
- [ ] Reduce bursty full-table reads that trigger database statement timeouts
- [ ] Support existing-college refresh drafts and active-draft reuse
- [ ] Remove college-only extra costs from exam summaries

## Meritto verification export
- [x] Record future bulk-upload pushes in Meritto Push History
- [x] Download every recorded lead with its latest delivery status
- [x] Download the currently filtered lead list

## AI College & Exam Information Portal
- [x] Add configurable draft, evidence, source, batch, and audit data model
- [x] Add unified Colleges & Exams research and approval workspace
- [x] Move college AI generation behind draft review
- [x] Disable bulk college and exam auto-publishing and expose review states
- [x] Add field-level review, manual edits, guarded publishing, refresh, and bulk research
- [x] Verify preview compilation health
- [x] Ads: campaign controls, preview studio, analytics/alerts/A-B
- [x] Admin rich text editor: detect mixed font sizes correctly and support text colours everywhere

## Compact application filter bar
- [x] Fold search, reset and dropdowns into short toolbar rows and slim deadline/category/exam chips
- [x] Verify every filter applies and resets at 390/820/1280px and on category landing pages
