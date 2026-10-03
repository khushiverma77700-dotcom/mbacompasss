# Advanced Email Campaigns & Tracking

## Important limitation
The built-in email system is meant for people who signed up on MBA Compass. Sending to uploaded outside lists (bought or scraped databases) can get the sender domain blocked. Uploaded lists will be allowed, but every email keeps an unsubscribe link and skips anyone who unsubscribed or bounced. Each list also gets a checkbox: "These contacts agreed to hear from us."

## What you will get (Admin → Email Campaigns)

```text
Dashboard | Campaigns | New Campaign | Templates | Contact Lists
```

1. **Dashboard**: cards for Sent, Delivered, Opened, Clicked, Bounced and Failed, with open %, click % and bounce %. Includes a day-wise chart, a running-total chart, filters for date range and campaign, and a CSV export.
2. **Composer**: From Name, Subject, Heading and Body as separate fields. The body has a rich editor with image upload. Up to 2 buttons, each with its own label and link. Variables like {{name}}, {{college}} and any uploaded column work in the subject, heading and body, with a fallback when a value is empty. A live preview shows the email with a sample contact's details filled in.
3. **Contact Lists**: upload a CSV or Excel file, then match each column to email, name or a custom variable. Duplicates and invalid addresses are removed. Each list is saved for reuse, and you can view, rename or delete it. Registered users and enrolled students stay available as built-in lists.
4. **Templates**: save, edit, duplicate and delete templates. You can start a campaign from a template.
5. **New Campaign**: give it a name, pick a template or write a new email, pick a list, then send. You can send yourself a test first.
6. **Campaign History**: each campaign shows its name, template, list, send time, status, and sent, delivered, open % and click %. Opening a campaign shows a detailed report, with per-recipient status and opens/clicks over time.

## Technical details
- New tables (admin-only RLS): `email_templates`, `email_contact_lists`, `email_contacts` (list_id, email, name, vars jsonb), `email_campaign_recipients` (campaign_id, email, message_id, tracking_token, delivered/opened/clicked/bounced timestamps), `email_tracking_events` (type, url, ip-hash, ua, at). Extend `email_campaigns` with name, from_name, heading, body_html, ctas jsonb, template_id, list_id and counters.
- Open tracking: a 1×1 pixel at a public route `/api/public/email/open/$token`. Clicks: every link is rewritten to `/api/public/email/click/$token?u=` and redirects only to the URLs saved for that campaign (no open redirect). Delivered, failed and bounced come from `email_send_log` matched by message_id.
- Sending is batched server-side through the existing `enqueue_email` queue. Personalization is rendered per recipient. The suppression list and unsubscribe tokens are applied as they are now.
- Excel parsing happens in the browser with SheetJS, with a cap of 20k rows per list.
- Charts use the existing recharts.
- Note: open rates are approximate, because Apple Mail and Gmail can preload images.
