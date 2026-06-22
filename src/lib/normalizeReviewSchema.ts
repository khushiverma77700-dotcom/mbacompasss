/**
 * Normalize Review / AggregateRating JSON-LD so Google Rich Results never
 * reports "Missing field itemReviewed".
 *
 * Google rules (https://developers.google.com/search/docs/appearance/structured-data/review-snippet):
 *  - When Review or AggregateRating is the TOP-LEVEL item of a JSON-LD block,
 *    `itemReviewed` is REQUIRED.
 *  - When nested inside a parent (Product, Course, Organization, …),
 *    `itemReviewed` must be ABSENT — the parent itself is the reviewed item.
 *
 * Strategy per JSON-LD array:
 *  1. Walk every node; for nested AggregateRating/Review, drop `itemReviewed`.
 *  2. For each TOP-LEVEL Review/AggregateRating:
 *     a. If a sibling node in the same array is a reviewable parent
 *        (Product / Course / Organization / CollegeOrUniversity / …),
 *        move the rating onto that parent as `aggregateRating` / `review`
 *        and remove the standalone block.
 *     b. Otherwise inject a minimal `itemReviewed` derived from the page's
 *        canonical URL + name + contentType.
 *  3. Drop the block entirely if required fields (ratingValue / reviewCount)
 *     are missing or invalid — an invalid block is worse than no block.
 */

export type ReviewedContentType =
  | "article"
  | "institute"
  | "college"
  | "exam"
  | "cityPage"
  | "category"
  | "course"
  | "product"
  | "webpage";

interface PageContext {
  contentType?: ReviewedContentType | string;
  url?: string;
  name?: string;
  image?: string;
}

const REVIEWABLE_PARENT_TYPES = new Set([
  "Product",
  "Course",
  "CollegeOrUniversity",
  "EducationalOrganization",
  "LocalBusiness",
  "Organization",
  "Book",
  "Movie",
  "Recipe",
  "SoftwareApplication",
  "WebApplication",
  "MobileApplication",
  "Service",
  "Event",
]);

const CONTENT_TYPE_TO_SCHEMA: Record<string, string> = {
  article: "Article",
  institute: "EducationalOrganization",
  college: "CollegeOrUniversity",
  exam: "Course",
  course: "Course",
  product: "Product",
  cityPage: "WebPage",
  category: "WebPage",
  webpage: "WebPage",
};

const typeOf = (node: any): string[] => {
  const t = node?.["@type"];
  if (!t) return [];
  return Array.isArray(t) ? t.map(String) : [String(t)];
};

const isAggregateRating = (node: any) => typeOf(node).includes("AggregateRating");
const isReview = (node: any) => typeOf(node).includes("Review");
const isRating = (node: any) => typeOf(node).includes("Rating");
const isReviewable = (node: any) => typeOf(node).some((t) => REVIEWABLE_PARENT_TYPES.has(t));

const toNumber = (v: any): number | null => {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  return null;
};

const isValidAggregate = (node: any): boolean => {
  const rv = toNumber(node?.ratingValue);
  if (rv === null || rv < 0 || rv > 5) return false;
  const rc = toNumber(node?.reviewCount ?? node?.ratingCount);
  return rc !== null && rc >= 1;
};

const isValidReview = (node: any): boolean => {
  const rating = node?.reviewRating;
  if (!rating || typeof rating !== "object") return false;
  const rv = toNumber(rating.ratingValue);
  if (rv === null || rv < 0 || rv > 5) return false;
  return Boolean(node?.author);
};

// Recursively strip itemReviewed from any AggregateRating/Review/Rating that
// has a parent (depth > 0).
const stripNestedItemReviewed = (node: any, depth = 0): any => {
  if (Array.isArray(node)) return node.map((n) => stripNestedItemReviewed(n, depth));
  if (!node || typeof node !== "object") return node;
  const clone: any = { ...node };
  if (depth > 0 && (isAggregateRating(clone) || isReview(clone) || isRating(clone))) {
    if ("itemReviewed" in clone) delete clone.itemReviewed;
  }
  for (const k of Object.keys(clone)) {
    clone[k] = stripNestedItemReviewed(clone[k], depth + 1);
  }
  return clone;
};

const buildItemReviewed = (ctx: PageContext): Record<string, any> | null => {
  const name = (ctx.name || "").trim();
  const url = (ctx.url || "").trim();
  if (!name && !url) return null;
  const type = CONTENT_TYPE_TO_SCHEMA[String(ctx.contentType || "")] || "WebPage";
  const itemReviewed: Record<string, any> = { "@type": type };
  if (name) itemReviewed.name = name;
  if (url) itemReviewed.url = url;
  if (ctx.image) itemReviewed.image = ctx.image;
  return itemReviewed;
};

/**
 * Public normalizer. Accepts an array (or single object / null) of JSON-LD
 * nodes and returns a sanitized array safe for Google Rich Results.
 */
export const normalizeReviewSchemas = (
  input: Record<string, any> | Record<string, any>[] | null | undefined,
  ctx: PageContext = {},
): Record<string, any>[] => {
  if (!input) return [];
  const arr: Record<string, any>[] = Array.isArray(input)
    ? input.filter(Boolean)
    : [input];

  // Pass 1: strip itemReviewed from nested AggregateRating/Review (depth > 0).
  const stripped = arr.map((node) => stripNestedItemReviewed(node, 0));

  // Pass 2: index reviewable parents so we can fold standalone ratings into them.
  const reviewableParents: any[] = stripped.filter(
    (n) => isReviewable(n) && !isAggregateRating(n) && !isReview(n),
  );

  const out: any[] = [];

  for (const node of stripped) {
    const topLevelAggregate = isAggregateRating(node) && !isReview(node);
    const topLevelReview = isReview(node);

    if (!topLevelAggregate && !topLevelReview) {
      out.push(node);
      continue;
    }

    // Drop schema-level wrappers like @context for a moment; we'll reattach.
    const block: any = { ...node };
    // Validate required fields. Skip block entirely if invalid.
    if (topLevelAggregate && !isValidAggregate(block)) continue;
    if (topLevelReview && !isValidReview(block)) continue;

    // Prefer folding into a sibling reviewable parent — that's the
    // Google-recommended shape and avoids needing itemReviewed at all.
    const parent = reviewableParents[0];
    if (parent) {
      const sibling = { ...block };
      delete sibling["@context"];
      delete sibling.itemReviewed;
      if (topLevelAggregate) {
        parent.aggregateRating = sibling;
      } else {
        const list = Array.isArray(parent.review) ? parent.review : [];
        parent.review = [...list, sibling];
      }
      continue; // drop the standalone block
    }

    // No reviewable parent — keep standalone but guarantee itemReviewed.
    if (!block.itemReviewed || typeof block.itemReviewed !== "object") {
      const built = buildItemReviewed(ctx);
      if (!built) continue; // we have no entity to point at → drop
      block.itemReviewed = built;
    } else {
      // itemReviewed exists but may be malformed; ensure @type + name.
      const ir: any = { ...block.itemReviewed };
      if (!ir["@type"]) ir["@type"] = CONTENT_TYPE_TO_SCHEMA[String(ctx.contentType || "")] || "WebPage";
      if (!ir.name && ctx.name) ir.name = ctx.name;
      if (!ir.url && ctx.url) ir.url = ctx.url;
      block.itemReviewed = ir;
    }
    if (!block["@context"]) block["@context"] = "https://schema.org";
    out.push(block);
  }

  return out;
};
