import { describe, expect, it } from "vitest";
import { normalizeSender } from "./emailSender";

describe("normalizeSender", () => {
  it("rewrites a retired sender domain to notify.aleart.mbacompass.in", () => {
    expect(normalizeSender("MBA Compass <no-reply@notify.mail.mbacompass.in>", "notify.mail.mbacompass.in")).toEqual({
      from: "MBA Compass <no-reply@notify.aleart.mbacompass.in>",
      sender_domain: "notify.aleart.mbacompass.in",
    });
  });

  it("keeps the sender name and mailbox of a current sender", () => {
    expect(normalizeSender("Admissions <team@notify.aleart.mbacompass.in>", "notify.aleart.mbacompass.in").from).toBe(
      "Admissions <team@notify.aleart.mbacompass.in>",
    );
  });
});
