import { describe, expect, it } from "vitest";
import { buildBreadcrumbSchema, buildWebPageSchema } from "./aeoSchema";

describe("college breadcrumb reference identity", () => {
  for (const [slug, name] of [
    ["xavier-institute-of-management-and-research-mumbai", "Xavier Institute of Management and Research, Mumbai"],
    ["pu-chandigarh-mba-uiams", "PU Chandigarh MBA (UIAMS)"],
    ["lucknow-university-mba", "Lucknow University MBA"],
  ]) {
    it(`resolves ${slug} to one populated breadcrumb`, () => {
      const path = `/college/${slug}`;
      const items = [{ name: "Colleges", url: "/colleges" }, { name, url: path }];
      const list = buildBreadcrumbSchema(path, items);
      const page = buildWebPageSchema({ path, name, breadcrumbs: items });
      expect(list["@id"]).toBe(`https://mbacompass.in${path}#breadcrumb`);
      expect(page.breadcrumb["@id"]).toBe(list["@id"]);
      expect(list.itemListElement).toEqual([
        { "@type": "ListItem", position: 1, name: "Home", item: "https://mbacompass.in/" },
        { "@type": "ListItem", position: 2, name: "Colleges", item: "https://mbacompass.in/colleges" },
        { "@type": "ListItem", position: 3, name, item: `https://mbacompass.in${path}` },
      ]);
    });
  }
});