---
name: google-indexing
description: Automated Google Indexing API + IndexNow system. Edge function pings both APIs; admin dashboard at /admin/google-indexing. Google API only truly indexes JobPosting/BroadcastEvent — for other pages it accepts but ignores. IndexNow covers Bing/Yandex/Naver and Google reads it indirectly. Manual GSC "Request Indexing" remains the only guaranteed path; UI exposes a per-row Search Console deep link button. IndexNow key: cc5b688453c4e43d3466783d7f7c426e (file at public/<key>.txt).
type: feature
---
- Edge function `google-indexing` fans out every submit_url / batch_submit / refresh to BOTH Google Indexing API and IndexNow (api.indexnow.org).
- IndexNow key file lives at `public/cc5b688453c4e43d3466783d7f7c426e.txt` and must stay reachable at https://bschoolbuzz.com/<key>.txt for verification.
- Status badge "Notified Google + IndexNow" replaces "Crawl Request Sent" — accurate naming because Google API only guarantees indexing for JobPosting/BroadcastEvent schema.
- Admin table row shows an ExternalLink icon button that opens the URL Inspection tool in Search Console (sc-domain:bschoolbuzz.com) — that "Request Indexing" button is the only reliable way to force indexing within minutes.
- IndexNow logs are stored in indexing_logs with action `indexnow_submit` / `indexnow_batch` / `indexnow_refresh`.
- Hourly refresh cron + nightly auto-run continue to drive the pipeline.
