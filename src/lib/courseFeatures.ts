// Single source of truth for student-dashboard features that admins can include
// in a course bundle. Keep keys stable — they are stored in mock_bundles.features JSONB.

export type FeatureKey =
  | "study_planner"
  | "performance_tracker"
  | "daily_tests"
  | "daily_mocks"
  | "previous_year_papers"
  | "personalized_hub"
  | "deep_analysis"
  | "leaderboard"
  | "score_predictor"
  | "ai_insights"
  | "day_planner"
  | "ai_tools"
  | "vocabulary_hub"
  | "formula_book"
  | "buy_mocks"
  | "support";

export const FEATURE_DEFINITIONS: { key: FeatureKey; label: string; description: string }[] = [
  { key: "study_planner",        label: "CAT Study Planner",       description: "AI-driven weekly study plan and goals" },
  { key: "performance_tracker",  label: "Performance Tracker",     description: "Score charts, accuracy, percentile trends" },
  { key: "daily_tests",          label: "Daily Tests",             description: "Daily curated practice tests" },
  { key: "daily_mocks",          label: "Daily Mocks",             description: "Fresh full-length mock every day" },
  { key: "previous_year_papers", label: "Previous Year Papers",    description: "Solved past CAT/XAT/NMAT papers" },
  { key: "personalized_hub",     label: "Personalized Mock Hub",   description: "AI-generated personalised mocks" },
  { key: "deep_analysis",        label: "Deep Analysis",           description: "Per-question solution + topic heatmap" },
  { key: "leaderboard",          label: "Leaderboard",             description: "All-India ranks and percentile" },
  { key: "score_predictor",      label: "CAT Score Predictor",     description: "Real-time percentile predictor" },
  { key: "ai_insights",          label: "AI Insights & Goals",     description: "Weak-topic detection + custom goals" },
  { key: "day_planner",          label: "My Day Planner",          description: "Daily task tracker + XP rewards" },
  { key: "ai_tools",             label: "AI Tools",                description: "Profile analyzer, college finder, etc." },
  { key: "vocabulary_hub",       label: "B-School Vocabulary Hub", description: "AI MBA vocab builder, daily word, quizzes, revision" },
  { key: "formula_book",         label: "Quant Formula Book",      description: "AI-powered MBA quant formula revision dashboard" },
  { key: "buy_mocks",            label: "Buy More Mocks",          description: "Access in-app store for add-on mocks" },
  { key: "support",              label: "Support Center",          description: "Ticket-based 1:1 support" },
];

// Default: an empty {} means a brand-new bundle has nothing enabled yet.
// However when no bundle is saved against a student (legacy) we treat all as on.
export type FeatureMap = Partial<Record<FeatureKey, boolean>>;

export const allFeaturesOn = (): FeatureMap =>
  Object.fromEntries(FEATURE_DEFINITIONS.map((f) => [f.key, true])) as FeatureMap;
