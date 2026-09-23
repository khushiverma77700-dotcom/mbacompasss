# Simplify WhatsApp Automation + show approved templates

## Goal

Two changes:
1. The dashboard shows the approved WhatsApp templates from your account, so you pick a template from a list instead of typing its name.
2. The whole section becomes much simpler: 3 tabs instead of 7, and one short form to launch a campaign.

## Templates

- New "Templates" tab with a **Sync templates** button that pulls your template list from the WhatsApp provider and shows: name, language, category, status (Approved / Pending / Rejected), the message text and how many blanks it needs.
- Templates are stored so the list loads instantly next time, with a "last synced" time.
- Only Approved templates can be chosen in a campaign; the others are shown greyed out with their status.
- Important: your current API key is accepted for *sending* but the provider refuses it for *reading* the template list. So the sync button may come back with "provider did not allow reading templates". For that case the tab also lets you add a template by hand (name, language, text, number of blanks) so campaigns still work, and a note tells you exactly which value to ask your provider for (business account ID / a key with template permission). If you can paste your WhatsApp Business Account ID, I'll use it for the sync.

## Simpler layout

Tabs go from 7 (Dashboard, All campaigns, Message library, Numbers, Retry queue, Activity logs, New campaign) down to 3:

- **Campaigns** — list of all campaigns with progress, status and the key counts; clicking one opens its detail panel with numbers, retry queue and logs together, plus Start / Pause / Stop / Send now and the edit controls.
- **Templates** — as above.
- **New campaign** — one short form: pick template → fill its blanks → paste numbers or upload CSV/Excel → daily limit + send window + start date → Create & start.

The "Message library" tab is removed; the approved template list replaces it (saved plain-text messages are kept for campaigns already using them). Numbers, retry queue and logs move inside the selected campaign, so nothing is lost — just fewer places to look.

## Notes

- Also fixes the confusion from the test: plain text only reaches people who messaged you in the last 24 hours, so the new form defaults to a template and says this in one line.
- No change to the sending engine, the daily limit logic, the retry rules or the hourly schedule.

## Technical detail

- Migration: `whatsapp_templates` (name, language, category, status, body_text, variable_count, components jsonb, source auto|manual, synced_at; admin-only RLS, service_role full), plus `template_id` on `whatsapp_campaigns`.
- `src/lib/whatsappTemplates.server.ts`: `GET {base}/v3/{waba_or_phone_id}/message_templates` via the stored apikey, upsert on (name, language); returns the provider's status + body verbatim when it refuses.
- `src/lib/whatsappAutomation.functions.ts`: add admin-gated `syncWhatsAppTemplates`.
- `src/components/admin/whatsapp/WhatsAppTemplates.tsx` (new), `WhatsAppCampaignDetail.tsx` (numbers + queue + logs moved out of the page), slimmed `AdminWhatsAppAutomation.tsx`.
