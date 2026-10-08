import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  HTML_FRESH_MS,
  HTML_MAX_STALE_MS,
  cacheKeyFor,
  cachedResponse,
  entryAge,
  isCacheableRequest,
  isCacheableResponse,
  readCached,
  storeCached,
} from "./lib/htmlEdgeCache";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function render(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}

type WaitCtx = { waitUntil?: (p: Promise<unknown>) => void };
const refreshing = new Set<string>();

function canWait(ctx: unknown) {
  return typeof (ctx as WaitCtx | undefined)?.waitUntil === "function";
}

function background(ctx: unknown, task: Promise<unknown>) {
  const safe = task.catch(() => undefined);
  if (canWait(ctx)) (ctx as Required<WaitCtx>).waitUntil(safe);
}

async function renderAndStore(key: string, request: Request, env: unknown, ctx: unknown) {
  const response = await render(request, env, ctx);
  if (!isCacheableResponse(response)) return response;
  if (canWait(ctx)) {
    background(ctx, storeCached(key, response.clone()));
    return response;
  }
  // No background hook: finish storing before replying so the copy is kept.
  try {
    await storeCached(key, response.clone());
  } catch {
    /* serve the render regardless */
  }
  return response;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Shared public pages are served from the HTML cache (dev renders live).
    if (import.meta.env.DEV || !isCacheableRequest(request)) return render(request, env, ctx);

    const key = cacheKeyFor(request);
    const entry = await readCached(key);
    if (entry) {
      const age = entryAge(entry);
      if (age < HTML_FRESH_MS) return cachedResponse(entry, "fresh");
      if (age < HTML_MAX_STALE_MS) {
        if (!refreshing.has(key)) {
          refreshing.add(key);
          background(
            ctx,
            renderAndStore(key, request.clone(), env, ctx)
              .then((r) => r.body?.cancel())
              .finally(() => refreshing.delete(key)),
          );
        }
        return cachedResponse(entry, "stale");
      }
    }
    return renderAndStore(key, request, env, ctx);
  },
};
