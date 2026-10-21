import { describe, expect, it } from "vitest";
import { normalizeSender } from "./emailSender";

describe("normalizeSender", () => {
  it("rewrites a retired sender domain to alert.mbacompass.in", () => {
    expect(normalizeSender("MBA Compass <no-reply@notify.bschoolbuzz.in>", "notify.bschoolbuzz.in")).toEqual({
      from: "MBA Compass <no-reply@alert.mbacompass.in>",
      sender_domain: "alert.mbacompass.in",
    });
  });

  it("keeps the sender name and mailbox of a current sender", () => {
    expect(normalizeSender("Admissions <team@alert.mbacompass.in>", "alert.mbacompass.in").from).toBe(
      "Admissions <team@alert.mbacompass.in>",
    );
  });
});
