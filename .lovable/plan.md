
# Plan: Dedicated Mobile App for Mocks (React Native + Expo)

## Goal

Build a standalone mobile app focused **only** on the mock-test experience (buy → take → review → leaderboard). The web platform stays as-is. The app reuses the existing Supabase backend (auth, mock_tests, mock_attempts, mock_enrollments, edge functions) so there is **zero backend duplication**.

## Why a separate app (not a PWA)

- Native test-taking UX: full-screen, no browser chrome, swipe between questions, tab-switch detection, offline draft answers.
- Push notifications for scheduled mocks, results, leaderboard rank changes.
- App Store / Play Store distribution → higher trust for paid mocks.
- Razorpay native SDK for smoother checkout than web redirect.

## Tech stack

- **Expo (React Native)** with TypeScript — single codebase for iOS + Android, OTA updates via EAS Update.
- **expo-router** (file-based routing, mirrors Next.js patterns).
- **Supabase JS v2** with `@react-native-async-storage/async-storage` for session persistence.
- **NativeWind** (Tailwind for RN) so the design language matches the web app (light blue / white, no dark navy — per existing brand rules).
- **react-native-katex** or **react-native-math-view** for LaTeX rendering inside questions/options/explanations (mirrors the `MathContent` component on web).
- **Razorpay React Native SDK** (`react-native-razorpay`) for in-app checkout.
- **expo-notifications** for push.
- **Zustand** for lightweight client state (current attempt, timer, answer map).
- **TanStack Query** for server state + caching.

## App scope (Mocks only — explicit non-goals)

In-scope screens:
1. Auth (Email + OTP, Google sign-in via Supabase OAuth).
2. Home: My Mocks (Full Length / Sectional / Topic-wise / Practice / Attempted tabs — same buckets as `StudentMocks.tsx`).
3. Store: Mock Bundles + single mocks (`/courses` equivalent) with Razorpay checkout.
4. Mock Intro screen (instructions + Start).
5. **Test Runner**: timed, section-locked, palette, mark-for-review, submit. Mirrors `MockTestRunnerPage.tsx`.
6. Result + Section breakdown.
7. Solution review (per-question with explanation + LaTeX).
8. Leaderboard (per test).
9. Personalized Mock Hub (AI-generated mocks via existing `personalized-mock-create` edge function).
10. Profile + Orders + Logout.

Out-of-scope: blog, college directory, profile analyzer, day planner, MBA Compass, admin — none of these belong in a mocks-only app.

## Backend reuse (no new tables)

All flows hit existing Supabase endpoints:

| Flow | Existing endpoint |
|---|---|
| Login | `supabase.auth.signInWithPassword` / `signInWithOtp` |
| List my mocks | `mock_enrollments` + `mock_tests` (RLS-protected) |
| Buy mock / bundle | edge fns `create-mock-checkout`, `bundle-create-order`, `bundle-verify-payment` |
| Start attempt | edge fn `mock-start-attempt` |
| Submit attempt | edge fn `mock-submit-attempt` |
| Personalized mock | edge fns `personalized-mock-create`, `personalized-mock-submit` |
| Leaderboard | `mock_attempts` query |
| Result insights | edge fn `generate-mock-insights` |

**Only new work on backend:** add a `device_push_tokens` table + a tiny edge function to send push on mock-result-ready / new-mock-published. Defer if not needed in v1.

## Architecture

```text
mobile/                          (new repo or /apps/mobile inside monorepo)
├── app/                         (expo-router)
│   ├── (auth)/login.tsx
│   ├── (tabs)/
│   │   ├── index.tsx            (My Mocks)
│   │   ├── store.tsx            (Buy)
│   │   ├── personalized.tsx
│   │   └── profile.tsx
│   ├── mock/[slug]/intro.tsx
│   ├── mock/attempt/[id].tsx    (full-screen runner)
│   ├── mock/result/[id].tsx
│   ├── mock/review/[id].tsx
│   └── mock/leaderboard/[slug].tsx
├── lib/supabase.ts              (RN client w/ AsyncStorage)
├── components/
│   ├── QuestionCard.tsx         (LaTeX-aware)
│   ├── QuestionPalette.tsx
│   ├── SectionTabs.tsx
│   ├── Timer.tsx
│   └── RazorpayButton.tsx
├── store/attemptStore.ts        (Zustand: answers, timer, current Q)
├── hooks/useAttempt.ts
└── app.json / eas.json
```

## Phased delivery

**Phase 1 — Foundation (week 1)**
Expo + NativeWind + Supabase auth + bottom-tab shell + My Mocks list reading from existing tables.

**Phase 2 — Test runner (week 2)**
Intro → start-attempt edge fn → runner with timer, palette, section locks, LaTeX rendering, autosave to local store, submit edge fn → result screen.

**Phase 3 — Review + Leaderboard (week 3)**
Per-question review with correct answer, explanation, LaTeX. Leaderboard list.

**Phase 4 — Store + Razorpay (week 4)**
Mock + bundle catalogue, native Razorpay checkout, verify-payment edge fn, auto-unlock via `mock_enrollments`.

**Phase 5 — Personalized Hub + Push (week 5)**
Wire `personalized-mock-create`, add expo-notifications, `device_push_tokens` table, EAS build for internal testing.

