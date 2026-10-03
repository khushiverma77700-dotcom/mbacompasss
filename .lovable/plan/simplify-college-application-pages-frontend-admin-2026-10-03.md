# Simplify College Application Pages (Frontend + Admin)

## Goal
Cut the College Application module down to the fields in your spec: Name, Slug, Category, Tier, Program(s), Program Fees, Application Fees, Application Link, Logo, College Details (rich text), Exams Accepted, Publish status.

## Admin form (rebuilt, 5 short sections)
1. **Basic Information** - College Name, Slug (auto from name, editable), Category (IIM / Tier 1 Non-IIM / Tier 2 Non-IIM), Tier (Tier 1-4), Logo upload (upload / replace / remove, PNG/JPG/WebP).
2. **Program & Fees** - Program multi-select (MBA, PGDM, MMS, PGP, Others), Program Fees, Application Fees. Fees are shown formatted, for example "Rs 12.50 Lakhs". There is one fee field only. "College fees" is not a separate field.
3. **Application** - Application Link (used by Apply Now), Exams Accepted multi-select (CAT, XAT, NMAT, SNAP, CMAT, MAT, GMAT, GRE, MAH MBA CET, CUET-PG, ATMA, IIFT, TISSNET, Other), Application deadline.
4. **College Content** - one large rich-text editor (headings, paragraphs, bullets, paste).
5. **Publishing** - Published / Draft.

Removed from the form: short name, location, open date, packages (avg/highest/median), eligibility, selection process, cutoff guidance, inside-info notes, official website, short description, homepage/order controls, status dropdown.
Recommendations and SEO stay in their existing separate admin tools, so they don't clutter the form.

## Frontend
- **Card**: logo, name, category, tier, program(s), program fees, application fees, exam tags, deadline badge, and two buttons: **Apply Now** and **View College Details**. The "Check College Highlights" dropdown and the duplicate View Details button are removed.
- **Filters**: Category, Tier, Program, Exam accepted, Fees range, Application status (open / closing soon / closed). Unused filters are removed.
- **Details page**: header with the same key facts, Apply Now, then the College Details content. The old eligibility, packages and cutoff blocks are removed.

## Decisions to confirm
- **Deadline kept**: Application deadline stays (one date field). The "Closing Soon" countdown, the status filter and the homepage deadlines carousel all depend on it.
- **Exam records**: Existing entrance-exam records (CAT, XAT and similar) stay in their own "Exams" group with the same simple form. Category and Tier are hidden for them.
- **No data deleted**: Old columns stop being used and are marked deprecated, but nothing is dropped. Existing text such as the description or eligibility is copied once into College Details, so no content is lost.

## Technical details
- Migration: add `programs text[] default '{}'` and `details_html text` to `application_trackers`. Backfill `programs` from `program` and `details_html` from short_description/eligibility/selection_process. Add COMMENT DEPRECATED on retired columns.
- Category stays mapped to the existing keys (`iim`, `tier1`, `tier2`, `exam`), so the category landing URLs keep working.
- Files: `ApplicationFormDialog.tsx` (rewrite using `RichTextEditor` + `FileUpload`), `ApplicationTrackerPage.tsx` (card + filters), `ApplicationDetailPage.tsx`, `applicationTracker.ts` (row type, select list, program/fee filter helpers), `BulkImportDialog.tsx` (match the new fields). Rich text goes through `sanitizeHtml`.
- Update the AGENTS.md rule "every public dossier field editable" to describe the reduced field set.
- Verify with a build check and Playwright on desktop and mobile.
