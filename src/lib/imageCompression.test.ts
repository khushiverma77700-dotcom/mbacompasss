import { describe, it, expect } from "vitest";
import { shouldCompress } from "./imageCompression";
describe("upload compression rule", () => {
  it("compresses images over 500 KB", () => expect(shouldCompress({ type: "image/png", size: 501 * 1024 })).toBe(true));
  it("leaves images at or under 500 KB", () => expect(shouldCompress({ type: "image/jpeg", size: 500 * 1024 })).toBe(false));
  it("ignores non-images", () => expect(shouldCompress({ type: "application/pdf", size: 900 * 1024 })).toBe(false));
});
