const OAUTH_RETURN_TO_KEY = "oauth-return-to";
const FALLBACK_ORIGIN = "https://bschoolbuzz.com";

export const getAuthRedirectUri = () => {
  if (typeof window === "undefined") return FALLBACK_ORIGIN;

  const { origin, hostname } = window.location;

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "bschoolbuzz.com" ||
    hostname === "www.bschoolbuzz.com" ||
    hostname.endsWith(".lovable.app")
  ) {
    return origin;
  }

  return FALLBACK_ORIGIN;
};

export const normalizeRedirectPath = (path?: string | null) => {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }

  return path;
};

export const storePostAuthRedirect = (path: string) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(OAUTH_RETURN_TO_KEY, normalizeRedirectPath(path));
};

export const consumePostAuthRedirect = () => {
  if (typeof window === "undefined") return null;

  const path = window.sessionStorage.getItem(OAUTH_RETURN_TO_KEY);
  if (!path) return null;

  window.sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
  return normalizeRedirectPath(path);
};

export const getCurrentRelativeUrl = () => {
  if (typeof window === "undefined") return "/";
  return normalizeRedirectPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);
};