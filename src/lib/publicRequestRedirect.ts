import { publicPath } from "./publicPaths";

/** Resolve only known public aliases; never redirect dashboard, preview or external hosts. */
export function publicRequestRedirect(request: Request): Response | undefined {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const url = new URL(request.url);
  if (url.hostname !== "mbacompass.in" && url.hostname !== "www.mbacompass.in") return;
  const normalizedPath = publicPath(url.pathname.replace(/\/$/, "") || "/");
  if (url.hostname !== "www.mbacompass.in" && normalizedPath === (url.pathname.replace(/\/$/, "") || "/")) return;
  url.protocol = "https:";
  url.host = "mbacompass.in";
  url.pathname = normalizedPath;
  return new Response(null, { status: 301, headers: { Location: url.href } });
}