**Phase 6 — Store submission**
App icons, splash, privacy policy URL, screenshots, EAS submit to TestFlight + Play Internal Testing.

## Risks / decisions to confirm

1. **Razorpay**: native SDK vs WebView fallback. Native is smoother; WebView is faster to ship.
2. **LaTeX on RN**: `react-native-math-view` (uses native MathJax) vs WebView per question. Decide after a spike.
3. **Offline mode**: should a started attempt be resumable without network? Recommend yes for v2, not v1.
4. **Distribution**: publish to both stores, or Android-first?

---

# Detailed Build Prompt (paste into a new Lovable / Cursor project)

> Build a production-ready **React Native (Expo, TypeScript)** mobile app called **"MBA Compass Mocks"** focused exclusively on CAT/XAT/NMAT/SNAP/IIFT/CMAT/MAT mock tests. The app reuses an existing Supabase backend — do **not** create new tables unless explicitly listed.
>
> **Stack (mandatory):**
> - Expo SDK latest, expo-router, TypeScript strict
> - NativeWind (Tailwind RN) — light blue + white theme, **no dark navy, no emojis**
> - `@supabase/supabase-js` v2 with `@react-native-async-storage/async-storage` session storage
> - TanStack Query for server state, Zustand for attempt state
> - `react-native-math-view` for LaTeX in question text / options / explanations (delimiters `$…$`, `$$…$$`, `\(…\)`)
> - `react-native-razorpay` for payments
> - `expo-notifications` for push
>
> **Env vars** (read from `app.config.ts` → `extra`):
> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RAZORPAY_KEY_ID`.
>
> **Screens to build** (file-based routes):
> 1. `/login` — email+password, magic-link OTP, Google OAuth (`supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <deep-link> } })`). After login, force OTP mobile verification if `profiles.mobile` is null (call existing `send-otp` edge function).
> 2. `/(tabs)/index` — **My Mocks**. Tabs: Full Length / Sectional / Topic-wise / Practice / Attempted. Source: `mock_enrollments` joined to `mock_tests` (mirror the query in `src/pages/student/StudentMocks.tsx`). Show locked state for non-enrolled published mocks with "Upgrade to unlock" → `/store`.
> 3. `/(tabs)/store` — list bundles from `mock_bundles` + standalone mocks. Buy via native Razorpay (call `bundle-create-order` → open RZP → call `bundle-verify-payment`).
> 4. `/(tabs)/personalized` — pick exam, sections, difficulty, count → call `personalized-mock-create` edge fn → navigate to runner.
> 5. `/(tabs)/profile` — name, email, mobile, orders, logout.
> 6. `/mock/[slug]/intro` — name, duration, sections, instructions, Start button → calls `mock-start-attempt` → navigates to `/mock/attempt/[id]`.
> 7. `/mock/attempt/[id]` — **the runner**. Requirements:
>    - Header: section tabs (locked per section timing), global timer counting down `total_duration_minutes`, section timer if `section_duration_minutes` is set.
>    - Body: one question at a time, LaTeX-rendered question + 4 options (or TITA numeric input), Mark for Review toggle, Save & Next, Clear Response.
>    - Right drawer / bottom sheet: question palette colour-coded (not visited / not answered / answered / marked / answered+marked).
>    - Persist answers to Zustand + AsyncStorage every change so a crash resumes state.
>    - On timer end OR user Submit: confirmation dialog → call `mock-submit-attempt` with full answer map → navigate to `/mock/result/[id]`.
>    - Block back-gesture during attempt; show "Are you sure?" dialog.
> 8. `/mock/result/[id]` — total score, percentile, accuracy, section-wise table, CTA to Review and Leaderboard. Pull insights via `generate-mock-insights`.
> 9. `/mock/review/[id]` — every question with user's answer, correct answer, explanation, all LaTeX-rendered. Filters: All / Correct / Incorrect / Skipped.
> 10. `/mock/leaderboard/[slug]` — top 100 by score from `mock_attempts`, highlight current user.
>
> **Design system:**
> - Primary: `#0EA5E9` (sky-500). Background: `#FFFFFF`. Surface: `#F1F5F9`. Text: `#0F172A`. Success: `#10B981`. Danger: `#EF4444`.
> - Font: system (SF Pro / Roboto). No serif.
> - Cards: rounded-2xl, subtle shadow, 1px border `#E2E8F0`.
> - Buttons: solid sky for primary, ghost for secondary. No gradients.
>
> **Non-functional:**
> - All Supabase calls go through a typed `lib/api/*.ts` layer wrapped in TanStack Query.
> - Errors surface via a global `Toast` (use `sonner-native`).
> - Add Sentry for crash reporting.
> - Add `eas.json` with `development`, `preview`, `production` profiles.
> - Add a `README.md` with run instructions: `pnpm i && npx expo start`, `eas build -p android --profile preview`.
>
> **Do NOT build:** blog, college directory, profile analyzer, day planner, MBA Compass courses, admin panel, or any non-mock feature. Keep the app laser-focused.
>
> Deliver a runnable Expo project with all screens stubbed, the runner fully functional against the existing Supabase project, and a TestFlight/Play-ready `eas build` config.

---

Tell me which phase you want to start with and whether the app should live in a **new repo** or as `/apps/mobile` in the current one, and I'll scaffold it.
