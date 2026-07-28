import { collectTags, filterEntities } from '../entityFilter';

const ENTITIES = [
  {
    name: 'Holly Marsh',
    status: 'wip',
    tags: ['rebel', 'pilot'],
    createdAt: '2026-01-01',
    modifiedAt: '2026-07-01'
  },
  {
    name: 'Ashfall',
    status: 'complete',
    tags: ['city'],
    createdAt: '2026-02-01',
    modifiedAt: '2026-07-20'
  },
  {
    name: 'Milo Calder',
    status: 'draft',
    tags: ['rebel'],
    createdAt: '2026-03-01',
    modifiedAt: '2026-06-01'
  },
  { name: 'Untagged', createdAt: '2026-04-01', modifiedAt: '2026-07-10' }
];

describe('collectTags', () => {
  it('counts tags and orders them by use', () => {
    expect(collectTags(ENTITIES)).toEqual([
      { tag: 'rebel', count: 2 },
      { tag: 'city', count: 1 },
      { tag: 'pilot', count: 1 }
    ]);
  });

  it('returns nothing when no entity is tagged', () => {
    expect(collectTags([{ name: 'A' }, { name: 'B', tags: [] }])).toEqual([]);
  });
});

describe('filterEntities', () => {
  it('sorts by most recently modified by default', () => {
    expect(filterEntities(ENTITIES).map((e) => e.name)).toEqual([
      'Ashfall',
      'Untagged',
      'Holly Marsh',
      'Milo Calder'
    ]);
  });

  it('sorts by name or creation date on request', () => {
    expect(filterEntities(ENTITIES, { sort: 'name' }).map((e) => e.name)).toEqual([
      'Ashfall',
      'Holly Marsh',
      'Milo Calder',
      'Untagged'
    ]);
    expect(filterEntities(ENTITIES, { sort: 'created' })[0].name).toBe('Untagged');
  });

  it('filters by status, treating a missing status as draft', () => {
    expect(filterEntities(ENTITIES, { status: 'wip' }).map((e) => e.name)).toEqual(['Holly Marsh']);
    expect(filterEntities(ENTITIES, { status: 'draft' }).map((e) => e.name)).toEqual([
      'Untagged',
      'Milo Calder'
    ]);
  });

  it('requires every selected tag', () => {
    expect(filterEntities(ENTITIES, { tags: ['rebel'] }).map((e) => e.name)).toEqual([
      'Holly Marsh',
      'Milo Calder'
    ]);
    expect(filterEntities(ENTITIES, { tags: ['rebel', 'pilot'] }).map((e) => e.name)).toEqual([
      'Holly Marsh'
    ]);
  });

  it('combines filters', () => {
    expect(
      filterEntities(ENTITIES, { tags: ['rebel'], status: 'draft' }).map((e) => e.name)
    ).toEqual(['Milo Calder']);
  });

  it('ranks a search by match quality instead of the sort order', () => {
    expect(filterEntities(ENTITIES, { query: 'ca', sort: 'name' }).map((e) => e.name)).toEqual([
      'Milo Calder'
    ]);
    expect(filterEntities(ENTITIES, { query: 'zzz' })).toEqual([]);
  });

  it('applies filters before searching', () => {
    expect(filterEntities(ENTITIES, { query: 'a', status: 'complete' }).map((e) => e.name)).toEqual(
      ['Ashfall']
    );
  });

  it('does not mutate the input array', () => {
    const input = [...ENTITIES];
    filterEntities(input, { sort: 'name' });
    expect(input).toEqual(ENTITIES);
  });
});
