import { describe, it, expect } from 'vitest';
import { renderMarkdown, stripMentions } from '../renderMarkdown';

describe('stripMentions', () => {
  it('keeps the label and drops the mention link', () => {
    expect(stripMentions('Then [@Holly](mention://character/abc-123) spoke.')).toBe(
      'Then Holly spoke.'
    );
  });

  it('handles several mentions in one string', () => {
    expect(
      stripMentions('[@A](mention://character/1) met [@B](mention://location/2) at dusk')
    ).toBe('A met B at dusk');
  });

  it('leaves ordinary links alone', () => {
    expect(stripMentions('see [the map](/projects/x/images/y)')).toBe(
      'see [the map](/projects/x/images/y)'
    );
  });
});

describe('renderMarkdown', () => {
  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown(null)).toBe('');
    expect(renderMarkdown('   ')).toBe('');
  });

  it('renders emphasis and paragraphs as HTML', () => {
    const html = renderMarkdown('The **rain** fell.\n\nThen it stopped.');
    expect(html).toContain('<strong>rain</strong>');
    expect(html.match(/<p>/g)).toHaveLength(2);
  });

  it('renders mentions as plain text', () => {
    const html = renderMarkdown('[@Holly](mention://character/abc) waited.');
    expect(html).toContain('Holly waited.');
    expect(html).not.toContain('mention://');
  });

  it('strips dangerous markup', () => {
    const html = renderMarkdown('hello <script>alert(1)</script> world');
    expect(html).not.toContain('<script>');
    expect(html).toContain('hello');
  });

  it('keeps safe inline HTML that bodies may already contain', () => {
    expect(renderMarkdown('<em>already html</em>')).toContain('<em>already html</em>');
  });
});
