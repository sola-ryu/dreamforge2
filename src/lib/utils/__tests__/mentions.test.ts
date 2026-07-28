import { linkifyMentions } from '../mentions';

const PROJECT = 'proj-1';

describe('linkifyMentions', () => {
  it('returns an empty string for empty input', () => {
    expect(linkifyMentions('', PROJECT)).toBe('');
    expect(linkifyMentions(null, PROJECT)).toBe('');
  });

  it('rewrites a mention into an in-app entity link', () => {
    expect(linkifyMentions('Then [@Holly](mention://character/abc) spoke.', PROJECT)).toBe(
      'Then [@Holly](/projects/proj-1/characters/abc) spoke.'
    );
  });

  it('routes each entity type to its own section', () => {
    expect(linkifyMentions('[@Keep](mention://location/x)', PROJECT)).toContain('/locations/x');
    expect(linkifyMentions('[@Guild](mention://organization/x)', PROJECT)).toContain(
      '/organizations/x'
    );
    expect(linkifyMentions('[@Elf](mention://species/x)', PROJECT)).toContain('/species/x');
  });

  it('rewrites several mentions in one body', () => {
    const out = linkifyMentions('[@A](mention://character/1) and [@B](mention://item/2)', PROJECT);
    expect(out).toBe('[@A](/projects/proj-1/characters/1) and [@B](/projects/proj-1/items/2)');
  });

  it('drops the link but keeps the label for an unknown type', () => {
    expect(linkifyMentions('[@Thing](mention://religion/x)', PROJECT)).toBe('Thing');
  });

  it('leaves ordinary links and text alone', () => {
    const text = 'see [the map](/projects/proj-1/images/y) and @notamention';
    expect(linkifyMentions(text, PROJECT)).toBe(text);
  });
});
