// Google Indexing API integration was removed to reduce backend load.
// These exports are kept as no-ops so existing admin save flows continue to compile.

export async function submitToGoogleIndexing(_urls: string | string[]): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function pingSitemap(): Promise<{ ok: boolean }> {
  return { ok: true };
}

export default submitToGoogleIndexing;
