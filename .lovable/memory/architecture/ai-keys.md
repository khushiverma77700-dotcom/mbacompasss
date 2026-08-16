---
name: AI key policy
description: Only two OpenAI keys allowed project-wide — Vaibhav (OPENAI_API_KEY) primary, Suyash (OPENAI_API_KEY_2) failover
type: constraint
---
All AI calls (frontend tools, free AI tools, Profile Analyzer, SEO/Auto-SEO, Bulk College Creator, mocks, backend workers) must use only two OpenAI keys, read from env in `supabase/functions/_shared/getCredential.ts`:

- `OPENAI_API_KEY` — "Vaibhav" (primary)
- `OPENAI_API_KEY_2` — "Suyash" (automatic failover on 401/402/429/quota errors)

**Forbidden:** Gemini keys, Lovable AI Gateway for app AI, any AI key stored in the `api_credentials` table (DB values never override env). Legacy names (`GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`) are routed to the two OpenAI keys.

`supabase/functions/_shared/aiGateway.ts` is the single entry point; it tries Vaibhav then Suyash and returns a 402 `ai_credits_exhausted` only when both fail on quota. Admin health panel: `src/components/admin/OpenAiSlotSwitcher.tsx` via the `openai-account-status` function.
