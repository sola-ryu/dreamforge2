import { buildGridColumns, isCellEmpty, layoutRow, type GridColumn } from '../entityGrid';

const columns = buildGridColumns([
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'bio', label: 'Bio', type: 'textarea' }
]);

function column(key: string): GridColumn {
  const found = columns.find((c) => c.key === key);
  if (!found) throw new Error(`no column ${key}`);
  return found;
}

describe('buildGridColumns', () => {
  it('puts status first, then name and tags', () => {
    expect(columns.slice(0, 3).map((c) => c.key)).toEqual(['status', 'name', 'tags']);
  });
});

describe('isCellEmpty', () => {
  it('never treats status or booleans as empty', () => {
    expect(isCellEmpty({}, column('status'))).toBe(false);
    expect(
      isCellEmpty({}, { key: 'alive', label: 'Alive', type: 'boolean', panelOnly: false })
    ).toBe(false);
  });

  it('detects missing, blank and empty-array values', () => {
    expect(isCellEmpty({ name: '' }, column('name'))).toBe(true);
    expect(isCellEmpty({ name: '  ' }, column('name'))).toBe(true);
    expect(isCellEmpty({ tags: [] }, column('tags'))).toBe(true);
    expect(isCellEmpty({}, column('age'))).toBe(true);
    expect(isCellEmpty({ name: 'Ana' }, column('name'))).toBe(false);
    expect(isCellEmpty({ tags: ['hero'] }, column('tags'))).toBe(false);
    expect(isCellEmpty({ frontmatter: { age: 0 } }, column('age'))).toBe(false);
  });
});

describe('layoutRow', () => {
  it('spills a cell across the empty columns that follow it', () => {
    const layout = layoutRow({ name: 'Ana' }, columns);
    const byKey = Object.fromEntries(columns.map((c, i) => [c.key, layout[i]]));

    expect(byKey.status.spill).toBe(0);
    expect(byKey.name.spill).toBe(columns.length - 2);
    expect(byKey.tags.covered).toBe(true);
    expect(byKey.age.covered).toBe(true);
    expect(byKey.bio.covered).toBe(true);
  });

  it('stops a spill at the next filled column', () => {
    const layout = layoutRow({ name: 'Ana', tags: [], frontmatter: { age: 30 } }, columns);
    const byKey = Object.fromEntries(columns.map((c, i) => [c.key, layout[i]]));

    expect(byKey.name.spill).toBe(1);
    expect(byKey.tags.covered).toBe(true);
    expect(byKey.age.spill).toBe(1);
    expect(byKey.age.covered).toBe(false);
    expect(byKey.bio.covered).toBe(true);
  });

  it('covers a blank cell that trails a filled one', () => {
    const layout = layoutRow({ name: '', tags: ['hero'] }, columns);
    const byKey = Object.fromEntries(columns.map((c, i) => [c.key, layout[i]]));

    // Status always paints, so the status icon may overflow across the blank name.
    expect(byKey.name.covered).toBe(true);
    expect(byKey.tags.spill).toBe(2);
  });
});
