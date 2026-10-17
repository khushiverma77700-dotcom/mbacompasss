import { describe, it, expect } from "vitest";
import { formatMoney, collegeMetrics } from "./collegeMetrics";

describe("college money formatting", () => {
  it("formats full rupee amounts as lakhs", () => expect(formatMoney("₹27,50,000")).toBe("₹27.5 L"));
  it("formats LPA packages the same way", () => expect(formatMoney("INR 35.22 LPA")).toBe("₹35.2 L"));
  it("formats lakh text", () => expect(formatMoney("₹27.50 lakh")).toBe("₹27.5 L"));
  it("ignores bracketed notes", () => expect(formatMoney("₹23.4 lakhs (two-year PGP tuition fee, 2026-27)")).toBe("₹23.4 L"));
  it("ignores bracketed years on packages", () => expect(formatMoney("₹30.5 LPA (2025-26)")).toBe("₹30.5 L"));
  it("formats crores", () => expect(formatMoney("1.2 Cr")).toBe("₹1.2 Cr"));
  it("leaves ranges untouched rather than guessing", () => expect(formatMoney("₹20-25 L")).toBe("₹20-25 L"));
  it("returns empty for missing values", () => expect(formatMoney(null)).toBe(""));
  it("reads each metric from one column", () => {
    expect(collegeMetrics({ fees: "₹27,50,000", placement_avg: "INR 35.22 LPA", ranking: 1 })).toEqual({ fees: "₹27.5 L", avgCtc: "₹35.2 L", highestCtc: "", rank: "#1" });
  });
});
