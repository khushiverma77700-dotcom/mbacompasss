# Cloudflare Worker — mbacompass.in

Sits in front of the SPA and fixes two issues PSI/GSC flagged:

| Concern | Fix |
|---|---|
| Googlebot indexes the empty SPA shell instead of prerendered HTML | UA-sniff → proxy HTML requests to the `ssr-prerender` Supabase function |
| Supabase serves WebP only; AVIF would cut LCP image weight 30-50% | `cf.image.format = "avif"` when `Accept: image/avif` |

## Deploy

```bash
cd cloudflare
npm i -g wrangler
wrangler login
wrangler deploy
```

Then in the Cloudflare dashboard → **Workers & Pages → mbacompass-edge → Settings → Triggers**, confirm the two routes are bound:

- `mbacompass.in/*`
- `www.mbacompass.in/*`

## Required plan

- **Bot SSR** — works on any plan (Free included).
- **AVIF/WebP via `cf.image`** — needs the **Image Resizing** add-on (Pro $25/mo) **or** the equivalent **Polish** feature (auto WebP/AVIF, no code).

If you only have Polish, you can delete the `/storage/v1/render/image/` block in `worker.js` — Polish handles it automatically at the edge.

## Verifying

```bash
# 1. Bot SSR — should return full <title> + meta in response body
curl -A "Googlebot/2.1" https://mbacompass.in/colleges -s | grep -i '<title>'

# 2. AVIF negotiation — response should be Content-Type: image/avif
curl -H "Accept: image/avif,image/*" -I "https://mbacompass.in/storage/v1/render/image/public/uploads/<sample>.jpg?width=800"
```
