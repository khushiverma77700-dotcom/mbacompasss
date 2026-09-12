# AI College & Exam Information Management Portal

## Goal

Build one production-ready admin portal under **Colleges & Exams** for colleges, universities, and entrance examinations. An administrator enters one name or uploads many names; the system researches official sources, prepares an evidence-backed draft, highlights gaps and conflicts, and publishes only after explicit approval.

Accuracy is the governing rule: **official source first, verified source only, otherwise blank**.

## Current foundation to preserve and improve

- Reuse the existing public `colleges` and `exams` records and their public pages rather than creating a competing directory.
- Consolidate the existing separate college generator, exam generator, bulk college creator, bulk exam creator, completeness checks, and refresh tools into one workflow.
- Keep the existing admin role gate and per-section access control.
- Correct two unsafe current behaviours as part of the migration:
  - College AI generation currently inserts into the live college table before factual review.
  - Bulk exam generation currently enables automatic publishing.

## 1. Configurable information model

Create an admin-managed field registry so new college or exam fields can be added without rebuilding the portal. Each definition will specify:

- entity type, section, label, value type, display order, required status, repeatability, and validation rules;
- whether the field is time-sensitive and its recommended re-verification interval;
- allowed source classes and minimum verification level;
- mapping to an existing public college/exam field or a flexible extended-data field.

Add normalized supporting records for:

- research jobs and bulk batches;
- draft entities and field-level proposed values;
- source documents and crawled pages;
- field-to-source evidence, quoted excerpts, source publication date, and last-verified date;
- conflicts and ambiguity candidates;
- approval decisions, manual edits, publication versions, and audit events;
- structured college programmes, fees, dates, admissions, rankings, accreditations, placements, facilities, scholarships, contacts, and official links;
- structured exam dates, fees, eligibility, pattern, syllabus, authorities, participating colleges, counselling, and official resources.

The existing `colleges` and `exams` tables remain the live publishing targets. Draft research stays isolated until approval.

## 2. Secure server-side research pipeline

Implement protected TanStack server functions for all app-internal actions. Every action will verify the signed-in user and admin role on the server before reading drafts, starting research, approving, rejecting, or publishing.

The durable workflow will be:

```text
Name entered
  -> duplicate and ambiguity check
  -> official entity confirmation when needed
  -> official-domain discovery
  -> crawl webpages and accessible official documents
  -> structured extraction
  -> field-level evidence validation
  -> conflict and freshness analysis
  -> admin review draft
  -> explicit approval
  -> transactional publish
  -> post-publish verification and audit record
```

- Use Firecrawl for search and extraction of accessible webpages, PDFs, brochures, prospectuses, notifications, placement reports, and government documents.
- Use Lovable AI with `openai/gpt-6-astra` through the Responses API for streamed, schema-constrained extraction and comparison.
- Move prompts and model calls fully server-side and preserve AI usage logging.
- Apply bounded retries only to rate limits and temporary service failures; surface billing, permission, validation, and configuration errors without retry loops.
- Make jobs resumable and idempotent so closing the page or refreshing does not lose work or duplicate records.

## 3. Official-source verification engine

Classify every source before extracting publishable facts:

1. institution/exam authority official domain;
2. official application, admissions, results, or counselling portal;
3. government or regulator domain;
4. official PDF, brochure, prospectus, notification, or report;
5. third-party discovery/cross-check source.

For every proposed field, store its value, source URL, page/document title, evidence excerpt, source class, source date when available, extraction time, and last verification time.

Field statuses will be:

- **Verified from Official Source**
- **Cross-Verified**
- **Requires Manual Verification**
- **Conflicting Sources**
- **Information Not Found**

Third-party sources may help locate an official source or flag a discrepancy, but cannot replace an official value. Unverified fields remain `null`/blank; no `N/A`, placeholders, inferred values, expected ranges, or fabricated links are saved.

All saved links will be checked for valid protocol, reachable response, redirect destination, official-domain ownership, suspicious-domain patterns, and document type. Redirects and failures will be shown before approval.

## 4. Duplicate and identity confirmation

Before research starts, compare normalized name, known aliases, city/state, official domain, existing slug, and entity type against current records and active drafts.

- Exact matches offer **Refresh existing record** instead of creating another.
- Similar matches open a confirmation screen showing name, location, entity type, official domain, and existing record.
- Ambiguous search results require the administrator to select the correct institution/exam before extraction continues.
- No timestamp suffixes or silent duplicate creation will be used.

## 5. Professional admin workspace

Replace the fragmented Colleges & Exams tools with a unified workspace containing:

- **Overview** — queued/running research, pending review, missing information, conflicts, verified, published, failed, and stale records;
- **Colleges & Universities** — searchable/filterable records and drafts;
- **Entrance Exams** — searchable/filterable records and drafts;
- **Pending Approvals** — review queue with completeness and risk filters;
- **Bulk Research** — paste names or upload CSV, preview matches, then queue;
- **Source Verification** — official domains, documents, broken links, conflicts, and freshness;
- **Update History** — before/after versions, approver, manual changes, sources, and timestamps;
- **Field Configuration** — add, reorder, require, disable, or change verification rules for fields.

