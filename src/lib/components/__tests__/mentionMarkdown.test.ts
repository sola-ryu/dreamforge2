import { describe, it, expect } from 'vitest';
import { MarkdownManager } from '@tiptap/markdown';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { MentionWithMarkdown } from '../mentionMarkdown';

// MarkdownManager.parse()/serialize() don't need a live Editor/DOM, so this can run
// in the plain 'node' vitest environment without instantiating a full Tiptap Editor.
const manager = new MarkdownManager({
  extensions: [StarterKit, MentionWithMarkdown.configure({})]
});

function firstParagraphContent(doc: JSONContent): JSONContent[] {
  return doc.content?.[0]?.content || [];
}

describe('mention markdown round-trip', () => {
  it('parses [@Label](mention://type/id) into a mention node with id/type/label', () => {
    const doc = manager.parse('Hello [@Alice](mention://character/abc-123)!');
    const mentionNode = firstParagraphContent(doc).find((n) => n.type === 'mention');

    expect(mentionNode).toBeDefined();
    expect(mentionNode?.attrs).toEqual({ id: 'abc-123', type: 'character', label: 'Alice' });
  });

  it('serializes a mention node back into the mention link syntax', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', attrs: { id: 'abc-123', type: 'character', label: 'Alice' } },
            { type: 'text', text: '!' }
          ]
        }
      ]
    };

    expect(manager.serialize(doc).trim()).toBe('Hello [@Alice](mention://character/abc-123)!');
  });

  it('round-trips a mention node through markdown and back unchanged', () => {
    const attrs = { id: 'char-42', type: 'location', label: 'Sunspire Keep' };
    const doc: JSONContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'mention', attrs }] }]
    };

    const markdown = manager.serialize(doc);
    expect(markdown.trim()).toBe('[@Sunspire Keep](mention://location/char-42)');

    const reparsed = manager.parse(markdown);
    const mentionNode = firstParagraphContent(reparsed).find((n) => n.type === 'mention');
    expect(mentionNode?.attrs).toEqual(attrs);
  });

  it('leaves ordinary links alone', () => {
    const doc = manager.parse('See [my site](https://example.com) for more.');
    const content = firstParagraphContent(doc);

    expect(content.some((n) => n.type === 'mention')).toBe(false);
    expect(content.some((n) => n.marks?.some((m: { type: string }) => m.type === 'link'))).toBe(
      true
    );
  });

  it('does not treat a plain [@text](url) link with a non-mention scheme as a mention', () => {
    const doc = manager.parse('[@handle](https://example.com/mention://fake)');
    const content = firstParagraphContent(doc);

    expect(content.some((n) => n.type === 'mention')).toBe(false);
  });
});
