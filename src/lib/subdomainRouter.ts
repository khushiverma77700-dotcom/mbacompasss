/**
 * Subdomain routing for dashboard.mbacompass.in
 *
 * Same codebase serves two hosts:
 *   - mbacompass.in / www.mbacompass.in → public marketing site
 *   - dashboard.mbacompass.in           → student LMS (/student/*)
 *
 * Rules:
 *   1. On the dashboard host, force every visit into /student/* (or auth pages).
 *      Anyone landing on "/" or a marketing path is redirected to /student.
 *   2. On the main host, /student/* gets redirected over to the dashboard host
 *      so SEO + branding stay clean.
 *   3. Mock runner / result / review / leaderboard / intro pages are allowed
 *      on the dashboard host because students reach them from inside /student/*.
 *      The student-mode nav helper keeps post-submit redirects inside /student/*.
 *   4. Localhost + Lovable preview hosts behave normally — no redirects, so
 *      development is unaffected.
 */

export const DASHBOARD_HOST = "dashboard.mbacompass.in";
export const MAIN_HOSTS = ["mbacompass.in", "www.mbacompass.in"];

/** Paths that are allowed on the dashboard subdomain. */
const DASHBOARD_ALLOWED_PREFIXES = [
  "/student",
  "/mocks",         // mock runner / result / review / intro / leaderboard
  "/courses",       // mock bundle pages students buy from
  "/dashboard",     // legacy generic dashboard
  "/auth",          // shared sign-in
  "/forgot-password",
  "/reset-password",
];

const isDashboardHost = (hostname: string) => hostname === DASHBOARD_HOST;
const isMainHost = (hostname: string) => MAIN_HOSTS.includes(hostname);

/**
 * Returns a target URL string if the current location should be redirected,
 * or null if no redirect is needed. Run as early as possible — before React
 * mounts — so the user never sees a flash of wrong content.
 */
export const computeSubdomainRedirect = (loc: Location): string | null => {
  const { hostname, pathname, search, hash, protocol } = loc;

  // ---- Dashboard host ----
  if (isDashboardHost(hostname)) {
    const allowed = DASHBOARD_ALLOWED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    if (allowed) return null;
    // Anything else on dashboard.* → send to /student
    return `${protocol}//${hostname}/student${search}${hash}`;
  }

  // ---- Main marketing host ----
  if (isMainHost(hostname)) {
    if (pathname === "/student" || pathname.startsWith("/student/")) {
      return `${protocol}//${DASHBOARD_HOST}${pathname}${search}${hash}`;
    }
    return null;
  }

  // Localhost / preview / custom — leave alone.
  return null;
};

/** True when the current host is the dashboard subdomain. */
export const onDashboardHost = (): boolean => {
  if (typeof window === "undefined") return false;
  return isDashboardHost(window.location.hostname);
};

/** True when the current host is the main marketing site. */
export const onMainHost = (): boolean => {
  if (typeof window === "undefined") return false;
  return isMainHost(window.location.hostname);
};

/**
 * Build an absolute URL for a /student/* path, hopping to the dashboard
 * subdomain when the user is currently on the main marketing host.
 * Returns the path unchanged in dev / preview / on the dashboard host already.
 */
export const studentUrl = (path: string): string => {
  if (typeof window === "undefined") return path;
  const safePath = path.startsWith("/") ? path : `/${path}`;
  if (onMainHost()) {
    return `https://${DASHBOARD_HOST}${safePath}`;
  }
  return safePath;
};
