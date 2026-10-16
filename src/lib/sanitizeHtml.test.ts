import { expect, it } from 'vitest';
import { sanitizeEditorialHtml } from './sanitizeHtml';
it('keeps editorial formatting while removing executable content', () => {
  const html = sanitizeEditorialHtml('<h2 id="fees">Fees</h2><a href="/colleges">Colleges</a><p style="color:#123456;font-size:14px" onclick="alert(1)">Facts</p><script>alert(1)</script><a href="javascript:alert(1)">Bad</a>');
  expect(html).toContain('href="/colleges"');
  expect(html).toContain('id="fees"');
  expect(html).toContain('font-size:14px');
  expect(html).not.toMatch(/onclick|<script|javascript:/);
});