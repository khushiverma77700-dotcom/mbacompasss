
ALTER TABLE public.mocks_landing_settings
  ADD COLUMN IF NOT EXISTS day_planner_block jsonb NOT NULL DEFAULT '{
    "enabled": true,
    "eyebrow": "Free for every aspirant",
    "title": "CAT Day Planner — Free Access",
    "subtitle": "An adaptive 90-day study planner that turns your CAT prep into a daily, trackable ritual. No card needed.",
    "cta_label": "Open Free Day Planner",
    "cta_url": "/student/day-planner",
    "features": [
      {"icon":"CalendarCheck","title":"Adaptive daily tasks","desc":"Auto-rebalances QA, VARC and DILR every day based on your last mock."},
      {"icon":"Activity","title":"Real-time progress","desc":"Streaks, XP, completion analytics and weekly snapshots."},
      {"icon":"Target","title":"Topic mastery","desc":"Topic-wise mastery rings update as you finish each task."},
      {"icon":"Sparkles","title":"AI suggestions","desc":"Smart nudges on what to revise tonight to gain the most marks tomorrow."}
    ],
    "stats": [
      {"label":"Daily tasks","value":"6-8"},
      {"label":"Sections covered","value":"QA · VARC · DILR"},
      {"label":"Avg study time","value":"2h / day"}
    ]
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS courses_cta_block jsonb NOT NULL DEFAULT '{
    "enabled": true,
    "eyebrow": "Mock Bundles & Courses",
    "title": "Save more with curated mock bundles",
    "subtitle": "Buy a complete CAT, XAT, NMAT or SNAP bundle in one click. Every mock unlocks instantly in your dashboard.",
    "cta_label": "Browse all courses",
    "cta_url": "/courses",
    "secondary_label": "View pricing",
    "highlights": [
      "10+ full-length mocks per bundle",
      "Instant unlock in student dashboard",
      "365-day validity",
      "AI-powered analysis on every attempt"
    ]
  }'::jsonb;

ALTER TABLE public.mock_bundles
  ADD COLUMN IF NOT EXISTS highlight_on_mocks boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_price_inr numeric;
