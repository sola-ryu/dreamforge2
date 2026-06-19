import { Node, mergeAttributes } from '@tiptap/core';

export interface MentionAttrs {
  id: string;
  type: string;
  label: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mention: {
      insertMention: (attrs: MentionAttrs) => ReturnType;
    };
  }
}

export const MentionExtension = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      type: { default: 'character' },
      label: { default: '' }
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-mention]' }];
  },

  renderHTML({ node }) {
    return [
      'span',
      { 'data-mention': '', 'data-type': node.attrs.type, 'data-id': node.attrs.id },
      `@${node.attrs.label}`
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label}`;
  },

  addCommands() {
    return {
      insertMention:
        (attrs) =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name, attrs }).run();
        }
    };
  }
});
