import { fuzzyScore, fuzzyFilter } from '../fuzzy';

describe('fuzzyScore', () => {
  it('returns 0 for an empty query', () => {
    expect(fuzzyScore('Anything', '')).toBe(0);
  });

  it('returns null when the query is not a subsequence', () => {
    expect(fuzzyScore('Holly', 'xyz')).toBeNull();
    expect(fuzzyScore('Holly', 'hly!')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(fuzzyScore('Holly Marsh', 'HOLLY')).toBe(fuzzyScore('holly marsh', 'holly'));
  });

  it('ranks a prefix match above a word-boundary match above a mid-word match', () => {
    const prefix = fuzzyScore('Holly', 'hol')!;
    const boundary = fuzzyScore('Nicholas Holloway', 'hol')!;
    const midWord = fuzzyScore('Nicholas', 'hol')!;
    expect(prefix).toBeLessThan(boundary);
    expect(boundary).toBeLessThan(midWord);
  });

  it('ranks any substring match above a subsequence match', () => {
    const substring = fuzzyScore('A Wildcat Prowls', 'cat')!;
    const subsequence = fuzzyScore('Crimson Altar Tower', 'cat')!;
    expect(substring).toBeLessThan(subsequence);
  });

  it('rewards consecutive characters in a subsequence match', () => {
    const consecutive = fuzzyScore('ab zzzzzz', 'ab')!;
    const scattered = fuzzyScore('a z b zzzz', 'ab')!;
    expect(consecutive).toBeLessThan(scattered);
  });
});

describe('fuzzyFilter', () => {
  const items = [
    { name: 'Holly Marsh', type: 'character' },
    { name: 'Nicholas Vane', type: 'character' },
    { name: 'Hollow Keep', type: 'location' },
    { name: 'Ashfall', type: 'location' }
  ];

  const keys = (i: (typeof items)[number]) => [i.name, i.type];

  it('keeps the original order for an empty query', () => {
    expect(fuzzyFilter(items, '  ', keys).map((i) => i.name)).toEqual(items.map((i) => i.name));
  });

  it('drops non-matching items and sorts by score', () => {
    expect(fuzzyFilter(items, 'holl', keys).map((i) => i.name)).toEqual([
      'Holly Marsh',
      'Hollow Keep'
    ]);
  });

  it('matches on any of the provided search strings', () => {
    expect(fuzzyFilter(items, 'location', keys).map((i) => i.name)).toEqual([
      'Hollow Keep',
      'Ashfall'
    ]);
  });

  it('honours the limit', () => {
    expect(fuzzyFilter(items, 'a', keys, 2)).toHaveLength(2);
    expect(fuzzyFilter(items, '', keys, 1)).toHaveLength(1);
  });
});
