import { expect, it } from "vitest";
import { prepareArticleDisplay, resolveArticleDisplay, validArticleDisplay } from "./articleDisplay";
it("retains all long-article content and links in the safe prepared display", () => {
  const content = '<h2>Admissions</h2><p>Verified requirements <a href="/exam/cat">CAT</a>.</p>'.repeat(500);
  const prepared = prepareArticleDisplay(content);
  expect(prepared.html.match(/Verified requirements/g)).toHaveLength(500);
  expect(prepared.html).toContain('href="/exam/cat"');
  expect(resolveArticleDisplay(content, prepared)).toBe(prepared);
});
it("rejects stale source and processor versions", () => {
  const content = '<p>Original admissions facts.</p>';
  const prepared = prepareArticleDisplay(content);
  expect(validArticleDisplay('<p>Changed facts.</p>', prepared)).toBe(false);
  expect(validArticleDisplay(content, { ...prepared, version: 0 })).toBe(false);
  expect(resolveArticleDisplay('<p>Changed facts.</p>', prepared).html).toContain('Changed facts.');
});
it("removes executable content and counts source reading words", () => {
  const prepared = prepareArticleDisplay('<p>One two three</p><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">Four</a>');
  expect(prepared.html).not.toMatch(/<script|javascript:|onclick/);
  expect(prepareArticleDisplay('<p>One two three</p><p>Four</p>').words).toBe(4);
});