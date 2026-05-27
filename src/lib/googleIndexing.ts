// Google Indexing API integration was removed to reduce backend load.
// Stubs accept any args so existing admin save flows continue to compile.

export async function submitToGoogleIndexing(..._args: unknown[]): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function pingSitemap(..._args: unknown[]): Promise<{ ok: boolean }> {
  return { ok: true };
}

export default submitToGoogleIndexing;
