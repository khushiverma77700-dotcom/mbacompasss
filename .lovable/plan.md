
Building an MBA ROI Calculator mirroring the Profile Analyzer pattern. Reusing existing OTP infra (`send-otp`/`verify-otp`), `colleges` table for dataset, and Lovable AI for the narrative layer.

## Plan: AI-Powered MBA ROI Calculator

### 1. Database (1 migration)
**New table: `roi_analyses`**
- Identity: `id`, `user_id` (nullable), `name`, `email`, `phone`, `created_at`, `updated_at`
- Inputs: `graduation_stream`, `current_salary_lakhs`, `work_experience_years`, `target_exams[]`, `expected_tier` ('Tier 1'/'Tier 2'/'Tier 3'), `preferred_specialization`, `budget_lakhs`, `preferred_location` ('India'/'Abroad'/city), `target_states[]`
- Computed: `total_investment_lakhs`, `expected_salary_lakhs`, `payback_years`, `roi_score` (0–100), `roi_category` ('High'/'Medium'/'Low')
- Output: `ai_insights` (jsonb — verdict, summary, risk analysis, recommendations narrative), `college_recommendations` (jsonb — dream/target/safe buckets with ROI per college), `report_unlocked` (bool)
- RLS: identical pattern to `profile_analyses` (anyone insert, owner+admin read/update, admin delete)

### 2. Edge Function: `roi-calculator`
- Validates input (zod)
- **Deterministic ROI math** (no AI):
  - Pulls colleges from `colleges` table filtered by tier + specializations + location/state + accepted exams
  - For each college: fees from `fees_lakhs`, expected salary parsed from `placement_avg`
  - `Total Investment = fees + opportunity_cost (current_salary × 2 years)`
  - `Annual Gain = expected_salary − current_salary`
  - `Payback = Total Investment / Annual Gain`
  - `ROI Score` weighted: payback period (50%), salary jump multiple (30%), tier prestige (20%)
  - Bucket into Dream/Target/Safe by tier vs user's expected tier
- **Light AI layer** (Gemini 2.5 Flash via Lovable AI Gateway):
  - Generates: personalized verdict ("Should you do an MBA now?"), risk analysis paragraph, 3–5 recommendations, narrative for each bucket
  - Uses `logAIUsage` helper (per existing pattern)
- Saves analysis to `roi_analyses`, returns full report

### 3. Frontend: `/roi-calculator` page (`MBARoiCalculatorPage.tsx`)
Mirrors `ProfileAnalyzerPage` step machine + animations:
- **Step 0 — Landing**: Hero "Check Your MBA ROI Before You Invest", animated sample ROI preview (payback gauge, salary bars), how-it-works (4 steps), trust stats, sample report preview, FAQ, cross-promo of other AI tools
- **Step 1–3 — Form** (multi-step):
  - Step 1: Name, Email, **Mobile + OTP** (reuses `send-otp`/`verify-otp` — mandatory verified)
  - Step 2: Graduation stream, current salary, work experience, target exams (chips), expected tier
  - Step 3: Preferred specialization, budget range slider, preferred location (India/Abroad/city), target states (optional)
- **Step 4 — Loading**: progress bar with rotating fun facts (matches Profile Analyzer)
- **Step 5 — Report**: locked preview + `LoginRequiredDialog` gate (auth required to unlock, same pattern). Once unlocked:
  - Profile Summary card
  - **ROI Headline panel**: Total Investment | Expected Salary | Payback Years | ROI category badge
  - **AI Verdict** ("Should you do an MBA now?")
  - **College Recommendations** — 3 buckets (Dream / Target / Safe) with per-college ROI, fees, avg salary, payback
  - **ROI Comparison chart**: High vs Low ROI colleges (bar chart via recharts)
  - **Fees vs Salary chart**
  - **Risk Analysis** section with risk level + backup suggestions
  - **Final Verdict** + actionable next steps
  - Save / Download / Share actions

### 4. Routing & Navigation
- Add lazy route `/roi-calculator` in `App.tsx`
- Add to AI Tools section + cross-promo in Profile Analyzer / Shortlister
- SEO meta + JSON-LD (same pattern as Profile Analyzer)

### 5. Admin
- New page `AdminROIAnalyses.tsx` (mirror of `AdminProfileAnalyzer.tsx`): list, filter by ROI category/exam/date, CSV export, detail dialog
- Add route under `/admin/roi-analyses` + sidebar link

### Key Reuse
- OTP: existing `send-otp` / `verify-otp` (Fast2SMS, 5m expiry, 30s resend)
- Auth gate: `LoginRequiredDialog` + `useAuth`
- College data: existing `colleges` table (fees_lakhs, placement_avg, tier, specializations, exams_accepted, state)
- AI: Lovable AI Gateway, default `google/gemini-2.5-flash`, `logAIUsage` helper
- Styling: white/light blue palette, no emojis, framer-motion animations, professional advisor tone

### Files to Create
- `supabase/migrations/<timestamp>_roi_analyses.sql`
- `supabase/functions/roi-calculator/index.ts`
- `src/pages/MBARoiCalculatorPage.tsx`
- `src/pages/admin/AdminROIAnalyses.tsx`

### Files to Modify
- `src/App.tsx` (route + admin route)
- `src/components/AIToolsSection.tsx` (add tile)
- `src/pages/admin/AdminLayout.tsx` (sidebar link)
