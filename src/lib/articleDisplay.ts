import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { enhanceAIContent } from "./aiContentEnhancer";

export const ARTICLE_DISPLAY_VERSION = 3;
export function articleFingerprint(content: string) {
  return bytesToHex(sha256(new TextEncoder().encode(content)));
}
export function articleWordCount(content: string) {
  let words = 0, inTag = false, inWord = false;
  for (let i = 0; i < content.length; i++) {
    const c = content.charCodeAt(i);
    if (c === 60) { inTag = true; inWord = false; continue; }
    if (c === 62) { inTag = false; continue; }
    if (inTag) continue;
    const space = c === 32 || c === 10 || c === 9 || c === 13;
    if (!space && !inWord) words++;
    inWord = !space;
  }
  return words;
}
export function prepareArticleDisplay(content: string) {
  return { version: ARTICLE_DISPLAY_VERSION, fingerprint: articleFingerprint(content),
    html: enhanceAIContent(content, undefined, { editorial: true }), words: articleWordCount(content) };
}
export type ArticleDisplay = ReturnType<typeof prepareArticleDisplay>;
export function validArticleDisplay(content: string, display: unknown): display is ArticleDisplay {
  if (!display || typeof display !== "object") return false;
  const value = display as Partial<ArticleDisplay>;
  return value.version === ARTICLE_DISPLAY_VERSION && typeof value.html === "string" &&
    typeof value.words === "number" && Number.isInteger(value.words) && value.words >= 0 &&
    value.fingerprint === articleFingerprint(content);
}

// Compatibility fallback is bounded by characters, not just entry count.
const fallback = new Map<string, ArticleDisplay>();
let characters = 0;
const CACHE_CHARACTERS = 1_000_000;
export function resolveArticleDisplay(content: string, prepared: unknown): ArticleDisplay {
  if (validArticleDisplay(content, prepared)) return prepared;
  const key = articleFingerprint(content);
  const cached = fallback.get(key);
  if (cached) return cached;
  const display = prepareArticleDisplay(content);
  if (display.html.length <= CACHE_CHARACTERS) {
    while (characters + display.html.length > CACHE_CHARACTERS) {
      const oldest = fallback.entries().next().value;
      if (!oldest) break;
      characters -= oldest[1].html.length;
      fallback.delete(oldest[0]);
    }
    fallback.set(key, display); characters += display.html.length;
  }
  return display;
}