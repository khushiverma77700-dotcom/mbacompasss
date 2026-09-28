// Only MBA Compass-owned course offers use this rule; external institute terms can differ.
export const MBA_COURSE_RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "IN",
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
} as const;

export function withCourseReturnPolicy(schema: unknown): Record<string, unknown> | Record<string, unknown>[] {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (value === null || typeof value !== "object") return value;
    const node = value as Record<string, unknown>;
    const mapped = Object.fromEntries(Object.entries(node).map(([key, child]) => [key, visit(child)]));
    if (node["@type"] === "Offer" && typeof node.price !== "undefined") {
      mapped.hasMerchantReturnPolicy = MBA_COURSE_RETURN_POLICY;
    }
    return mapped;
  };
  return visit(schema) as Record<string, unknown> | Record<string, unknown>[];
}