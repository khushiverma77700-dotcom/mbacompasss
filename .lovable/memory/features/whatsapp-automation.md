---
name: WhatsApp Automation
description: /admin/whatsapp-automation bulk WhatsApp campaigns with daily limit, 3-attempt retry queue, hourly cron dispatch via SmartPing partner API
type: feature
---

Admin module at `/admin/whatsapp-automation` (sidebar group "WhatsApp Automation").

Provider: SmartPing / pinbot.ai WhatsApp Business partner API (Meta-compatible payloads)
`POST {base}/v3/{phone_number_id}/messages`, header `apikey`. Base default
`https://partnersv1.pinbot.ai`.

Credentials resolution order (server): env `SMARTPING_API_KEY` / `SMARTPING_PHONE_NUMBER_ID`
(+ optional `SMARTPING_API_URL`), then the `api_credentials` table rows with the same key names,
so admins can manage them from /admin/api-keys. The user declined storing them as platform secrets.

Tables: `whatsapp_campaigns`, `whatsapp_recipients` (unique campaign_id+phone = duplicate
protection), `whatsapp_send_logs`, `whatsapp_daily_stats` (+ `whatsapp_bump_daily` RPC).
All admin-only RLS.

Rules:
- Daily limit enforced through `whatsapp_daily_stats.processed_count` for the current date.
- Retry queue is processed before new numbers; max 3 attempts, backoff attempt*30min, then
  status `max_retry_failed` ("Failed – max retries reached") and never auto-sent again.
- 429/5xx is treated as throttling: recipient rescheduled +20min, attempt NOT consumed, run stops.
- Per-run cap `RUN_BATCH_CAP = 40` with 350ms spacing.
- Indian 10-digit numbers get `91` prefixed automatically.

Scheduling: pg_cron job `whatsapp-automation-dispatch`, `15 * * * *` (hourly so larger daily
limits can be spread), POSTs `/api/public/whatsapp/dispatch` with header `x-automation-secret`
= secret `WHATSAPP_CRON_TOKEN`. Admin "Send today's batch now" calls the same engine through
`runWhatsAppDispatch` server fn.

Files: `src/lib/whatsappSender.server.ts` (engine), `src/lib/whatsappAutomation.functions.ts`,
`src/routes/api/public/whatsapp/dispatch.ts`, `src/pages/admin/AdminWhatsAppAutomation.tsx`,
`src/routes/admin.whatsapp-automation.tsx`.
