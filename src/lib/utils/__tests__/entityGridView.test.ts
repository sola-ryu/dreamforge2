import {
  buildGridColumns,
  defaultVisibleKeys,
  normalizePastedValue,
  parseClipboardGrid,
  sortRows
} from '../entityGrid';

const columns = buildGridColumns([
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'fears', label: 'Fears', type: 'textarea' },
  { key: 'traits', label: 'Traits', type: 'tags' },
  { key: 'alive', label: 'Alive', type: 'boolean' }
]);
const col = (key: string) => columns.find((c) => c.key === key)!;

const rows = [
  { id: '1', name: 'Vess', status: 'draft', tags: [], frontmatter: { age: 40, traits: ['b'] } },
  { id: '2', name: 'mira', status: 'wip', tags: [], frontmatter: { age: 9 } },
  { id: '3', name: 'Ash', status: 'draft', tags: [], frontmatter: {} }
];

describe('defaultVisibleKeys', () => {
  it('keeps locked columns and any field some row has filled', () => {
    const keys = defaultVisibleKeys(rows, columns);
    expect([...keys].sort()).toEqual(['age', 'name', 'status', 'tags', 'traits']);
  });

  it('hides fields nobody has touched', () => {
    const keys = defaultVisibleKeys(rows, columns);
    expect(keys.has('fears')).toBe(false);
    expect(keys.has('alive')).toBe(false);
  });
});

describe('sortRows', () => {
  it('sorts text case-insensitively', () => {
    expect(sortRows(rows, col('name'), 'asc').map((r) => r.id)).toEqual(['3', '2', '1']);
  });

  it('sorts numbers numerically, not lexically', () => {
    expect(sortRows(rows, col('age'), 'asc').map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('keeps empty cells last in both directions', () => {
    expect(sortRows(rows, col('age'), 'desc').map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('is stable for equal values', () => {
    expect(sortRows(rows, col('status'), 'asc').map((r) => r.id)).toEqual(['1', '3', '2']);
  });

  it('does not mutate its input', () => {
    const copy = [...rows];
    sortRows(rows, col('name'), 'asc');
    expect(rows).toEqual(copy);
  });
});

describe('parseClipboardGrid', () => {
  it('splits rows and tab-separated cells', () => {
    expect(parseClipboardGrid('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd']
    ]);
  });

  it('treats a single value as one cell', () => {
    expect(parseClipboardGrid('brave')).toEqual([['brave']]);
  });
});

describe('normalizePastedValue', () => {
  it('maps status labels and rejects unknown ones', () => {
    expect(normalizePastedValue(col('status'), 'In Progress')).toBe('wip');
    expect(normalizePastedValue(col('status'), 'done-ish')).toBeNull();
  });

  it('never blanks a name', () => {
    expect(normalizePastedValue(col('name'), '  ')).toBeNull();
    expect(normalizePastedValue(col('name'), ' Vess ')).toBe('Vess');
  });

  it('validates numbers and booleans', () => {
    expect(normalizePastedValue(col('age'), '34')).toBe('34');
    expect(normalizePastedValue(col('age'), 'old')).toBeNull();
    expect(normalizePastedValue(col('alive'), 'Yes')).toBe('true');
    expect(normalizePastedValue(col('alive'), 'maybe')).toBeNull();
  });

  it('passes text and tags through trimmed', () => {
    expect(normalizePastedValue(col('traits'), ' a, b ')).toBe('a, b');
  });
});
