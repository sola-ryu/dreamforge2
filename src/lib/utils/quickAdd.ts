export interface QuickAdd {
  name: string;
  traits: string[];
}

export function parseQuickAdd(input: string, allowTraits: boolean): QuickAdd {
  const trimmed = input.trim();
  const colon = trimmed.indexOf(':');
  if (!allowTraits || colon === -1) return { name: trimmed, traits: [] };

  const name = trimmed.slice(0, colon).trim();
  if (!name) return { name: trimmed, traits: [] };

  const seen = new Set<string>();
  const traits = trimmed
    .slice(colon + 1)
    .split(',')
    .map((t) => t.trim())
    .filter((t) => {
      const key = t.toLowerCase();
      if (!t || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return { name, traits };
}
