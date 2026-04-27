// Meta (Facebook/Instagram) Pixel helper
// Loads the pixel lazily once a Pixel ID is known, then exposes typed event helpers.

declare global {
  interface Window {
    fbq?: ((...args: any[]) => void) & { callMethod?: any; queue?: any[]; loaded?: boolean; version?: string; push?: any };
    _fbq?: any;
  }
}

let initialisedFor: string | null = null;

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
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
  }
  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");
  initialisedFor = pixelId;
}

export function pixelTrack(event: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params || {});
}
