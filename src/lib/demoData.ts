/**
 * Hardcoded "Aman Verma" dummy dataset used to populate every chart, widget
 * and list when the user is browsing /demo/*. The real /student/* dashboard
 * never touches this file — it is only read inside `if (isDemo)` short-circuit
 * branches in data-fetching hooks and page components.
 *
 * Shape mirrors the rows returned by the real Supabase tables so the rest of
 * the UI can consume it without any per-component refactor.
 */

export const DEMO_USER_ID = "demo-user";

export const DEMO_PROFILE = {
  display_name: "Aman Verma",
  email: "aman@demo.in",
  target_exam: "CAT 2026",
  target_college: "IIM Ahmedabad",
};

const today = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = (d: number) =>
  new Date(Date.now() - d * 86400000).toISOString();

/** 7 submitted mocks with realistic CAT-grade percentile trajectory. */
export const DEMO_ATTEMPTS = [
  { mock: 1, percentile: 79.0, score: 64, max: 198, correct: 36, attempted: 48, accuracy: 75, daysAgo: 49 },
  { mock: 2, percentile: 84.6, score: 72, max: 198, correct: 41, attempted: 52, accuracy: 79, daysAgo: 42 },
  { mock: 3, percentile: 82.9, score: 69, max: 198, correct: 39, attempted: 50, accuracy: 78, daysAgo: 35 },
  { mock: 4, percentile: 90.1, score: 81, max: 198, correct: 46, attempted: 56, accuracy: 82, daysAgo: 28 },
  { mock: 5, percentile: 93.4, score: 86, max: 198, correct: 49, attempted: 58, accuracy: 84, daysAgo: 21 },
  { mock: 6, percentile: 95.2, score: 90, max: 198, correct: 51, attempted: 60, accuracy: 85, daysAgo: 14 },
  { mock: 7, percentile: 97.1, score: 94, max: 198, correct: 53, attempted: 62, accuracy: 86, daysAgo: 7 },
].map((m) => ({
  id: `demo-attempt-${m.mock}`,
  test_id: `demo-test-${m.mock}`,
  user_id: DEMO_USER_ID,
  status: "submitted",
  started_at: isoDaysAgo(m.daysAgo),
  submitted_at: new Date(new Date(isoDaysAgo(m.daysAgo)).getTime() + 120 * 60 * 1000).toISOString(),
  total_score: m.score,
  max_score: m.max,
  percentile: m.percentile,
  total_correct: m.correct,
  total_attempted: m.attempted,
  total_incorrect: m.attempted - m.correct,
  accuracy: m.accuracy,
  sectional_scores: {
    VARC: { score: Math.round(m.score * 0.36), max_score: 72, correct: Math.round(m.correct * 0.35), attempted: Math.round(m.attempted * 0.36), percentile: Math.min(99, m.percentile - 5) },
    DILR: { score: Math.round(m.score * 0.28), max_score: 60, correct: Math.round(m.correct * 0.3),  attempted: Math.round(m.attempted * 0.3),  percentile: Math.min(99, m.percentile - 8) },
    QA:   { score: Math.round(m.score * 0.36), max_score: 66, correct: Math.round(m.correct * 0.35), attempted: Math.round(m.attempted * 0.34), percentile: Math.min(99, m.percentile + 2) },
  },
  test: { name: `CAT Adaptive Mock #${m.mock}`, slug: `cat-adaptive-${m.mock}`, exam_code: "CAT", test_type: "full_length" },
}));

export const DEMO_ENROLLMENTS = [
  { id: "demo-enr-1", test_id: "demo-test-8", source: "course", expires_at: null, enrolled_at: isoDaysAgo(45),
    test: { name: "CAT Full Mock #8 — Adaptive", slug: "cat-full-mock-8", exam_code: "CAT" } },
  { id: "demo-enr-2", test_id: "demo-test-9", source: "course", expires_at: null, enrolled_at: isoDaysAgo(38),
    test: { name: "XAT Decision Making Drill", slug: "xat-dm-drill", exam_code: "XAT" } },
  { id: "demo-enr-3", test_id: "demo-test-10", source: "course", expires_at: null, enrolled_at: isoDaysAgo(20),
    test: { name: "NMAT Speed Test #07", slug: "nmat-speed-7", exam_code: "NMAT" } },
];

