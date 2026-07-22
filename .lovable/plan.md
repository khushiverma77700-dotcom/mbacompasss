## Goal

Every visitor (humans and crawlers) receives the fully-rendered `ssr-prerender` HTML on the FIRST byte from Cloudflare's edge. React then hydrates on top of it, so all interactive features keep working. No content, no design, no URLs, no database, no Hostinger workflow changes.

---

## 1. Cloudflare Worker changes (`cloudflare/worker.js`)

Today the worker only sends bots to `ssr-prerender`; everyone else gets Hostinger's empty SPA shell. The change:

- **Remove the `BOT_UA` gate** for HTML navigations. Any request whose path is an HTML route (no asset extension, not `/storage/*`, not `/functions/*`, not `/sitemap.xml`, not `/robots.txt`, not `/assets/*`) is proxied to `ssr-prerender`.
- **Keep the pass-through** for JS/CSS/images/fonts/sitemap/robots — those must still load from Hostinger so React can hydrate.
- **Skip prerender for logged-in / dashboard traffic** to avoid caching personalised HTML:
  - Any request with an `Authorization` header, a Supabase auth cookie (`sb-*-auth-token`), or hostnames `dashboard.mbacompass.in` and `*.lovable.app` → pass straight through to origin, no prerender, no edge cache.
  - Any path starting with `/student`, `/admin`, `/auth`, `/login` → pass through.
- **Add a `?nossr=1` escape hatch** so we can debug the raw SPA shell if needed.
- **Set a `Vary: Cookie, Accept-Encoding` header** on prerendered responses so authenticated users never get a cached anonymous copy.
- Keep the existing `/storage/v1/render/image/...` AVIF/WebP block unchanged.

Nothing about the SPA bundle, routes, or hydration logic changes — the worker just decides *which* HTML to serve first.

## 2. Caching & automatic invalidation

Two layers, both automatic:

**Cloudflare edge cache (fast, cheap)**
- `s-maxage=600` (10 min) + `stale-while-revalidate=86400` on prerendered HTML responses.
- `cacheEverything: true` with a 10-minute edge TTL. Cloudflare serves stale HTML instantly while it revalidates in the background, so publishing new content appears within ~10 minutes worldwide with zero manual purge.
- Assets (JS/CSS with Vite hashes) keep their existing 1-year immutable cache — hydration always matches whatever HTML was rendered because filenames are hashed.

**Supabase function cache (already exists)**
- `ssr-prerender` already returns `Cache-Control: public, max-age=600, s-maxage=3600`. We keep it.

**When new content publishes** (article, college, coaching, exam, homepage change):
- Nothing manual. Old HTML expires at edge within 10 min AND is served stale-while-revalidate, so the next visitor triggers a background refresh from `ssr-prerender`, which re-queries the database live.
- Optional (later, only if you want instant): add a "Purge Cloudflare cache" button in `/admin` that calls Cloudflare's purge API for the changed slug. Not required for launch.

## 3. Files touched — and what stays untouched

