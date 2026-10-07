/** Editorial paragraphs only: never insert into navigation, cards, tables or existing ads. */
export function articleBlocks(body: HTMLElement): Element[] {
  const excluded = '[data-ad-slot],.not-prose,nav,button,table,figure,blockquote,pre,ul,ol,[data-ad-exclude]';
  return Array.from(body.querySelectorAll('p,h2,h3,h4')).filter((el) => {
    const parent = el.parentElement;
    return !parent?.closest(excluded) && !el.closest('[data-ad-slot]') && Boolean(el.textContent?.trim());
  });
}

export function editorialBody(main: HTMLElement): HTMLElement | null {
  return main.querySelector<HTMLElement>('#article-content .ai-content,#article-content .prose,[data-editorial-content],.ai-content,.prose')
    ?? main.querySelector<HTMLElement>('article');
}