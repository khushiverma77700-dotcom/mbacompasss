import { describe, expect, it } from "vitest";
import { cleanBlogProse, sourceDates, evidenceFreshness } from "./blogEvidence.ts";
import { structureArticle } from "./blogStructure.ts";

describe("blog editorial safeguards", () => {
  it("removes plain and formatted robotic openers without breaking emphasis", () => {
    expect(cleanBlogProse('<p>Yes, CAT scores are accepted.</p>')).toBe('<p>CAT scores are accepted.</p>');
    expect(cleanBlogProse('<p><strong>Short answer:</strong> CAT scores are accepted.</p>')).toBe('<p>CAT scores are accepted.</p>');
    expect(cleanBlogProse('<p><strong>Yes, CAT</strong> scores are accepted.</p>')).toBe('<p><strong>CAT</strong> scores are accepted.</p>');
    expect(cleanBlogProse('Short answer: CAT scores are accepted.')).toBe('CAT scores are accepted.');
  });
  it("removes unsupported statements, not only their disclaimer", () => {
    expect(cleanBlogProse('<p>Fees: not officially published — verify on the official website.</p><p>Compare programme fit.</p>')).toBe('<p>Compare programme fit.</p>');
    expect(cleanBlogProse('<td><strong>not officially published</strong> &mdash; verify on the official website</td>')).toBe('<td>—</td>');
    expect(cleanBlogProse('<p>Students answered yes in the survey.</p>')).toBe('<p>Students answered yes in the survey.</p>');
  });
  it("uses declared source dates, never arbitrary years or copyright dates", () => {
    const dates = sourceDates({}, '<script type="application/ld+json">{"dateModified":"2026-09-12","datePublished":"2025-08-01"}</script>', 'Copyright 2026. Admission closes in 2027.');
    expect(dates.updatedAt).toBe('2026-09-12T00:00:00.000Z');
    expect(sourceDates({}, '', 'Copyright 2026. Admission closes in 2027.').updatedAt).toBeNull();
    expect(sourceDates({}, '<meta content="2026-09-12" property="article:modified_time">').updatedAt).toBe(dates.updatedAt);
  });
  it("rejects undated, stale and future-dated current evidence", () => {
    const now = new Date('2026-10-06T00:00:00Z');
    expect(evidenceFreshness({ updatedAt: '2026-09-12' }, now)).toBe('recent');
    expect(evidenceFreshness({ publishedAt: '2026-06-01' }, now)).toBe('stale');
    expect(evidenceFreshness({ updatedAt: '2027-01-01' }, now)).toBe('stale');
    expect(evidenceFreshness({}, now)).toBe('undated');
  });
  it("cleans both saved introduction and body during final composition", () => {
    const article = structureArticle('<p>Yes, Compare programme fit.</p>', '<h2>Admissions</h2><p>Short answer: CAT scores are accepted.</p>');
    expect(article.intro).not.toMatch(/Yes,/);
    expect(article.content).not.toMatch(/Short answer:/);
    expect(article.content).toContain('CAT scores are accepted.');
  });
});