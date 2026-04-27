-- Add new JSONB columns for richer landing page content
ALTER TABLE public.mocks_landing_settings
  ADD COLUMN IF NOT EXISTS why_us_title text DEFAULT 'Why MBA Compass Mocks?',
  ADD COLUMN IF NOT EXISTS why_us_subtitle text DEFAULT 'India''s most analytical mock test platform — built by IIM alumni, trusted by 25,000+ aspirants.',
  ADD COLUMN IF NOT EXISTS why_us_points jsonb DEFAULT '[
    {"icon":"BrainCircuit","title":"AI-Powered Analysis","desc":"15+ visual reports per mock — uncover patterns no other platform shows you."},
    {"icon":"Target","title":"Real CAT Difficulty","desc":"Designed by 99.9 percentilers using actual CAT 2018-2024 difficulty calibration."},
    {"icon":"TrendingUp","title":"Verified Score Improvement","desc":"Aspirants average a 12-percentile jump in 6 mocks. Money-back if you don''t improve."},
    {"icon":"ShieldCheck","title":"100% Satisfaction Guarantee","desc":"7-day refund. No questions asked. We back our product."}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_testimonials jsonb DEFAULT '[
    {"name":"Aarav Sharma","score":"99.87 %ile · IIM-A","quote":"The error tracker pinpointed exactly where I was losing marks. Jumped from 92 to 99.87 in 8 mocks.","avatar":""},
    {"name":"Priya Mehta","score":"99.42 %ile · IIM-B","quote":"AI insights felt like a personal coach. The topic-wise radar chart changed how I studied.","avatar":""},
    {"name":"Rohan Iyer","score":"98.9 %ile · FMS","quote":"The platform UX is leagues ahead — felt like the actual CAT interface. Resume feature saved me hours.","avatar":""},
    {"name":"Ananya Gupta","score":"99.6 %ile · IIM-C","quote":"Speed vs accuracy graph showed I was rushing QA. Fixed it in 2 mocks. Best investment ever.","avatar":""},
    {"name":"Karthik Rao","score":"99.1 %ile · MDI","quote":"B-school predictor was scarily accurate. Got the calls it predicted. Worth every rupee.","avatar":""},
    {"name":"Sneha Patil","score":"98.7 %ile · IIM-L","quote":"Goal tracker kept me on schedule. The dashboard is beautiful and incredibly motivating.","avatar":""},
    {"name":"Vikram Joshi","score":"99.3 %ile · IIM-K","quote":"Switched from a top competitor — the depth of analytics here is on another level entirely.","avatar":""},
    {"name":"Ishita Verma","score":"99.55 %ile · IIM-I","quote":"Sectional analysis showed VARC was my hidden weakness. Worked on it and percentile soared.","avatar":""}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS student_analyses jsonb DEFAULT '[
    {"name":"Aarav Sharma","score":"99.87 %ile","image_url":"","summary":"Improved VARC accuracy from 62% to 84% across 10 mocks via topic-wise drilldowns."},
    {"name":"Priya Mehta","score":"99.42 %ile","image_url":"","summary":"Cut average DILR time by 22% using time-allocation heatmaps and difficulty filters."}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS student_feedback_text jsonb DEFAULT '[
    {"name":"Rohan Iyer","tag":"CAT 2024 · 98.9 %ile","quote":"The mock interface is identical to actual CAT. Zero surprises on D-day."},
    {"name":"Sneha Patil","tag":"CAT 2024 · 98.7 %ile","quote":"Resume mock saved my prep — life happens, and this platform respects that."},
    {"name":"Karthik Rao","tag":"CAT 2024 · 99.1 %ile","quote":"B-school predictor accuracy is wild. Predicted my exact call list."}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS student_feedback_images jsonb DEFAULT '[
    {"image_url":"","caption":"WhatsApp feedback — Aarav S."},
    {"image_url":"","caption":"Email review — Priya M."},
    {"image_url":"","caption":"Result screenshot — Rohan I."}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS expert_feedback jsonb DEFAULT '[
    {"name":"Prof. Arvind Kumar","title":"Ex-IIM-A Faculty · 22 yrs CAT mentoring","image_url":"","quote":"The analytical depth of these mocks is unmatched. The AI-driven topic radar is a game-changer for serious aspirants."},
    {"name":"Dr. Meena Iyer","title":"99.99 %ile · IIM-B Alumna","image_url":"","quote":"What sets MBA Compass apart is the granularity. Most platforms tell you what went wrong — this one tells you why."}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS platform_features jsonb DEFAULT '[
    {"icon":"Target","title":"Goal Tracker","desc":"Set percentile targets, track weekly milestones, and stay accountable with smart reminders."},
    {"icon":"Activity","title":"Error Tracker","desc":"Auto-flags repeat mistakes by topic & question type so you stop the bleeding fast."},
    {"icon":"PlayCircle","title":"Resume CAT Mock","desc":"Pause and resume any mock — no progress lost, no data sync issues."},
    {"icon":"GraduationCap","title":"B-School Predictor","desc":"Get a probability-ranked call list across IIMs, FMS, MDI, SPJIMR & more."},
    {"icon":"BarChart3","title":"Sectional Deep-Dive","desc":"Section-wise difficulty heatmaps, time allocation, and accuracy drilldowns."},
    {"icon":"Users","title":"Peer Benchmarking","desc":"Compare every metric against the top 1% — see exactly what to fix."}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_report_title text DEFAULT 'CAT Mock Analysis — Powered by AI',
  ADD COLUMN IF NOT EXISTS ai_report_subtitle text DEFAULT '16+ visual reports auto-generated after every mock. See exactly where you stand and what to fix.';

-- Seed reasonable comparison defaults if comparison is empty/null
UPDATE public.mocks_landing_settings
SET comparison = '[
  {"feature":"AI-powered analytical reports (16+)","us":true,"others":false},
  {"feature":"Topic-wise radar & error tracker","us":true,"others":false},
  {"feature":"Resume mock anytime","us":true,"others":false},
  {"feature":"B-School call predictor","us":true,"others":false},
  {"feature":"FREE AI Profile Analyzer access","us":true,"others":false},
  {"feature":"FREE MBA ROI Calculator access","us":true,"others":false},
  {"feature":"Real CAT-like interface","us":true,"others":true},
  {"feature":"Detailed solutions","us":true,"others":true},
  {"feature":"Peer benchmarking vs top 1%","us":true,"others":false},
  {"feature":"7-day money-back guarantee","us":true,"others":false}
]'::jsonb
WHERE comparison IS NULL OR jsonb_array_length(comparison) = 0;