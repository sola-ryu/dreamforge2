import { fuzzyScore } from './fuzzy';

export type EntitySort = 'modified' | 'name' | 'created';

export interface FilterableEntity {
  name: string;
  status?: string;
  tags?: string[];
  createdAt?: string;
  modifiedAt?: string;
}

export interface EntityFilters {
  query?: string;
  status?: string;
  /** An entity must carry every selected tag, so filters narrow rather than widen. */
  tags?: string[];
  sort?: EntitySort;
}

/** Every tag in use, with how many entities carry it, most used first. */
export function collectTags<T extends FilterableEntity>(
  entities: T[]
): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();

  for (const entity of entities) {
    for (const tag of entity.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function filterEntities<T extends FilterableEntity>(
  entities: T[],
  filters: EntityFilters = {}
): T[] {
  const { query = '', status = '', tags = [], sort = 'modified' } = filters;

  let result = entities.filter((entity) => {
    if (status && (entity.status || 'draft') !== status) return false;
    if (tags.length > 0) {
      const entityTags = entity.tags || [];
      if (!tags.every((tag) => entityTags.includes(tag))) return false;
    }
    return true;
  });

  const trimmed = query.trim();
  if (trimmed) {
    result = result
      .map((entity) => ({ entity, score: fuzzyScore(entity.name, trimmed) }))
      .filter((row): row is { entity: T; score: number } => row.score !== null)
      .sort((a, b) => a.score - b.score)
      .map((row) => row.entity);
    // A search ranks by match quality; the sort control applies to browsing.
    return result;
  }

  const sorted = [...result];
  if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'created') {
    sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } else {
    sorted.sort((a, b) => (b.modifiedAt || '').localeCompare(a.modifiedAt || ''));
  }

  return sorted;
}
