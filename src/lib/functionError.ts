/** Extracts the real message from a backend function error (instead of "non-2xx status code"). */
export async function readFunctionError(error: unknown): Promise<string> {
  const e = error as { message?: string; context?: Response } | null;
  try {
    const ctx = e?.context;
    if (ctx && typeof ctx.clone === "function") {
      const body = await ctx.clone().json().catch(() => null);
      if (body?.error) return String(body.error);
      if (ctx.status === 429) return "Too many OTP requests. Please try again after 10 minutes.";
    }
  } catch {
    /* ignore */
  }
  return e?.message || "Something went wrong. Please try again.";
}
