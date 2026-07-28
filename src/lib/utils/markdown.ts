import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { linkifyMentions } from './mentions';

/**
 * Renders a stored Markdown body for a read-only view: mentions become links into
 * the project, Markdown becomes HTML, and the result is sanitized because bodies
 * may contain inline HTML.
 */
export function renderBodyHtml(markdown: string | null | undefined, projectId: string): string {
  if (!markdown || !markdown.trim()) return '';
  const linked = linkifyMentions(markdown, projectId);
  return DOMPurify.sanitize(marked.parse(linked, { async: false }) as string);
}
