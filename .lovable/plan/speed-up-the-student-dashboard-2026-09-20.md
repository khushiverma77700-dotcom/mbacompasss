# Speed up the student dashboard

## Goal
Make `dashboard.mbacompass.in` reach useful student content quickly instead of remaining on blank placeholder cards.

## Changes
- Replace the client-side `/` → `/student` redirect with an immediate route-level redirect on the dashboard domain, avoiding the public homepage download and duplicate rendering.
- Keep the main `mbacompass.in` homepage unchanged.
- Preserve login, demo, mock-attempt, and dashboard navigation behavior.
- Narrow the dashboard overview reads to only the fields each section uses, while retaining current session caching and progressive loading.
- Ensure nonessential dashboard requests cannot hold the main page in its loading state.

## Validation
- Open the dashboard domain at mobile and desktop sizes and confirm it enters the student dashboard without rendering the public homepage first.
- Measure initial requests and time to visible dashboard content.
- Confirm signed-out visitors reach the student login and signed-in dashboard navigation still works.
- Check browser errors and the latest preview build status.

## Technical details
- Use TanStack route navigation/redirect behavior rather than a post-render effect for the host handoff.
- Keep the existing full-screen mock route bypass and authentication safeguards unchanged.
- No database capacity upgrade is planned: current health indicates adequate compute, and the bottleneck is browser startup/data orchestration.