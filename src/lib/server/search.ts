import { ENTITY_DIRS, listEntities } from './entities';
import { listStories, listChapters, listScenes } from './stories';
import { entityTypeToRoute } from '$lib/utils/entityTypes';
import type { EntityType } from '$lib/types';

export interface SearchResult {
  kind: 'entity' | 'scene';
  id: string;
  projectId: string;
  /** Entity type for entities; the owning story's title for scenes. */
  type: EntityType | string;
  name: string;
  /** Where the hit lives, e.g. "Story › Chapter" for a scene. */
  context: string;
  href: string;
  tags: string[];
  status: string;
  modifiedAt: string;
  matchedIn: 'name' | 'body' | 'field' | 'summary';
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
 * Searches names, body text, custom field values, and scene summaries for a
 * project. Reads markdown files directly (via listEntities/listScenes) rather than
 * the SQLite index, which only ever indexed entity names — fine for the content a
 * single project has today, but should move to an FTS5 index if that stops being
 * true.
 */
export function searchProjectContent(
  projectId: string,
  projectPath: string,
  query: string,
  options: { typeFilter?: EntityType; kind?: 'entity' | 'scene' } = {}
): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { typeFilter, kind } = options;
  const results: SearchResult[] = [];

  if (kind !== 'scene') {
    const types: EntityType[] = typeFilter
      ? [typeFilter]
      : (Object.keys(ENTITY_DIRS) as EntityType[]);

    for (const type of types) {
      for (const entity of listEntities(projectId, projectPath, type)) {
        const base = {
          kind: 'entity' as const,
          id: entity.id,
          projectId,
          type,
          name: entity.name,
          context: ENTITY_DIRS[type],
          href: `/projects/${projectId}/${entityTypeToRoute(type)}/${entity.id}`,
          tags: entity.tags,
          status: entity.status,
          modifiedAt: entity.modifiedAt
        };

        if (entity.name.toLowerCase().includes(trimmed.toLowerCase())) {
          results.push({ ...base, matchedIn: 'name', snippet: null });
          continue;
        }

        const bodySnippet = buildSnippet(stripHtml(entity.body || ''), trimmed);
        if (bodySnippet) {
          results.push({ ...base, matchedIn: 'body', snippet: bodySnippet });
          continue;
        }

        const fieldSnippet = searchFrontmatter(entity.frontmatter, trimmed);
        if (fieldSnippet) {
          results.push({ ...base, matchedIn: 'field', snippet: fieldSnippet });
        }
      }
    }
  }

  if (kind !== 'entity' && !typeFilter) {
    for (const story of listStories(projectPath)) {
      for (const chapter of listChapters(projectPath, story.id)) {
        listScenes(projectPath, story.id, chapter.id).forEach((scene, i) => {
          const name = scene.title || `Scene ${i + 1}`;
          const base = {
            kind: 'scene' as const,
            id: scene.id,
            projectId,
            type: story.title,
            name,
            context: `${story.title} › ${chapter.title}`,
            href: `/projects/${projectId}/stories/${story.id}?scene=${scene.id}`,
            tags: [] as string[],
            status: 'draft',
            modifiedAt: scene.modifiedAt
          };

          if (name.toLowerCase().includes(trimmed.toLowerCase())) {
            results.push({ ...base, matchedIn: 'name', snippet: null });
            return;
          }

          const bodySnippet = buildSnippet(stripHtml(scene.body || ''), trimmed);
          if (bodySnippet) {
            results.push({ ...base, matchedIn: 'body', snippet: bodySnippet });
            return;
          }

          const summarySnippet = buildSnippet(stripHtml(scene.summary || ''), trimmed);
          if (summarySnippet) {
            results.push({ ...base, matchedIn: 'summary', snippet: summarySnippet });
          }
        });
      }
    }
  }

  results.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  return results;
}
