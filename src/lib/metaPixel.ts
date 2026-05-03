// Meta (Facebook/Instagram) Pixel helper.
// - Lazy script injection (only loads after a Pixel ID is known)
// - eventID is generated and returned so a server-side Conversions API
//   call can dedupe later without code changes here.
// - useMetaPixel() hook reads the Pixel ID from mocks_landing_settings
//   (cached in sessionStorage) so /mocks, /courses, /courses/:slug share
//   the same ID without an extra round-trip.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: ((...args: any[]) => void) & {
      callMethod?: any; queue?: any[]; loaded?: boolean; version?: string; push?: any;
    };
    _fbq?: any;
  }
}

let initialisedFor: string | null = null;
const SS_KEY = "mc_meta_pixel_id";

export function initMetaPixel(pixelId?: string | null) {
  if (!pixelId || typeof window === "undefined") return;
  if (initialisedFor === pixelId) return;

  if (!window.fbq) {
    /* eslint-disable */
    (function (f: any, b: any, e: any, v: any) {
      let n: any, t: any, s: any;
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
  }
  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView", {}, { eventID: makeEventId("PageView") });
  initialisedFor = pixelId;
}

function makeEventId(event: string) {
  // Stable-ish id: event + ms + random. Used by CAPI later for dedup.
  return `${event}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
}

export function pixelTrack(event: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || !window.fbq) return;
  const eventID = makeEventId(event);
  try {
    window.fbq("track", event, params || {}, { eventID });
  } catch {
    // noop
  }
  return eventID;
}

/**
 * Resolve the Meta Pixel ID once per session (cached in sessionStorage)
 * and initialise the pixel + fire a ViewContent for the current page.
 */
export function useMetaPixel(opts?: {
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
}) {
  const [pixelId, setPixelId] = useState<string | null>(() => {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage.getItem(SS_KEY);
  });

  // Fetch once if not cached
  useEffect(() => {
    if (pixelId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("mocks_landing_settings")
        .select("meta_pixel_id")
        .maybeSingle();
      const id = (data as any)?.meta_pixel_id || null;
      if (cancelled) return;
      if (id) {
        try { sessionStorage.setItem(SS_KEY, id); } catch {}
        setPixelId(id);
      }
    })();
    return () => { cancelled = true; };
  }, [pixelId]);

  // Init + ViewContent whenever pixelId or content changes
  useEffect(() => {
    if (!pixelId) return;
    initMetaPixel(pixelId);
    if (opts?.contentName) {
      pixelTrack("ViewContent", {
        content_name: opts.contentName,
        content_category: opts.contentCategory,
        content_ids: opts.contentIds,
        content_type: "product",
        value: opts.value,
        currency: opts.currency || "INR",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelId, opts?.contentName, opts?.value]);

  return pixelId;
}
