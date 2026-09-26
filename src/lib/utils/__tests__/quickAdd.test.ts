import { parseQuickAdd } from '../quickAdd';

describe('parseQuickAdd', () => {
  it('returns a bare name with no traits', () => {
    expect(parseQuickAdd('  Vess  ', true)).toEqual({ name: 'Vess', traits: [] });
  });

  it('splits traits after the colon', () => {
    expect(parseQuickAdd('Vess: cynical, smuggler ,owes the Guild', true)).toEqual({
      name: 'Vess',
      traits: ['cynical', 'smuggler', 'owes the Guild']
    });
  });

  it('drops empty and duplicate traits', () => {
    expect(parseQuickAdd('Vess: cynical,, Cynical, ', true).traits).toEqual(['cynical']);
  });

  it('keeps the whole string as the name when traits are not supported', () => {
    expect(parseQuickAdd('Port Vale: harbour town', false)).toEqual({
      name: 'Port Vale: harbour town',
      traits: []
    });
  });

  it('keeps the whole string as the name when nothing precedes the colon', () => {
    expect(parseQuickAdd(': cynical', true)).toEqual({ name: ': cynical', traits: [] });
  });
});
