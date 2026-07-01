// Demo data for /demo student dashboard tour.
// Persona: "Aman Verma" — a serious CAT 2026 aspirant. All values are
// hand-tuned to look like a healthy, mid-to-top-percentile student so every
// widget on the overview / performance / vocab / formula pages renders with
// meaningful visuals instead of empty states.

const daysAgo = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  return t.toISOString();
};
const daysAhead = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString();
};

export const DEMO_PROFILE = {
  display_name: "Aman Verma",
  email: "aman.demo@mbacompass.in",
};

export const DEMO_STUDY_PROFILE = {
  target_exam: "CAT",
  target_percentile: 99,
  target_colleges: ["IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta"],
  weekly_hours_goal: 28,
  preferred_slot: "evening",
  weakest_section: "LRDI",
};

export const DEMO_ATTEMPTS = [
  {
    id: "demo-a1", test_id: "demo-t1", user_id: "demo-user",
    status: "submitted",
    percentile: 96.4, total_score: 138, max_score: 198, accuracy: 78,
    total_correct: 51, total_attempted: 65, total_incorrect: 14,
    started_at: daysAgo(2), submitted_at: daysAgo(2),
    test: { name: "MBA Compass CAT Full Mock 08", slug: "cat-fm-08", exam_code: "CAT" },
    sectional_scores: {
      VARC: { score: 48, max_score: 72, correct: 18, attempted: 22, percentile: 94 },
      LRDI: { score: 38, max_score: 60, correct: 14, attempted: 18, percentile: 92 },
      QA:   { score: 52, max_score: 66, correct: 19, attempted: 22, percentile: 97 },
    },
  },
  {
    id: "demo-a2", test_id: "demo-t2", user_id: "demo-user",
    status: "submitted",
    percentile: 94.1, total_score: 129, max_score: 198, accuracy: 74,
    total_correct: 47, total_attempted: 64, total_incorrect: 17,
    started_at: daysAgo(6), submitted_at: daysAgo(6),
    test: { name: "MBA Compass CAT Full Mock 07", slug: "cat-fm-07", exam_code: "CAT" },
    sectional_scores: {
      VARC: { score: 44, max_score: 72, correct: 16, attempted: 21, percentile: 90 },
      LRDI: { score: 36, max_score: 60, correct: 13, attempted: 17, percentile: 90 },
      QA:   { score: 49, max_score: 66, correct: 18, attempted: 21, percentile: 95 },
    },
  },
  {
    id: "demo-a3", test_id: "demo-t3", user_id: "demo-user",
    status: "submitted",
    percentile: 91.8, total_score: 121, max_score: 198, accuracy: 71,
    total_correct: 44, total_attempted: 62, total_incorrect: 18,
    started_at: daysAgo(10), submitted_at: daysAgo(10),
    test: { name: "MBA Compass CAT Full Mock 06", slug: "cat-fm-06", exam_code: "CAT" },
    sectional_scores: {
      VARC: { score: 42, max_score: 72, correct: 15, attempted: 20, percentile: 88 },
      LRDI: { score: 33, max_score: 60, correct: 12, attempted: 17, percentile: 86 },
      QA:   { score: 46, max_score: 66, correct: 17, attempted: 21, percentile: 93 },
    },
  },
  {
    id: "demo-a4", test_id: "demo-t4", user_id: "demo-user",
    status: "submitted",
    percentile: 89.2, total_score: 114, max_score: 198, accuracy: 68,
    total_correct: 41, total_attempted: 60, total_incorrect: 19,
    started_at: daysAgo(15), submitted_at: daysAgo(15),
    test: { name: "MBA Compass CAT Sectional — QA 04", slug: "cat-sec-qa-04", exam_code: "CAT" },
    sectional_scores: {
      QA: { score: 44, max_score: 66, correct: 16, attempted: 20, percentile: 92 },
    },
  },
  {
    id: "demo-a5", test_id: "demo-t5", user_id: "demo-user",
    status: "submitted",
    percentile: 87.5, total_score: 108, max_score: 198, accuracy: 65,
    total_correct: 39, total_attempted: 60, total_incorrect: 21,
    started_at: daysAgo(20), submitted_at: daysAgo(20),
    test: { name: "MBA Compass CAT Full Mock 05", slug: "cat-fm-05", exam_code: "CAT" },
    sectional_scores: {
      VARC: { score: 38, max_score: 72, correct: 14, attempted: 20, percentile: 84 },
      LRDI: { score: 30, max_score: 60, correct: 11, attempted: 17, percentile: 82 },
      QA:   { score: 40, max_score: 66, correct: 15, attempted: 20, percentile: 90 },
    },
  },
  {
    id: "demo-a6", test_id: "demo-t6", user_id: "demo-user",
    status: "submitted",
    percentile: 83.1, total_score: 98, max_score: 198, accuracy: 61,
    total_correct: 35, total_attempted: 57, total_incorrect: 22,
    started_at: daysAgo(28), submitted_at: daysAgo(28),
    test: { name: "MBA Compass CAT Full Mock 04", slug: "cat-fm-04", exam_code: "CAT" },
    sectional_scores: {
      VARC: { score: 34, max_score: 72, correct: 13, attempted: 20, percentile: 80 },
      LRDI: { score: 28, max_score: 60, correct: 10, attempted: 17, percentile: 78 },
      QA:   { score: 36, max_score: 66, correct: 13, attempted: 19, percentile: 86 },
    },
  },
];