export const DEMO_TASKS = [
  { id: "demo-task-1", user_id: DEMO_USER_ID, task_date: today(), title: "RC Practice — 3 passages",        section: "VARC",   is_completed: true,  scheduled_time: "07:00" },
  { id: "demo-task-2", user_id: DEMO_USER_ID, task_date: today(), title: "Geometry concept + 20Q drill",     section: "QA",     is_completed: true,  scheduled_time: "10:00" },
  { id: "demo-task-3", user_id: DEMO_USER_ID, task_date: today(), title: "DILR Caselet — 4 sets",            section: "DILR",   is_completed: false, scheduled_time: "13:30" },
  { id: "demo-task-4", user_id: DEMO_USER_ID, task_date: today(), title: "GK 50 — Daily Current Affairs",    section: "GK",     is_completed: false, scheduled_time: "17:00" },
  { id: "demo-task-5", user_id: DEMO_USER_ID, task_date: today(), title: "Mock #15 review + error log",      section: "Review", is_completed: false, scheduled_time: "20:00" },
];

export const DEMO_GOALS = [
  { id: "demo-goal-1", user_id: DEMO_USER_ID, title: "Hit 98%ile on next full mock",     due_date: isoDaysAgo(-7),  is_completed: false, progress: 78 },
  { id: "demo-goal-2", user_id: DEMO_USER_ID, title: "Complete 60 DILR caselets",         due_date: isoDaysAgo(-14), is_completed: false, progress: 62 },
  { id: "demo-goal-3", user_id: DEMO_USER_ID, title: "Master Geometry & Mensuration",     due_date: isoDaysAgo(-21), is_completed: false, progress: 45 },
];

export const DEMO_WEAK_TOPICS = [
  { id: "demo-weak-1", user_id: DEMO_USER_ID, topic: "LR Sets — Conditional Distribution",         section: "DILR", level: 2, accuracy: 58 },
  { id: "demo-weak-2", user_id: DEMO_USER_ID, topic: "Permutation & Combination — Circular",        section: "QA",   level: 3, accuracy: 62 },
  { id: "demo-weak-3", user_id: DEMO_USER_ID, topic: "Para Jumble — 6-sentence",                    section: "VARC", level: 3, accuracy: 64 },
  { id: "demo-weak-4", user_id: DEMO_USER_ID, topic: "Geometry — Coordinate Loci",                  section: "QA",   level: 3, accuracy: 66 },
  { id: "demo-weak-5", user_id: DEMO_USER_ID, topic: "DI Caselet — Multi-table",                    section: "DILR", level: 4, accuracy: 71 },
  { id: "demo-weak-6", user_id: DEMO_USER_ID, topic: "RC — Inference vs Stated Fact",               section: "VARC", level: 4, accuracy: 73 },
];

export const DEMO_REWARDS = {
  id: "demo-rewards",
  user_id: DEMO_USER_ID,
  xp: 11280,
  level: 17,
  streak_days: 34,
  last_active_date: today(),
  badges_earned: 12,
};

export const DEMO_LEADERBOARD_RANK = 248;

export const DEMO_EXAM_COUNTDOWNS = [
  { name: "CAT 2026",  slug: "cat-2026",  exam_date: new Date(Date.now() + 92  * 86400000).toISOString() },
  { name: "XAT 2027",  slug: "xat-2027",  exam_date: new Date(Date.now() + 145 * 86400000).toISOString() },
  { name: "NMAT 2026", slug: "nmat-2026", exam_date: new Date(Date.now() + 38  * 86400000).toISOString() },
  { name: "SNAP 2026", slug: "snap-2026", exam_date: new Date(Date.now() + 67  * 86400000).toISOString() },
];

export const DEMO_STUDY_PROFILE = {
  id: "demo-profile",
  user_id: DEMO_USER_ID,
  target_exam: "CAT 2026",
  target_college: "IIM Ahmedabad",
  hours_per_day: 6,
  preferred_slots: ["morning", "evening"],
};
