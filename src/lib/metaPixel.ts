// Meta (Facebook/Instagram) Pixel removed to reduce backend load and 3rd-party JS.
// All exports are kept as no-ops so existing call sites continue to compile.

export function initMetaPixel(_pixelId?: string | null): void {
  // no-op
}

export function pixelTrack(_event: string, _params?: Record<string, any>): string | undefined {
  return undefined;
}

export function useMetaPixel(_opts?: {
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
}): string | null {
  return null;
}
