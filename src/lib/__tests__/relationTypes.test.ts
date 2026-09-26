import { RELATION_TYPES, relationTypeGroups } from '$lib/relationTypes';

describe('relationTypeGroups', () => {
  it('offers people relations first between two characters', () => {
    const { suggested } = relationTypeGroups('character', 'character');
    expect(suggested).toContain('sibling');
    expect(suggested).not.toContain('located_in');
  });

  it('assumes another character when no target is chosen yet', () => {
    expect(relationTypeGroups('character', null).suggested).toContain('lover');
  });

  it('suggests membership types for organizations on either side', () => {
    expect(relationTypeGroups('character', 'organization').suggested).toContain('member_of');
    expect(relationTypeGroups('organization', 'character').suggested).toContain('leader_of');
  });

  it('never drops a type: suggested plus other covers everything exactly once', () => {
    for (const [a, b] of [
      ['character', 'character'],
      ['character', 'location'],
      ['item', 'note'],
      ['culture', 'species']
    ]) {
      const { suggested, other } = relationTypeGroups(a, b);
      expect([...suggested, ...other].sort()).toEqual([...RELATION_TYPES].sort());
    }
  });
});
