import { describe, expect, it } from "vitest";
import { projectHomeCollegeFact } from "./homeCollegeFact";
describe("homepage and college detail facts", () => {
  const college = { name: "IIM Ahmedabad", fees: "₹27.50 lakh", placement_avg: "₹35.50 LPA", cutoff_info: { General: "80" } };
  it("preserves IIM Ahmedabad's college fee field verbatim, never using a homepage fallback", () => {
    expect(projectHomeCollegeFact(college, []).fees).toBe("₹27.50 lakh");
    expect(projectHomeCollegeFact({ ...college, fees: null }, []).fees).toBeNull();
  });
  it("uses original-preferred structured cutoffs as the college detail page does", () => {
    const result = projectHomeCollegeFact(college, [
      { section_type: "cutoff", version: "ai", data: { cutoffs: [{ category: "General", exam: "CAT", year: "2026", percentile: "99" }] } },
      { section_type: "cutoff", version: "original", data: { cutoffs: [{ category: "General", exam: "CAT", year: "2026", percentile: "80" }] } },
    ]);
    expect(result.cutoffs).toEqual([{ category: "General", exam: "CAT", year: "2026", percentile: "80" }]);
  });
  it("reads average CTC only from the college record, never from section copies", () => {
    expect(projectHomeCollegeFact(college, [{ section_type: "placements", version: "original", data: { avg_package: "₹36 LPA" } }]).placement_avg).toBe("₹35.50 LPA");
    expect(projectHomeCollegeFact({ ...college, placement_avg: null }, []).placement_avg).toBe("");
  });
});