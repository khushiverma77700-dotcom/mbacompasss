// Demo Dashboard was removed to reduce backend load.
// These exports are kept as empty stubs so any leftover `isDemo`-gated code
// continues to compile. They are never read at runtime because
// `useIsDemo()` always returns false now that DemoShell is gone.

export const DEMO_ATTEMPTS: any[] = [];
export const DEMO_PROFILE: any = {};
export const DEMO_TASKS: any[] = [];
export const DEMO_GOALS: any[] = [];
export const DEMO_STUDY_PROFILE: any = {};
export const DEMO_WEAK_TOPICS: any[] = [];
export const DEMO_REWARDS: any = {};
export const DEMO_ENROLLMENTS: any[] = [];
export const DEMO_EXAM_COUNTDOWNS: any[] = [];
export const DEMO_LEADERBOARD_RANK: number | null = null;
