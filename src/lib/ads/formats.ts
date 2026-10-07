export const AD_FORMATS = [
  { key: '300x250', label: 'Medium rectangle', width: 300, height: 250 },
  { key: '336x280', label: 'Large rectangle', width: 336, height: 280 },
  { key: '300x600', label: 'Half-page', width: 300, height: 600 },
  { key: '160x600', label: 'Wide skyscraper', width: 160, height: 600 },
  { key: '728x90', label: 'Leaderboard', width: 728, height: 90 },
  { key: '970x250', label: 'Billboard', width: 970, height: 250 },
  { key: '320x100', label: 'Mobile banner', width: 320, height: 100 },
  { key: '320x50', label: 'Mobile compact', width: 320, height: 50 },
] as const;
export type CreativeVariants = Record<string, string>;

/** Choose only an uploaded format that fits. Never crop or enlarge finished artwork. */
export function selectCreative(variants: CreativeVariants | undefined, width: number, placement: string, requested?: string) {
  const formats = AD_FORMATS.filter((f) => variants?.[f.key]);
  if (requested) return formats.find((f) => f.key === requested) ?? null;
  const side = placement === 'sidebar' || placement === 'popup';
  const compact = placement === 'sticky';
  const fitting = formats.filter((f) => f.width <= width + 1 && (side ? f.width <= 336 && f.height >= 250 : compact ? f.height <= 100 : f.height <= 280));
  fitting.sort((a, b) => {
    if (side) return b.width - a.width || a.height - b.height;
    return b.width - a.width || b.height - a.height;
  });
  return fitting[0] ?? null;
}