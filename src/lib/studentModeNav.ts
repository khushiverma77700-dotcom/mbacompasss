/**
 * Student-mode navigation helper.
 *
 * Mocks (intro / runner / result / review / leaderboard) live under public
 * /mocks/* routes, but students reach them from inside the /student/*
 * dashboard. Without help, the browser back button takes a student outside
 * the dashboard and eventually to the homepage.
 *
 * We persist a "student mode" flag in sessionStorage as soon as a user lands
 * inside StudentLayout. Mock pages then use this flag to:
 *   - rewrite their "Back" buttons to a /student/* destination
 *   - rewrite post-submit redirects to /student/mocks/attempted (replace:true)
 *
 * This keeps every back press inside the dashboard, without needing a
 * separate subdomain or router restructure.
 */

const KEY = "mbc-student-mode";

export const markStudentMode = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {}
};

export const clearStudentMode = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
};

export const isStudentMode = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Where to send a student after submitting a mock (replaces runner in history). */
export const studentPostSubmitPath = (attemptId?: string | null) =>
  attemptId ? `/student/mocks/attempted?focus=${attemptId}` : "/student/mocks/attempted";

/** Where the "Back to mocks" button should land for students. */
export const studentBackToMocksPath = () => "/student/mocks/full-length";

/** Where the dashboard "home" lives. */
export const studentHomePath = () => "/student";
