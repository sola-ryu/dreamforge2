import Mention from '@tiptap/extension-mention';

declare module '@tiptap/core' {
  interface NodeConfig {
    markdownTokenizer?: Record<string, unknown>;
    parseMarkdown?: (token: unknown, helpers: Record<string, unknown>) => unknown;
    renderMarkdown?: (node: Record<string, unknown>, helpers: Record<string, unknown>) => string;
  }
}

interface MentionToken {
  id: string;
  mentionType: string;
  label: string;
}

interface MentionNode {
  attrs?: { id?: string; type?: string; label?: string };
}

// Base Mention only tracks `id`/`label` — the entity's type (character, location,
// etc.) isn't part of its schema at all, so it was silently dropped on every
// mention insert. Stored as `data-mention-type` rather than `data-type`, which
// Mention's own renderHTML already uses as its node-type discriminator.
export const MentionWithMarkdown = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-mention-type'),
        renderHTML: (attributes: { type?: string }) => {
          if (!attributes.type) return {};
          return { 'data-mention-type': attributes.type };
        }
      }
    };
  },

  // Round-trips a mention through Markdown as [@Label](mention://type/id) instead
  // of degrading to plain text, which lost the entity id/type on every save.
  markdownTokenizer: {
    name: 'mention',
    level: 'inline',
    start: (src: string) => src.indexOf('[@'),
    tokenize: (src: string) => {
      const match = /^\[@([^\]]+)\]\(mention:\/\/([a-z]+)\/([^)\s]+)\)/.exec(src);
      if (!match) return undefined;
      return {
        type: 'mention',
        raw: match[0],
        label: match[1],
        mentionType: match[2],
        id: match[3]
      };
    }
  },

  parseMarkdown: (token: unknown) => {
    const t = token as MentionToken;
    return {
      type: 'mention',
      attrs: { id: t.id, type: t.mentionType, label: t.label }
    };
  },

  renderMarkdown: (node: unknown) => {
    const n = node as MentionNode;
    const { id, type, label } = n.attrs || {};
    return `[@${label}](mention://${type}/${id})`;
  }
});
