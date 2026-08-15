# Fix dashboard-wide AI 429 errors and API switching

## Diagnosis
- Recent backend logs show the 429 is not a temporary request-rate limit: OpenAI returns `credit_balance_exhausted` / `insufficient_quota`.
- The current shared gateway retries generic 429s, but both key slots can still reach exhausted accounts.
- API switching is cached independently inside each warm backend function, while the current “flush” endpoint only clears its own worker. Shared-code changes also require every importing function to be redeployed.
- Several dashboard AI functions still call OpenAI directly and therefore bypass shared failover and the admin switcher.

## Implementation
1. Make the active OpenAI slot read current backend settings for each generation, eliminating stale per-worker slot selection.
2. Update the shared gateway to:
   - try the selected OpenAI key first;
   - immediately try the other slot for quota/rate-limit/auth failures;
   - distinguish exhausted credits from temporary rate limits;
   - fall back to Lovable AI when neither OpenAI account can serve the request, so dashboard AI remains operational.
3. Move remaining direct dashboard OpenAI generation paths onto the shared gateway so mocks, news, formulas, insights, vocabulary, reports, and admin writers follow the same switch/failover policy.
4. Improve the admin API switcher status message so it reports which account is exhausted and confirms the selected slot without claiming a worker-wide cache flush.
5. Deploy all affected backend functions and verify recent logs plus representative college/mock AI requests.

## Technical details
- No artificial request timeout will be added.
- Billing/quota 429s will not be repeatedly retried; temporary 429s will honor provider retry guidance with bounded backoff.
- Secure keys remain backend-only and are never returned to the browser or logs.
