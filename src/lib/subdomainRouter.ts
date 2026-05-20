/**
 * Subdomain routing for dashboard.mbacompass.in
 *
 * Same codebase serves two hosts, but they own different sections:
 *   - mbacompass.in / www.mbacompass.in → public marketing site
 *       Owns: home, /colleges, /exams, /coaching, /mocks, /courses, /blog,
 *             /auth, etc. (everything public)
 *   - dashboard.mbacompass.in           → student LMS only
 *       Owns: /student/*, mock-taking/report routes, and shared auth pages.
 *
 * Rules:
 *   1. On the dashboard host, only /student/*, /mocks/* test/report routes,
 *      and auth pages render. Anything else is bounced to / so the dashboard
 *      subdomain stays a clean LMS surface while still letting students open
 *      Report, Review, Resume, and Retake screens.
 *   2. On the main marketing host we DO NOT redirect anything. /mocks,
 *      /courses, /student all render normally on bschoolbuzz / mbacompass.
 *      The two hosts operate independently — no cross-host hops.
 *   3. Localhost + Lovable preview hosts behave normally — no redirects.
 */

export const DASHBOARD_HOST = "dashboard.mbacompass.in";
export const MAIN_HOSTS = ["mbacompass.in", "www.mbacompass.in"];

/** Paths that are allowed on the dashboard subdomain. */
const DASHBOARD_ALLOWED_PREFIXES = [
  "/student",
  "/mocks",
  "/auth",
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

  // ---- Dashboard host: lock to /student/* + auth, but keep "/" as the home ----
  if (isDashboardHost(hostname)) {
    if (pathname === "/" || pathname === "") return null;
    const allowed = DASHBOARD_ALLOWED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    if (allowed) return null;
    return `${protocol}//${hostname}/${search}${hash}`;
  }

  // ---- Main marketing host: no redirects, hosts are independent. ----
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
 * Build a path/URL for a /student/* destination.
 * Returns a same-origin path unchanged. We intentionally do NOT auto-hop to
 * the dashboard subdomain here — the two hosts operate independently and a
 * student visiting the main site can still use /student locally.
 */
export const studentUrl = (path: string): string => {
  return path.startsWith("/") ? path : `/${path}`;
};
