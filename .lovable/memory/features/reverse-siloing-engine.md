---
name: reverse-siloing-engine
description: Reverse Siloing internal-linking engine — tables, edge functions, dashboard at /admin/reverse-siloing
type: feature
---
- Purpose: measure internal PageRank across all ~1300 pages, then route authority from high-authority informational pages (colleges, articles, exams) into commercial "money" pages (courses, mock bundles, MBA Compass courses).
- Tables: `silo_runs`, `silo_pages`, `silo_links`, `silo_link_recommendations`, `silo_actions`, `silo_settings` (single row, id=true). Admin-only RLS; workers use service_role.
- Edge functions: `silo-crawl` (staged crawl in 11 groups + `stage: "graph"` for PageRank/authority), `silo-analyze` (Gemini AI link recommendations, cursor-paged), `silo-apply` (inserts approved links into source HTML columns; stores `revert_payload` in `silo_actions` so every insertion is revertible).
- Shared logic in `supabase/functions/_shared/silo.ts`: `SILO_SOURCES` maps each source table to its editable HTML field and route pattern; `pageRank` (damping 0.85, normalized 0-100); `insertContextualLink`.
- Dashboard: `src/pages/admin/AdminReverseSiloing.tsx` at `/admin/reverse-siloing` — tabs for Link Recommendations, Authority Flow, Orphans & Weak Hubs, Audit Log, Automation.
- Automation policy lives in `silo_settings`: `automation_enabled`, `auto_apply_links`, `min_opportunity_score`, `max_links_per_run`, `max_links_per_page`. Auto-apply only touches non-destructive link insertions above the score threshold; everything else waits for admin approval.
- CPU limits: crawling must stay staged/batched (same constraint that broke `pruning-inventory`); never scan all sources in one invocation.
