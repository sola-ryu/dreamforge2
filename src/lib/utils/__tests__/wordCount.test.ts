import { countWords, formatWordCount, readingMinutes } from '../wordCount';

describe('countWords', () => {
  it('returns 0 for empty input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords(null)).toBe(0);
    expect(countWords(undefined)).toBe(0);
    expect(countWords('   \n\n  ')).toBe(0);
  });

  it('counts plain words', () => {
    expect(countWords('The rain fell on the empty street')).toBe(7);
  });

  it('ignores punctuation but keeps hyphens and apostrophes inside words', () => {
    expect(countWords("She'd left — well-worn, again.")).toBe(4);
  });

  it('strips HTML tags', () => {
    expect(countWords('<p>Two words</p>')).toBe(2);
    expect(countWords('<img src="x.png" alt="a b c" />')).toBe(0);
  });

  it('strips markdown emphasis and heading markers', () => {
    expect(countWords('## A Loud **Noise**')).toBe(3);
    expect(countWords('> quoted line here')).toBe(3);
    expect(countWords('- one\n- two\n- three')).toBe(3);
    expect(countWords('1. first\n2. second')).toBe(2);
  });

  it('counts link text but not link targets', () => {
    expect(countWords('See [the tower](/projects/abc/locations/def) now')).toBe(4);
  });

  it('ignores images entirely', () => {
    expect(countWords('![a caption here](/img/x.png)')).toBe(0);
  });

  it('ignores fenced and inline code', () => {
    expect(countWords('before\n```\nlots of code words\n```\nafter')).toBe(2);
    expect(countWords('run `npm run dev` now')).toBe(2);
  });

  it('ignores horizontal rules', () => {
    expect(countWords('one\n\n---\n\ntwo')).toBe(2);
  });

  it('counts non-latin scripts as words', () => {
    expect(countWords('ミドリ セキ')).toBe(2);
  });
});

describe('formatWordCount', () => {
  it('groups thousands', () => {
    expect(formatWordCount(0)).toBe('0');
    expect(formatWordCount(1234567)).toBe('1,234,567');
  });
});

describe('readingMinutes', () => {
  it('is 0 for no words and at least 1 for any words', () => {
    expect(readingMinutes(0)).toBe(0);
    expect(readingMinutes(5)).toBe(1);
  });

  it('rounds to the nearest minute at 250 wpm', () => {
    expect(readingMinutes(500)).toBe(2);
    expect(readingMinutes(2500)).toBe(10);
  });
});
