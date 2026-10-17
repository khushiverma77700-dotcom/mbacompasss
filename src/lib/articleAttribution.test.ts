import { expect, it } from "vitest";
import { articleAttribution } from "./articleAttribution";
it("keeps named authors without inventing credentials and identifies the editorial team as an organisation", () => {
  expect(articleAttribution("Suyash Khandelwal")).toEqual({ name: "Suyash Khandelwal", role: "Author", type: "Person", url: undefined });
  expect(articleAttribution(null).type).toBe("Organization");
  expect(articleAttribution("MBA Compass Editorial").role).toBe("Editorial Team");
});