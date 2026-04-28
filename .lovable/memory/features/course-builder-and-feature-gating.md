---
name: Course Builder & Feature Gating
description: 3-step course wizard (Details → Features → Mocks) at /admin/mock-bundles. mock_bundles.features JSONB drives student dashboard FeatureGate locks; mock_bundles.included_categories drives the per-exam mock picker. Live AI mock generation progress via mock_section_jobs polled by useMockGenerationProgress.
type: feature
---
- DB: `mock_bundles.features jsonb` (FeatureMap) + `included_categories text[]`. Empty features for new bundle = nothing unlocked.
- Feature registry: `src/lib/courseFeatures.ts` lists FeatureKey + label + description. Students with NO bundle enrollments fall back to all-on (legacy).
- Student gating: wrap dashboard cards in `<FeatureGate feature="...">` (renders blurred + Upgrade CTA). Sidebar items use `<FeatureLockBadge>` (small lock icon, page still navigable).
- Upgrade flow: `UpgradeDialog` shows tel:+919876543210 and mailto:support@mbacompass.in CTAs.
- Admin wizard: AdminMockBundles is now 3 steps. Step 3 mock picker (`CourseMockPicker`) loads `mock_tests` filtered by selected categories with Type sub-tabs (Full/Sectional/Topic/Daily/Practice).
- AI mock generation progress: `useMockGenerationProgress(generationId)` polls `mock_section_jobs` every 2s. `MockGenerationProgressPanel` shows overall %, sections done/pending/failed, questions generated/total/remaining, per-section status with retries. AIGenerateMockDialog now has step 3 = live progress instead of blocking spinner.
