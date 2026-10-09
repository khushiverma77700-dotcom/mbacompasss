import { describe, expect, it } from "vitest";
import { normalizeSender } from "./emailSender";

describe("normalizeSender", () => {
  it("rewrites a retired sender domain to notify.bschoolbuzz.in", () => {
    expect(normalizeSender("MBA Compass <no-reply@notify.bschoolbuzz.in>", "notify.bschoolbuzz.in")).toEqual({
      from: "MBA Compass <no-reply@notify.bschoolbuzz.in>",
      sender_domain: "notify.bschoolbuzz.in",
    });
  });

  it("keeps the sender name and mailbox of a current sender", () => {
    expect(normalizeSender("Admissions <team@notify.bschoolbuzz.in>", "notify.bschoolbuzz.in").from).toBe(
      "Admissions <team@notify.bschoolbuzz.in>",
    );
  });
});