**Touched (2 files only):**
- `cloudflare/worker.js` — routing logic change described in §1.
- `supabase/functions/ssr-prerender/index.ts` — small hardening only (headers for `Vary`, honour `?nossr=1`, ensure logged-in requests aren't cached). No output HTML changes.

**Explicitly NOT touched:**
- No UI, design, layout, Tailwind, or styling files.
- No article/college/coaching/exam content, no admin editing flows.
- No database schema, no migrations, no RLS, no data.
- No route paths, no `App.tsx` router entries, no URL changes.
- All calculators, filters, forms, comparison tool, favourites, login, cart, Razorpay — all client-side JavaScript continues to run exactly as today after hydration. React hydrates onto the prerendered markup; interactivity is unchanged.

## 4. Hydration-safety audit (files that touch `window` / `localStorage` / auth-only fetches)

The prerender already renders on a Deno server (no `window`), so it doesn't execute React components — it emits handcrafted HTML from database rows. That means the audit is only about what happens **after** the browser receives the HTML and React hydrates on top. Two categories:

**A. Contexts / hooks that read `localStorage` on first render** — these must return a neutral default on the very first client render so hydration doesn't mismatch. Files to guard:
- `src/contexts/AuthContext.tsx`
- `src/contexts/StudentThemeContext.tsx`
- `src/contexts/MockGenDockContext.tsx`
- `src/contexts/CompassCompareContext.tsx`
- `src/main.tsx` (React Query persistence bootstrap)
- `src/hooks/useStudentNavBadges.ts`
- `src/hooks/useFilteredList.ts`
- `src/hooks/useAdminFilters.ts`
- `src/components/student/InstallAppPrompt.tsx`
- `src/components/student/PersonalizedHubGuide.tsx`
- `src/pages/ArticlePage.tsx`, `src/pages/ProfileAnalyzerPage.tsx`, `src/pages/student/StudentNotifications.tsx`, `src/pages/student/StudentDayPlanner.tsx`
- `src/lib/seoAutomation.ts`, `src/lib/profileAnalyzerMetaCheck.ts`, `src/lib/explanationCleanerRunner.ts`
- Admin utilities: `src/pages/admin/AdminClearCache.tsx`, `src/pages/admin/AdminSafeBrowsingGuide.tsx`

Because the prerendered HTML is anonymous (no user state), the fix pattern is simple and non-visual: on first mount, read storage inside a `useEffect` rather than during render, so the first client paint matches the server HTML. No behaviour or UI changes — just the moment the value is read.

**B. Auth-gated fetches** — no change needed. Prerender only runs for public pages. Anything under `/student`, `/admin`, `/auth`, `/login` bypasses prerender entirely (see §1), so authenticated pages behave exactly like today.

I'll walk through each file and confirm no visible change before editing.

## 5. What you do outside Lovable (plain-English Cloudflare steps)

You need Cloudflare in front of your domain. Free plan is enough.

**One-time setup** (~15 min, all in the Cloudflare dashboard — no CLI):

1. Go to `https://dash.cloudflare.com` → **Sign up** (free).
2. Click **Add a site** → type `mbacompass.in` → choose **Free plan**.
3. Cloudflare shows you 2 nameservers (e.g. `alice.ns.cloudflare.com`, `bob.ns.cloudflare.com`). Copy them.
4. Log in to wherever you bought the domain (Hostinger or your registrar) → open the domain's **Nameservers** setting → replace the existing nameservers with the 2 Cloudflare ones → save. This takes 1–24 h to propagate; the site keeps working the whole time.
5. Back in Cloudflare, it will import your existing DNS records automatically. Confirm you can see `mbacompass.in` and `www` pointing to Hostinger. Make sure the orange cloud icon next to each is **ON (orange)** — that means traffic goes through Cloudflare.
6. Wait for Cloudflare to send an email saying "your site is active".

**Deploy the Worker** (I'll give you a click-path when we're ready):

7. In Cloudflare dashboard: **Workers & Pages** → **Create application** → **Create Worker** → name it `mbacompass-edge` → paste the worker code I'll provide → **Save and Deploy**.
8. In that Worker → **Triggers** tab → **Add route** → add three routes:
   - `mbacompass.in/*`
   - `www.mbacompass.in/*`
   - (do NOT add `dashboard.mbacompass.in/*` — that subdomain stays untouched)

That's it. No CLI, no Wrangler, no npm.

## 6. Deployment workflow

Nothing changes. You continue to:
- Upload the built `dist/` folder to Hostinger via File Manager exactly as today.
- Publish articles/colleges from the admin panel exactly as today.

The only one-time-only change is the DNS nameserver swap in step 4 above. After that, Hostinger keeps serving the files, Cloudflare sits in front and rewrites HTML responses through `ssr-prerender`, and everything else is automatic.

---

## What I need from you to proceed

Reply "go" and I will:
1. Update `cloudflare/worker.js` with the new routing.
2. Add the small `Vary` / `?nossr=1` hardening to `ssr-prerender`.
3. Move `localStorage` reads in the files listed in §4A into `useEffect` (behaviour-preserving).
4. Give you the exact Worker code + click-path for the Cloudflare dashboard.
