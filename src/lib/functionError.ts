/** Extracts the real message from a backend function error (instead of "non-2xx status code"). */
export async function readFunctionError(error: unknown): Promise<string> {
  const e = error as {
    message?: string;
    context?: {
      status?: number;
      clone?: () => unknown;
      json?: () => Promise<unknown>;
      text?: () => Promise<string>;
    };
  } | null;

  const messageFromBody = (body: unknown): string | null => {
    if (!body || typeof body !== "object") return null;
    const value = body as { error?: unknown; message?: unknown };
    if (typeof value.error === "string" && value.error.trim()) return value.error;
    if (typeof value.message === "string" && value.message.trim()) return value.message;
    return null;
  };

  try {
    const ctx = e?.context;
    if (ctx) {
      const readable = typeof ctx.clone === "function" ? ctx.clone() : ctx;
      const response = readable as {
        json?: () => Promise<unknown>;
        text?: () => Promise<string>;
      };

      if (typeof response.json === "function") {
        const body = await response.json().catch(() => null);
        const bodyMessage = messageFromBody(body);
        if (bodyMessage) return bodyMessage;
      } else if (typeof response.text === "function") {
        const text = await response.text().catch(() => "");
        if (text) {
          try {
            const bodyMessage = messageFromBody(JSON.parse(text));
            if (bodyMessage) return bodyMessage;
          } catch {
            if (!/non-2xx/i.test(text)) return text;
          }
        }
      }

      if (ctx.status === 429) {
        return "Too many OTP requests. Please try again after 10 minutes.";
      }
    }
  } catch {
    /* ignore */
  }

  if (e?.message && !/edge function returned a non-2xx status code/i.test(e.message)) {
    return e.message;
  }
  return "OTP could not be sent. Please wait 10 minutes before trying again.";
}
