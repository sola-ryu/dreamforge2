import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Mentions are stored as `[@Label](mention://type/id)`. That link target means
 * nothing outside the app, so exported prose keeps the label and drops the link.
 */
export function stripMentions(markdown: string): string {
  return markdown.replace(/\[@([^\]]+)\]\(mention:\/\/[^)]*\)/g, '$1');
}

/**
 * Scene and entity bodies are Markdown. Anything rendering them into a standalone
 * HTML document has to parse them first — otherwise `**emphasis**` and mention
 * links reach the page as literal text — and sanitize the result, since bodies can
 * contain inline HTML.
 */
export function renderMarkdown(markdown: string | null | undefined): string {
  if (!markdown || !markdown.trim()) return '';
  const html = marked.parse(stripMentions(markdown), { async: false }) as string;
  return DOMPurify.sanitize(html);
}
