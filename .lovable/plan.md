# Simplify College Applications Admin

## Goal
Replace the dense, wide college/exam table with a simple, scannable management list while keeping every existing admin capability.

## What will change
- Keep one clear header with the primary **Add Application** action; move Bulk Import and Bulk AI SEO into a compact secondary-actions area.
- Keep search and the essential category/deadline/archive filters in one simple filter row with a visible result count.
- Replace the 10-column inline-edit table with responsive application summary cards/rows showing only:
  - college or exam name and programme
  - category and active state
  - application deadline and urgency
  - fee summary
  - views, clicks, and tracked applications
- Make **Edit details** the main action for each record so all fields remain manageable in the existing editor.
- Put less-frequent actions—SEO, duplicate, activate/deactivate, archive, and delete—inside a single actions menu.
- Preserve the Dashboard, Documents, Recommended, Activity, and Students areas without changing their data or business rules.

## Validation
- Confirm search and filters still work.
- Confirm edit, duplicate, status, archive, SEO, and delete actions remain accessible.
- Check the list on desktop and mobile with no horizontal scrolling.
- Confirm the project builds without errors.

## Technical details
- Frontend-only changes in the College Applications admin page.
- Reuse the existing form dialogs, queries, permissions, and mutations; remove inline table editing rather than changing backend behavior.