The primary action will be a simple entity-type selector, name input, and **AI Auto-Fill** button. Progress will show discovery, source verification, document reading, extraction, validation, and review preparation without implying success before evidence exists.

## 6. Field-level review and editing

Create a complete review screen grouped into clear sections for identity, programmes, admissions, dates, fees, placements, rankings/accreditation, campus/facilities, scholarships, contacts, links/documents, and SEO/public presentation.

Each field will show:

- proposed value and existing value when refreshing;
- verification badge and freshness date;
- linked official source(s) and evidence excerpt;
- missing, stale, ambiguous, or conflicting warning;
- manual-edit control;
- **Verify Again** action for one field.

The administrator can accept or reject each proposed change, edit any value, remove unsupported content, add a source, or mark a field for later review. Mandatory missing fields are summarized before approval.

Provide separate actions:

- **Save Draft** — never public;
- **Approve & Save** — update the canonical record but keep it unpublished/inactive when supported;
- **Approve & Publish** — validate and publish in one audited transaction;
- **Reject Draft** — preserve the reason and evidence in history.

No AI action will invoke publishing directly.

## 7. Refresh and change comparison

Add **Refresh Information** and record-level **Verify Again** actions for existing colleges and exams.

- Crawl current official sources again.
- Compare every proposed value against the live record.
- Categorize changes as added, changed, unchanged, removed from source, stale, or conflicting.
- Never delete a live value merely because a source disappeared; flag it for review.
- Allow individual, selected, or all safe changes to be approved, while conflicts remain manual.
- Record before/after values, source evidence, approver, and measured verification outcome.

## 8. Bulk research and approvals

- Accept CSV upload and pasted one-name-per-line input for colleges/universities or exams.
- Validate rows and run duplicate/ambiguity checks before queueing.
- Keep separate progress, evidence, errors, and approval state per entity.
- Support pause, resume, retry failed, cancel pending, and download results.
- Bulk operations prepare drafts only; remove automatic exam publishing.
- Add select/multi-select approval for records with no conflicts and all mandatory requirements met. Ambiguous, conflicting, or manually required records cannot bypass review.

## 9. Publishing compatibility

Create explicit mapping services from approved normalized data into the existing college and exam page structures.

- Preserve current URLs and public-page compatibility.
- Write only accepted fields; blank research results must not erase valid live data unless the administrator explicitly approves removal.
- Publish child entities transactionally to avoid partial college/exam records.
- Reuse current indexing and completeness workflows only after a successful approval transaction.
- Remove any route or worker path that can silently publish generated content.

## 10. Audit, security, and reliability

- Add row-level access policies and explicit grants for every new table: administrators manage research and approvals; public visitors only read approved published data through existing public records.
- Keep roles in the existing separate role system and validate them server-side.
- Record fetch, extraction, source classification, conflict, edit, approval, rejection, refresh, and publish events with actor and timestamp.
- Sanitize extracted rich text, validate structured values, prevent unsafe URLs, and restrict uploaded document types/sizes.
- Add database uniqueness and idempotency protections for entity identity and active jobs.
- Add stale-job recovery, rate-limit backoff, clear terminal error states, and resumable processing.

## 11. Migration and rollout

- Backfill field definitions and source metadata from existing college/exam schemas and source arrays without changing currently published pages.
- Surface existing college and exam records inside the new workspace.
- Keep legacy pages temporarily available as redirects or compatibility views until the unified workflow is verified.
- Migrate existing incomplete generation jobs into reviewable/failed states where possible; do not auto-publish them.
- Update the Colleges & Exams navigation to make the unified workspace primary.

## 12. Validation

- Unit-test normalization, duplicate matching, official-domain classification, link validation, source precedence, conflict detection, field mapping, and publish guards.
- Integration-test single college, single exam, ambiguous name, duplicate, official PDF extraction, missing information, conflicting sources, refresh diff, bulk partial failure, and resume flows.
- Prove that unapproved drafts cannot affect public pages and that bulk jobs cannot auto-publish.
- Verify admin permissions and access rules for every new action and table.
- Use Playwright at desktop and mobile sizes to test create, review, manual correction, approval, publishing, refresh, conflict resolution, bulk processing, filters, and audit history.
- Check the final preview for build, runtime, console, network, and responsive-layout errors.

## Technical implementation notes

- Use strict TypeScript with `strictNullChecks`; no suppression comments except a justified `@ts-expect-error` if unavoidable.
- Use schema-validated server inputs and strict-compatible structured AI output.
- Keep canonical field mappings typed; use JSON only for configurable extensions and immutable evidence snapshots.
- All new public-schema tables receive explicit grants, row-level security, admin-only policies, timestamps, and indexes in the same migration.
- Use small, focused admin components for queue, entity list, field review, source panel, conflict panel, diff view, bulk progress, and history.