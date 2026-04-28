// Marketing "deliverables" admins can toggle on a course's public detail page.
// Stored in mock_bundles.highlights JSONB as { [key]: true } for selected items
// and { [key]: { value: "...custom..." } } for items that need a value (e.g. SLA).

export type HighlightKey =
  | "daily_tests"
  | "personalized_tests"
  | "sectional_tests"
  | "full_length_mocks"
  | "previous_year_papers"
  | "ai_mock_analysis"
  | "advanced_cat_planner"
  | "study_planner"
  | "score_predictor"
  | "leaderboard"
  | "deep_analysis"
  | "topper_videos"
  | "doubt_solving"
  | "support_247"
  | "avg_resolution"
  | "live_classes"
  | "interview_prep"
  | "mentor_calls";

export type HighlightValue = boolean | { value?: string };

export type HighlightMap = Partial<Record<HighlightKey, HighlightValue>>;

export interface HighlightDef {
  key: HighlightKey;
  label: string;
  category: "Tests & Practice" | "AI & Analytics" | "Planning & Mentorship" | "Support";
  description: string;
  defaultValue?: string;     // default text shown when toggled (editable)
  hasValue?: boolean;        // shows an input next to the toggle
  unit?: string;             // e.g. "min" — appended to value when displayed
}

export const HIGHLIGHT_DEFINITIONS: HighlightDef[] = [
  // Tests & Practice
  { key: "full_length_mocks",    label: "Full-length Mocks",            category: "Tests & Practice", description: "Complete simulated exams matching the real paper" },
  { key: "sectional_tests",      label: "Sectional Tests",              category: "Tests & Practice", description: "VARC / DILR / QA section-wise practice" },
  { key: "daily_tests",          label: "Daily Tests",                  category: "Tests & Practice", description: "A fresh curated test every single day" },
  { key: "personalized_tests",   label: "Personalized Tests (AI)",      category: "Tests & Practice", description: "Adaptive tests based on your time & ability" },
  { key: "previous_year_papers", label: "Previous Year Papers",         category: "Tests & Practice", description: "Solved past CAT / NMAT / XAT papers" },

  // AI & Analytics
  { key: "ai_mock_analysis",     label: "AI Mock Analysis",             category: "AI & Analytics", description: "Per-question explanations, weak-topic heatmap" },
  { key: "deep_analysis",        label: "Deep Performance Analysis",    category: "AI & Analytics", description: "Time-per-question, accuracy trends, topic gaps" },
  { key: "score_predictor",      label: "CAT Score Predictor",          category: "AI & Analytics", description: "Real-time percentile prediction" },
  { key: "leaderboard",          label: "All-India Leaderboard",        category: "AI & Analytics", description: "Compare yourself with thousands of aspirants" },

  // Planning & Mentorship
  { key: "advanced_cat_planner", label: "Advanced CAT Planner",         category: "Planning & Mentorship", description: "Day-by-day plan customised to exam date" },
  { key: "study_planner",        label: "AI Study Planner",             category: "Planning & Mentorship", description: "Smart weekly schedule that adapts to your pace" },
  { key: "topper_videos",        label: "Topper Strategy Videos",       category: "Planning & Mentorship", description: "Learn from 99+ percentilers" },
  { key: "mentor_calls",         label: "1:1 Mentor Calls",             category: "Planning & Mentorship", description: "Personal mentorship sessions" },
  { key: "interview_prep",       label: "Interview Prep Kit",           category: "Planning & Mentorship", description: "WAT / GD / PI material and mock interviews" },
  { key: "live_classes",         label: "Live Doubt Classes",           category: "Planning & Mentorship", description: "Weekly live sessions with experts" },

  // Support
  { key: "support_247",          label: "24×7 Support",                 category: "Support", description: "Round-the-clock help, every day of the week" },
  { key: "avg_resolution",       label: "Avg Ticket Resolution",        category: "Support", description: "Typical time we take to resolve a query", hasValue: true, defaultValue: "28", unit: "min" },
  { key: "doubt_solving",        label: "Unlimited Doubt Solving",      category: "Support", description: "Ask as many doubts as you want" },
];

export const isHighlightOn = (h: HighlightMap | undefined, key: HighlightKey): boolean => {
  const v = h?.[key];
  return v === true || (typeof v === "object" && v !== null);
};

export const getHighlightValue = (h: HighlightMap | undefined, key: HighlightKey): string | undefined => {
  const v = h?.[key];
  if (typeof v === "object" && v !== null) return v.value;
  return undefined;
};
