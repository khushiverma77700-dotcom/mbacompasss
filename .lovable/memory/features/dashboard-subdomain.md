---
name: Dashboard Subdomain
description: dashboard.mbacompass.in serves only /student/* + /auth. Marketing pages (/mocks, /courses, /colleges, etc.) stay on the main site. No cross-host redirects — hosts operate independently.
type: feature
---
- Same codebase, two hosts, independent surfaces.
- `dashboard.mbacompass.in` allowed paths: `/student/*`, `/auth`, `/forgot-password`, `/reset-password`. Anything else there → redirect to `/student`.
- Main host (`mbacompass.in`, `www.mbacompass.in`) renders ALL pages (including `/mocks`, `/courses`, `/student`) with NO redirects to the dashboard subdomain.
- Logic in `src/lib/subdomainRouter.ts` + inline pre-mount script in `index.html`.
- `studentUrl()` returns same-origin paths only — no auto-hop between hosts.
- DNS: A record for `dashboard` → `185.158.133.1`, configured via Lovable Domains.
