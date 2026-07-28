/**
 * Ranking helper for the command palette. Lower scores rank higher; `null` means
 * the query does not match at all. Substring hits always beat subsequence hits,
 * and hits at a word boundary beat hits in the middle of a word, so typing "hol"
 * surfaces "Holly" before "Nicholas".
 */
export function fuzzyScore(text: string, query: string): number | null {
  if (!query) return 0;

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();

  let best: number | null = null;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
    const score = at === 0 ? -100 : /[\s\-_/,.]/.test(haystack[at - 1]) ? -50 + at : at;
    if (best === null || score < best) best = score;
  }
  if (best !== null) return best;

  let cursor = 0;
  let score = 200;
  let previous = -2;

  for (const char of needle) {
    const idx = haystack.indexOf(char, cursor);
    if (idx === -1) return null;
    score += idx === previous + 1 ? 0 : idx - cursor + 1;
    previous = idx;
    cursor = idx + 1;
  }

  return score;
}

export interface FuzzyMatch<T> {
  item: T;
  score: number;
}

/**
 * Scores every item against `query` using the best-scoring of its search strings,
 * then returns the top `limit` matches. An empty query keeps the original order.
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  toSearchStrings: (item: T) => string[],
  limit = Infinity
): T[] {
  if (!query.trim()) return items.slice(0, limit);

  const matches: FuzzyMatch<T>[] = [];

  for (const item of items) {
    let best: number | null = null;
    for (const candidate of toSearchStrings(item)) {
      const score = fuzzyScore(candidate, query);
      if (score !== null && (best === null || score < best)) best = score;
    }
    if (best !== null) matches.push({ item, score: best });
  }

  matches.sort((a, b) => a.score - b.score);

  return matches.slice(0, limit).map((m) => m.item);
}
