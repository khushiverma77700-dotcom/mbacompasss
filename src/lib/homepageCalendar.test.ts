import { describe, expect, it } from "vitest";
import { activeAdmissionPhases, parseHomepageDate, upcomingHomepageExams } from "./homepageCalendar";
const now = new Date("2026-10-17T04:46:00Z");
const row = (slug: string, deadline: string | null, exam = "2026-11-29") => ({ name: slug, slug, registration_deadline: deadline, exam_date: exam });
describe("homepage calendar", () => {
  it("hides closed registrations even when the exam is still upcoming", () => {
    expect(upcomingHomepageExams([row("closed", "2026-10-16"), row("open", "2026-10-18")], "exam", now).map(r => r.slug)).toEqual(["open"]);
  });
  it("sorts upcoming deadlines earliest first without fabricated fallback dates", () => {
    expect(upcomingHomepageExams([row("late", "2026-11-10"), row("early", "2026-10-18"), row("unknown", null)], "registration", now).map(r => r.slug)).toEqual(["early", "late"]);
  });
  it("keeps a deadline open until the end of its Indian calendar day", () => {
    expect(parseHomepageDate("2026-10-17")?.toISOString()).toBe("2026-10-17T18:29:59.999Z");
  });
  it("hides exams that have ended", () => {
    expect(upcomingHomepageExams([row("past", null, "2026-10-16")], "exam", now)).toEqual([]);
  });
  it("moves the timeline from October exam season to January preparation and selection", () => {
    expect(activeAdmissionPhases(now)).toEqual([3]);
    expect(activeAdmissionPhases(new Date("2027-01-15T00:00:00Z"))).toEqual([0, 4]);
    expect(activeAdmissionPhases(new Date("2027-04-15T00:00:00Z"))).toEqual([0, 5]);
    expect(activeAdmissionPhases(new Date("2027-07-15T00:00:00Z"))).toEqual([1]);
  });
});