export const DEMO_TASKS = [
  { id: "t1", title: "Solve 20 QA questions (Arithmetic)", is_completed: true,  task_date: new Date().toISOString().slice(0,10) },
  { id: "t2", title: "Read 2 RC passages + review",         is_completed: true,  task_date: new Date().toISOString().slice(0,10) },
  { id: "t3", title: "Revise Time-Speed-Distance formulas", is_completed: true,  task_date: new Date().toISOString().slice(0,10) },
  { id: "t4", title: "Attempt Sectional Mock — LRDI 09",    is_completed: false, task_date: new Date().toISOString().slice(0,10) },
  { id: "t5", title: "Learn 10 new MBA vocab words",        is_completed: false, task_date: new Date().toISOString().slice(0,10) },
];

export const DEMO_GOALS = [
  { id: "g1", title: "Hit 99+ percentile in next CAT full mock", due_date: daysAhead(9),  is_completed: false, progress: 72 },
  { id: "g2", title: "Complete Arithmetic formula book",         due_date: daysAhead(14), is_completed: false, progress: 60 },
  { id: "g3", title: "Finish 500 MBA vocabulary words",          due_date: daysAhead(30), is_completed: false, progress: 44 },
];

export const DEMO_WEAK_TOPICS = [
  { id: "w1", topic: "Data Interpretation — Caselets", section: "LRDI", level: 1, accuracy: 52 },
  { id: "w2", topic: "Para-jumbles",                    section: "VARC", level: 1, accuracy: 58 },
  { id: "w3", topic: "Number System — Remainders",      section: "QA",   level: 2, accuracy: 61 },
  { id: "w4", topic: "Logical Reasoning — Arrangements", section: "LRDI", level: 2, accuracy: 64 },
  { id: "w5", topic: "Geometry — Circles",              section: "QA",   level: 2, accuracy: 66 },
];

export const DEMO_REWARDS = {
  total_xp: 4280, xp: 4280, level: 12, coins: 640,
  streak_days: 18, longest_streak: 27,
};

export const DEMO_ENROLLMENTS = [
  { id: "e1", test_id: "demo-next-1", source: "bundle", enrolled_at: daysAgo(3),  expires_at: daysAhead(60),
    test: { name: "MBA Compass CAT Full Mock 09", slug: "cat-fm-09", exam_code: "CAT" } },
  { id: "e2", test_id: "demo-next-2", source: "bundle", enrolled_at: daysAgo(3),  expires_at: daysAhead(60),
    test: { name: "MBA Compass CAT Full Mock 10", slug: "cat-fm-10", exam_code: "CAT" } },
  { id: "e3", test_id: "demo-next-3", source: "bundle", enrolled_at: daysAgo(3),  expires_at: daysAhead(60),
    test: { name: "MBA Compass XAT Full Mock 03", slug: "xat-fm-03", exam_code: "XAT" } },
];

export const DEMO_EXAM_COUNTDOWNS = [
  { name: "CAT 2026",   slug: "cat-2026",   exam_date: daysAhead(42) },
  { name: "XAT 2027",   slug: "xat-2027",   exam_date: daysAhead(70) },
  { name: "SNAP 2026",  slug: "snap-2026",  exam_date: daysAhead(55) },
  { name: "NMAT 2026",  slug: "nmat-2026",  exam_date: daysAhead(28) },
  { name: "IIFT 2027",  slug: "iift-2027",  exam_date: daysAhead(80) },
];

export const DEMO_LEADERBOARD_RANK: number | null = 142;
