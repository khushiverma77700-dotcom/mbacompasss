
# MBA Profile Analyzer Tool - Implementation Plan

## Adapted to Current Stack
The brief mentions Next.js/Django but this project uses **React + Vite + Supabase (Lovable Cloud)**. All features will be built using the existing stack with Lovable AI for the analysis engine.

## Phase 1: Database Setup
Create 2 new tables:
- **profile_analyses** - stores student profile inputs (academic scores, work exp, category, target exam, aspirations)
- **analysis_results** - stores AI-generated results (profile score, strengths, weaknesses, college predictions, probability scores, recommendations, study plan)

## Phase 2: AI Edge Function
- **`profile-analyzer`** edge function using Lovable AI (Gemini)
- Scoring engine: calculates profile score using weighted formula
- AI generates personalized insights, college predictions, strengths/weaknesses, improvement roadmap
- Returns structured JSON via tool calling

## Phase 3: Frontend - Profile Analyzer Page (`/profile-analyzer`)
- **Step 1**: Academic Details (10th, 12th, Graduation %, Stream)
- **Step 2**: Profile Details (Work Experience, Category, Gender, Target Exam)
- **Step 3**: Aspirations (Target Colleges multi-select, Preferred Specialization)
- Progress bar, auto-save to localStorage, inline validation, smooth transitions
- Loading screen with animated progress simulation
- **Partial Result**: Shows score + strengths/weaknesses, blurs college predictions
- **Lead Capture Modal**: Phone + Email to unlock full report
- **Full Dashboard**: College shortlist (Safe/Target/Dream), admission probability charts, AI recommendations, study plan, CTAs

## Phase 4: Admin Section
- New admin page: **Profile Analyzer Leads** (`/admin/profile-analyzer`)
- View all submissions with scores, contact info, exam targets
- Filter by score range, exam type, date
- CSV export
- Analytics cards (total analyses, avg score, conversion rate, top exam targets)

## Phase 5: Integration
- Add nav link to Profile Analyzer on main site
- Add route in App.tsx
- Add admin nav item in AdminLayout

## What's NOT included (would need separate phases):
- OTP verification (requires Twilio connector)
- WhatsApp API integration
- CRM integration (HubSpot/Zoho)
- Meta Pixel / Hotjar
- ML model for Phase 2 predictions
