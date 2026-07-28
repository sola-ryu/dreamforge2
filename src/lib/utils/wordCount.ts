/**
 * Counts words in a Markdown/HTML scene or entity body. Scene bodies come out of
 * Tiptap as Markdown that can still contain inline HTML, so both are stripped
 * before counting — otherwise `<p>` tags and `**` markers inflate the total.
 */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0;

  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ')
    .replace(/^\s{0,3}>\s?/gm, ' ')
    .replace(/^\s*[-*+]\s+/gm, ' ')
    .replace(/^\s*\d+\.\s+/gm, ' ')
    .replace(/^\s*([-*_])\s*(\1\s*){2,}$/gm, ' ')
    .replace(/[*_~]/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');

  const words = plain.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return words ? words.length : 0;
}

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

export function formatWordCount(count: number): string {
  return NUMBER_FORMAT.format(count);
}

/** Rough reading time in minutes at an average 250 wpm, floored at 1 for any text. */
export function readingMinutes(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.round(words / 250));
}
