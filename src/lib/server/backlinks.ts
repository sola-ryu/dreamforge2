import { ENTITY_DIRS, listEntities } from './entities';
import { listStories, listChapters, listScenes } from './stories';
import { entityTypeToRoute } from '$lib/utils/entityTypes';
import type { Backlink, BacklinkReason, EntityType } from '$lib/types';

/**
 * Tiptap persists mentions as `[@Label](mention://type/id)`, so an entity id in a
 * body or field value is what "X mentions Y" actually looks like on disk.
 */
export function mentionsEntity(text: unknown, entityId: string): boolean {
  if (typeof text !== 'string') return false;
  return text.includes(`mention://`) && text.includes(`/${entityId})`);
}

function frontmatterMentions(frontmatter: Record<string, unknown>, entityId: string): boolean {
  for (const [key, value] of Object.entries(frontmatter)) {
    if (key === 'id' || key === 'slug') continue;
    if (typeof value === 'string' && mentionsEntity(value, entityId)) return true;
    if (Array.isArray(value) && value.some((v) => mentionsEntity(v, entityId))) return true;
  }
  return false;
}

/**
 * Everywhere an entity is referenced: mentions inside other entities' bodies and
 * fields, and scenes that mention it, list it as a participant, or name it as the
 * narrator or place.
 */
export function getBacklinks(
  projectId: string,
  projectPath: string,
  entity: { id: string; name: string }
): Backlink[] {
  const results: Backlink[] = [];

  for (const type of Object.keys(ENTITY_DIRS) as EntityType[]) {
    for (const other of listEntities(projectId, projectPath, type)) {
      if (other.id === entity.id) continue;

      const inBody = mentionsEntity(other.body, entity.id);
      if (!inBody && !frontmatterMentions(other.frontmatter, entity.id)) continue;

      results.push({
        kind: 'entity',
        id: other.id,
        name: other.name,
        context: type,
        href: `/projects/${projectId}/${entityTypeToRoute(type)}/${other.id}`,
        reason: inBody ? 'mention' : 'field'
      });
    }
  }

  for (const story of listStories(projectPath)) {
    for (const chapter of listChapters(projectPath, story.id)) {
      listScenes(projectPath, story.id, chapter.id).forEach((scene, i) => {
        let reason: BacklinkReason | null = null;

        if (scene.participants?.some((p) => p === entity.id || p === entity.name)) {
          reason = 'participant';
        } else if (scene.narrator && scene.narrator === entity.name) {
          reason = 'narrator';
        } else if (scene.place && scene.place === entity.name) {
          reason = 'place';
        } else if (mentionsEntity(scene.body, entity.id)) {
          reason = 'mention';
        }

        if (!reason) return;

        results.push({
          kind: 'scene',
          id: scene.id,
          name: scene.title || `Scene ${i + 1}`,
          context: `${story.title} › ${chapter.title}`,
          href: `/projects/${projectId}/stories/${story.id}?scene=${scene.id}`,
          reason
        });
      });
    }
  }

  return results;
}
