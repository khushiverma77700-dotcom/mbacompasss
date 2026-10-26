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
it("preserves uploaded and external image addresses in paragraphs and tables", () => {
  const uploaded = "https://images.example.org/storage/v1/object/public/uploads/editor-images/catking.png";
  const external = "https://www.example.org/reviews/chart.webp?version=2&size=large";
  const prepared = prepareArticleDisplay(`<p>Published review.</p><img src="${uploaded}" alt="CATKing"><table><tr><td><img src="${external}" alt="Review chart"></td></tr></table>`);
  expect(prepared.html).toContain(`src="${uploaded}"`);
  expect(prepared.html).toContain('src="https://www.example.org/reviews/chart.webp?version=2&amp;size=large"');
  expect(prepared.html).toContain('alt="CATKing"');
});
it("rebuilds older prepared articles whose image addresses were removed", () => {
  const content = '<img src="https://images.example.org/catking.png" alt="CATKing">';
  const prepared = prepareArticleDisplay(content);
  const older = { ...prepared, version: 2, html: '<img alt="CATKing">' };
  expect(validArticleDisplay(content, older)).toBe(false);
  expect(resolveArticleDisplay(content, older).html).toContain('src="https://images.example.org/catking.png"');
});
it("keeps image sanitization when restoring URL-bearing attributes", () => {
  const prepared = prepareArticleDisplay('<img src="javascript:alert(1)" onerror="alert(2)"><img src="https://images.example.org/chart.png" onload="alert(3)"><script src="https://example.org/script.js"></script>');
  expect(prepared.html).toContain('src="https://images.example.org/chart.png"');
  expect(prepared.html).not.toMatch(/javascript:|onerror|onload|<script/);
});