---
name: Mock Bundles
description: mock_bundles groups mocks; courses link to bundles via course_bundles many-to-many. Course enrollment trigger auto-unlocks every linked bundle's mocks. Public buy at /courses via Razorpay.
type: feature
---
- Tables: `mock_bundles`, `mock_bundle_items`, `mock_bundle_enrollments`, `mock_enrollments`, and `course_bundles` (course_id ↔ bundle_id, RLS: public SELECT, admin write).
- Trigger `trg_unlock_course_bundles` on `course_enrollments` AFTER INSERT calls `unlock_bundle_mocks(user_id, bundle_id)` for every linked bundle.
- `mock_tests.test_type` enum: `full_length`, `sectional`, `topic_wise`, `practice_set`. AdminMockTests selector exposes all four.
- Admin: `/admin/mock-bundles` 3-step wizard. `/admin/mba-compass-courses` → Bundles tab to link bundles to a course.
- Student `/student/mocks`: primary tabs by test type (Full / Sectional / Topic / Practice / Attempted), secondary chip filter by exam (CAT, XAT, NMAT, SNAP, IIFT, CMAT, MAT, TISSNET). Locked mocks render with "Upgrade to unlock" → UpgradeDialog. Coming Soon based on `launch_date` or `scheduled_start_at`.
