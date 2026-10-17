import { expect, it } from "vitest";
import { locationColleges } from "./collegeHub";
it("state pages include colleges in every city of that state only", () => {
  const records = [{ city: "Ahmedabad", state: "Gujarat" }, { city: "Surat", state: "Gujarat" }, { city: "Mumbai", state: "Maharashtra" }];
  expect(locationColleges(records, "state", "gujarat")).toEqual(records.slice(0, 2));
  expect(locationColleges(records, "city", "ahmedabad")).toEqual([records[0]]);
});