import Highlight from '@tiptap/extension-highlight';

declare module '@tiptap/core' {
  interface MarkConfig<Options, Storage> {
    markdownTokenizer?: Record<string, unknown>;
    parseMarkdown?: (token: unknown, helpers: Record<string, unknown>) => unknown;
    renderMarkdown?: (node: Record<string, unknown>, helpers: Record<string, unknown>) => string;
  }
}

export const HighlightMarkdown = Highlight.extend({
  markdownTokenizer: {
    name: 'highlight',
    level: 'inline',
    start: (src: string) => src.indexOf('=='),
    tokenize: (
      src: string,
      _tokens: unknown[],
      lexer: { inlineTokens: (s: string) => unknown[] }
    ) => {
      const match = /^==([^=]+)==/.exec(src);
      if (!match) {
        return undefined;
      }
      return {
        type: 'highlight',
        raw: match[0],
        tokens: lexer.inlineTokens(match[1])
      };
    }
  },

  parseMarkdown: (token: unknown, helpers: Record<string, unknown>) => {
    const t = token as { tokens?: unknown[] };
    const h = helpers as {
      applyMark: (n: string, c: unknown) => unknown;
      parseInline: (t: unknown[]) => unknown;
    };
    return h.applyMark('highlight', h.parseInline(t.tokens || []));
  },

  renderMarkdown: (node: Record<string, unknown>, helpers: Record<string, unknown>) => {
    const h = helpers as { renderChildren: (c: unknown[]) => string };
    const content = h.renderChildren((node.content || []) as unknown[]);
    return `==${content}==`;
  }
});
