import { expect, it } from 'vitest';
import { normalizeCollegeSectionData } from './collegeSectionData';

it('renders legacy string facilities without calling map on a string', () => {
  const result = normalizeCollegeSectionData({ facilities: 'Wi-Fi, Library' });
  expect(result.facilities.map((item: {name:string}) => item.name)).toEqual(['Wi-Fi', 'Library']);
});
it('drops null recruiters and retains named recruiters without inventing facts', () => {
  const result = normalizeCollegeSectionData({ recruiters: [null, { name: 'Deloitte' }, 'EY'], rankings: [null, { body: 'NIRF', rank: 10 }] });
  expect(result.recruiters.map((item: {name:string}) => item.name)).toEqual(['Deloitte', 'EY']);
  expect(result.rankings).toEqual([{ body: 'NIRF', rank: 10 }]);
});