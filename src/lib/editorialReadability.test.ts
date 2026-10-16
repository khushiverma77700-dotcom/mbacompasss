import { describe, expect, it } from 'vitest';
import { formatEditorialReadability, splitLongParagraphs } from './editorialReadability';

describe('editorial readability', () => {
  it('handles a long article with hundreds of consecutive prose blocks', () => {
    const paragraph = '<p>Compare verified admissions information and official course requirements.</p>';
    const content = '<h2>Fees</h2>' + paragraph.repeat(600) + '<h2>Admissions</h2>';
    const out = formatEditorialReadability(content);
    expect(out.match(/<p>Compare verified/g)).toHaveLength(600);
    expect(out).toContain('href="#admissions"');
  });
  it('replaces raw contents with working section anchors', () => {
    const out = formatEditorialReadability('<p>Table of Contents</p><ol><li>Fees</li><li>Admissions</li></ol><h2>Fees</h2><p>Costs are explained here.</p><h2>Admissions</h2><p>Apply online.</p>');
    expect(out).toContain('href="#fees"');
    expect(out).toContain('id="fees"');
    expect(out.match(/Table of Contents/g)).toHaveLength(1);
    expect(out).toContain('Apply online.');
    expect(formatEditorialReadability(out)).toBe(out);
  });
  it('keeps existing anchors and repairs duplicate heading ids', () => {
    const out = formatEditorialReadability('<h2 id="fees">Fees</h2><h2 id="fees">Fees</h2><p><a href="/colleges">Browse colleges</a></p>');
    expect(out).toContain('id="fees-2"');
    expect(out).toContain('href="/colleges"');
  });
  it('splits prose without losing words or breaking emphasis and links', () => {
    const sentence = 'Students should compare the available programmes carefully and consider their personal goals before making an application decision. ';
    const inner = sentence.repeat(6) + '<a href="/exams/cat"><strong>CAT information</strong></a>. ' + sentence.repeat(2);
    const out = splitLongParagraphs(`<p id="lead">${inner}</p>`);
    expect(out.match(/<p/g)?.length).toBeGreaterThan(1);
    expect(out.match(/id="lead"/g)).toHaveLength(1);
    expect(out).toContain('<a href="/exams/cat"><strong>CAT information</strong></a>');
    expect(out.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).toBe(inner.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  });
  it('formats genuine bullets and existing subheads without inventing copy', () => {
    const out = formatEditorialReadability('<p>• Compare fees<br>• Review programmes</p><p><strong>Application process</strong></p><p>Submit your documents.</p>');
    expect(out).toContain('<ul><li>Compare fees</li><li>Review programmes</li></ul>');
    expect(out).toContain('<h3 id="applicationprocess">Application process</h3>');
  });
  it('preserves unrelated lists below a contents label', () => {
    const out = formatEditorialReadability('<p>Contents</p><ul><li>Fees</li><li>Admissions</li></ul><p>This important paragraph is not a heading.</p><h2>Fees</h2><h2>Admissions</h2>');
    expect(out).toContain('This important paragraph is not a heading.');
  });
});
