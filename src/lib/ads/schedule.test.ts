import { describe, expect, it } from "vitest";
import { smartDeliverySchedule } from "./schedule";

describe("smart advertisement schedule", () => {
  const bookedEnd = "2026-10-31T18:30:00.000Z";
  it("preserves the booked October 31 end when the goal date is blank", () => {
    expect(smartDeliverySchedule(bookedEnd, null)).toEqual({ end_at: bookedEnd, pacing: "even" });
  });
  it("never extends a booked end to a later goal date", () => {
    expect(smartDeliverySchedule(bookedEnd, "2026-11-05T18:30:00.000Z").end_at).toBe(bookedEnd);
  });
  it("honors an earlier goal deadline", () => {
    expect(smartDeliverySchedule(bookedEnd, "2026-10-25T18:30:00.000Z").end_at).toBe("2026-10-25T18:30:00.000Z");
  });
  it("uses the goal deadline when no schedule end exists", () => {
    expect(smartDeliverySchedule(null, bookedEnd).end_at).toBe(bookedEnd);
  });
  it("remains open-ended only when both dates are absent", () => {
    expect(smartDeliverySchedule(null, null)).toEqual({ end_at: null, pacing: "asap" });
  });
});