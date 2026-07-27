import { ENTITY_DIRS, listEntities } from './entities';
import type { EntityType } from '$lib/types';

export interface SearchResult {
  id: string;
  projectId: string;
  type: EntityType;
  name: string;
  tags: string[];
  status: string;
  modifiedAt: string;
  matchedIn: 'name' | 'body' | 'field';
  snippet: string | null;
}

const SNIPPET_RADIUS = 60;

// Frontmatter keys that are structural, not user content — never worth matching on
// or showing in a snippet.
const SKIP_FRONTMATTER_KEYS = new Set([
  'id',
  'name',
  'slug',
  'type',
  'status',
  'imagePath',
  'created',
  'modified'
]);

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSnippet(text: string, query: string): string | null {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;

  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(text.length, idx + query.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function searchFrontmatter(frontmatter: Record<string, unknown>, query: string): string | null {
  const lowerQuery = query.toLowerCase();

  for (const [key, value] of Object.entries(frontmatter)) {
    if (SKIP_FRONTMATTER_KEYS.has(key)) continue;

    if (typeof value === 'string') {
      if (value.toLowerCase().includes(lowerQuery)) {
        return buildSnippet(stripHtml(value), query);
      }
    } else if (Array.isArray(value)) {
      const joined = value.filter((v): v is string => typeof v === 'string').join(', ');
      if (joined.toLowerCase().includes(lowerQuery)) {
        return buildSnippet(joined, query);
      }
    }
  }

  return null;
}

/**
 * Searches entity names, body text, and custom field values for a project. Reads
 * markdown files directly (via listEntities) rather than the SQLite index, which
 * only ever indexed names — fine for the entity counts a single project has today,
 * but should move to an FTS5 index if that stops being true.
 */
export function searchProjectContent(
  projectId: string,
  projectPath: string,
  query: string,
  typeFilter?: EntityType
): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const types: EntityType[] = typeFilter
    ? [typeFilter]
    : (Object.keys(ENTITY_DIRS) as EntityType[]);

  const results: SearchResult[] = [];

  for (const type of types) {
    for (const entity of listEntities(projectId, projectPath, type)) {
      if (entity.name.toLowerCase().includes(trimmed.toLowerCase())) {
        results.push({
          id: entity.id,
          projectId,
          type,
          name: entity.name,
          tags: entity.tags,
          status: entity.status,
          modifiedAt: entity.modifiedAt,
          matchedIn: 'name',
          snippet: null
        });
        continue;
      }

      const bodySnippet = buildSnippet(stripHtml(entity.body || ''), trimmed);
      if (bodySnippet) {
        results.push({
          id: entity.id,
          projectId,
          type,
          name: entity.name,
          tags: entity.tags,
          status: entity.status,
          modifiedAt: entity.modifiedAt,
          matchedIn: 'body',
          snippet: bodySnippet
        });
        continue;
      }

      const fieldSnippet = searchFrontmatter(entity.frontmatter, trimmed);
      if (fieldSnippet) {
        results.push({
          id: entity.id,
          projectId,
          type,
          name: entity.name,
          tags: entity.tags,
          status: entity.status,
          modifiedAt: entity.modifiedAt,
          matchedIn: 'field',
          snippet: fieldSnippet
        });
      }
    }
  }

  results.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  return results;
}
