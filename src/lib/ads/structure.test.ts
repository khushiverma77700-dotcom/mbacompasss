// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { articleBlocks, editorialBody } from './structure';
it('discovers nested AI prose but excludes navigation, table text and ads',()=>{
  document.body.innerHTML='<main id="main-content"><div class="prose"><p>Summary</p></div><article><div id="article-content"><div class="ai-content"><nav><p>Contents</p></nav><section><h2>Fees</h2><p>First paragraph</p><table><tbody><tr><td><p>Cell</p></td></tr></tbody></table><p>Last paragraph</p></section><div data-ad-slot="one"><p>Sponsored</p></div></div></div></article></main>';
  const main=document.querySelector<HTMLElement>('main');if(!main) throw new Error('Missing main');
  const body=editorialBody(main);if(!body) throw new Error('Missing prose');
  expect(body.className).toBe('ai-content');expect(articleBlocks(body).map(b=>b.textContent)).toEqual(['Fees','First paragraph','Last paragraph']);
});