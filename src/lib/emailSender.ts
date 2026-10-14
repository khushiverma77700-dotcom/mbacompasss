// The verified sending domain for every app email (campaigns, purchase
// confirmations, sender identities).
export const CURRENT_SENDER_DOMAIN = "notify.mbacompass.in";

const DEFAULT_FROM = `MBA Compass <no-reply@${CURRENT_SENDER_DOMAIN}>`;

/** Rewrites any queued email still pointing at a retired sender domain. */
export function normalizeSender(from: unknown, senderDomain: unknown): { from: string; sender_domain: string } {
  const raw = typeof from === "string" && from.trim() ? from.trim() : DEFAULT_FROM;
  if (!raw.includes("@")) return { from: DEFAULT_FROM, sender_domain: CURRENT_SENDER_DOMAIN };
  if (senderDomain === CURRENT_SENDER_DOMAIN && raw.includes(`@${CURRENT_SENDER_DOMAIN}`)) {
    return { from: raw, sender_domain: CURRENT_SENDER_DOMAIN };
  }
  return { from: raw.replace(/@[^\s>]+/, `@${CURRENT_SENDER_DOMAIN}`), sender_domain: CURRENT_SENDER_DOMAIN };
}
