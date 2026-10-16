import { describe, expect, it } from "vitest";
import { admissionYear, collegeTitle, fitTitle, shortMoney } from "./collegeSeo";

describe("college search titles", () => {
  const oct2026 = new Date("2026-10-16T00:00:00Z");

  it("targets next year's admissions from July", () => {
    expect(admissionYear(oct2026)).toBe(2027);
    expect(admissionYear(new Date("2026-03-01T00:00:00Z"))).toBe(2026);
  });

  it("keeps a saved title that fits in 60 characters", () => {
    expect(collegeTitle({ name: "XIMB", meta_title: "XIMB Bhubaneswar: MBA Admission, Fees, Placements 2027" }, oct2026))
      .toBe("XIMB Bhubaneswar: MBA Admission, Fees, Placements 2027");
  });

  it("replaces a saved title longer than 60 characters", () => {
    const t = collegeTitle({ name: "MICA Ahmedabad", meta_title: "MICA – Mudra Institute of Communications, Ahmedabad MBA Admissions 2026-27" }, oct2026);
    expect(t).toBe("MICA Ahmedabad: Fees, Placements, Cut-off 2027");
    expect(t.length).toBeLessThanOrEqual(60);
  });

  it("drops the brand before cutting other titles", () => {
    expect(fitTitle("GIM Fees 2026 [Complete Guide] — Tuition, Hostel & Scholarships | MBA Compass"))
      .toBe("GIM Fees 2026 [Complete Guide] — Tuition, Hostel");
  });

  it("formats raw rupee amounts and skips hedged ranges", () => {
    expect(shortMoney("2180000")).toBe("₹21.8 Lakh");
    expect(shortMoney("official latest-public INR 14-18 lakh range")).toBeNull();
  });
});
