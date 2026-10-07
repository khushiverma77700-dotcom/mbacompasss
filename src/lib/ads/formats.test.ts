import { describe, expect, it } from 'vitest';
import { selectCreative } from './formats';

describe('display format selection', () => {
  const variants = { '300x250': '/rectangle.jpg', '728x90': '/leaderboard.jpg', '300x600': '/tall.jpg', '320x100': '/mobile.jpg' };
  it('uses a leaderboard only when the reading column fits it', () => {
    expect(selectCreative(variants, 800, 'in_content')?.key).toBe('728x90');
    expect(selectCreative(variants, 350, 'in_content')?.key).toBe('320x100');
  });
  it('keeps sidebar and sticky artwork suitable for their space', () => {
    expect(selectCreative(variants, 320, 'sidebar')?.key).toBe('300x250');
    expect(selectCreative(variants, 350, 'sticky')?.key).toBe('320x100');
    expect(selectCreative(variants, 280, 'sidebar')).toBeNull();
  });
  it('previews the requested uploaded format', () => {
    expect(selectCreative(variants, 800, 'in_content', '300x600')?.key).toBe('300x600');
  });
});