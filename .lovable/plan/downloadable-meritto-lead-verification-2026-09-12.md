# Downloadable Meritto Lead Verification

## Goal
Make Admin → Meritto Integration a complete verification record where every lead sent to Meritto can be downloaded with its final delivery status.

## Changes
- Add a **Download all leads** Excel action to Push History.
- Export the full Meritto history from the database rather than only the 500 rows currently loaded on screen.
- Include lead details, source, campaign, delivery status, HTTP status, error/rejection reason, retry count, created date, and last-attempt date.
- Keep the existing search/status/source filters useful by also providing a **Download filtered** action for the currently narrowed list.
- Start recording bulk-upload leads in Push History so future bulk pushes are included in the verification download; remove the current browser-only/zero-storage wording.
- Preserve the existing status values: Delivered, Duplicate, Invalid, Failed, and Pending.

## Technical details
- Reuse the existing Excel export component for the filtered list.
- Add a paginated database fetch for the full export so the 500-row screen limit does not truncate downloads.
- Send bulk rows through the existing logged Meritto path instead of `skip_log`, then refresh Push History after completion.
- Verify the admin page, filtering, both download actions, and current preview diagnostics.

## Limitation
Bulk uploads previously sent in zero-storage mode were intentionally never saved, so they cannot be reconstructed. All future bulk uploads will be retained and downloadable.