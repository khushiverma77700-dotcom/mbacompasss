import { describe, expect, it } from "vitest";
import { normalizeSender } from "./emailSender";

describe("normalizeSender", () => {
  it("rewrites a retired sender domain to notify.mbacompass.in", () => {
    expect(normalizeSender("MBA Compass <no-reply@notify.mbacompass.in>", "notify.mbacompass.in")).toEqual({
      from: "MBA Compass <no-reply@notify.mbacompass.in>",
      sender_domain: "notify.mbacompass.in",
    });
  });

  it("keeps the sender name and mailbox of a current sender", () => {
    expect(normalizeSender("Admissions <team@notify.mbacompass.in>", "notify.mbacompass.in").from).toBe(
      "Admissions <team@notify.mbacompass.in>",
    );
  });
});
