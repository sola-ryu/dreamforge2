import { ENTITY_DIRS, listEntities } from './entities';
import { listStories, listChapters, listScenes } from './stories';
import { countWords } from '$lib/utils/wordCount';
import { entityTypeToRoute } from '$lib/utils/entityTypes';
import type { EntityType, ProjectStats, RecentItem, StoryStats } from '$lib/types';

const RECENT_LIMIT = 8;

/**
 * Walks every scene and entity file once and aggregates the numbers the dashboard
 * shows. This reads the filesystem rather than the SQLite index because word counts
 * live in the file bodies, which the index deliberately does not store.
 */
export function getProjectStats(projectId: string, projectPath: string): ProjectStats {
  const entityCounts = {} as Record<EntityType, number>;
  const recent: RecentItem[] = [];
  let totalEntities = 0;

  for (const type of Object.keys(ENTITY_DIRS) as EntityType[]) {
    const list = listEntities(projectId, projectPath, type);
    entityCounts[type] = list.length;
    totalEntities += list.length;

    for (const entity of list.slice(0, RECENT_LIMIT)) {
      recent.push({
        kind: 'entity',
        id: entity.id,
        name: entity.name,
        context: type,
        href: `/projects/${projectId}/${entityTypeToRoute(type)}/${entity.id}`,
        modifiedAt: entity.modifiedAt
      });
    }
  }

  const stories: StoryStats[] = [];
  let chapterCount = 0;
  let sceneCount = 0;
  let wordCount = 0;
  let lastScene: ProjectStats['lastScene'] = null;
  let lastSceneModified = '';

  for (const story of listStories(projectPath)) {
    const chapters = listChapters(projectPath, story.id);
    let storyScenes = 0;
    let storyWords = 0;

    chapters.forEach((chapter) => {
      const scenes = listScenes(projectPath, story.id, chapter.id);
      storyScenes += scenes.length;

      scenes.forEach((scene, i) => {
        const words = countWords(scene.body);
        storyWords += words;

        const title = scene.title || `Scene ${i + 1}`;
        recent.push({
          kind: 'scene',
          id: scene.id,
          name: title,
          context: `${story.title} › ${chapter.title}`,
          href: `/projects/${projectId}/stories/${story.id}?scene=${scene.id}`,
          modifiedAt: scene.modifiedAt
        });

        if (scene.modifiedAt > lastSceneModified) {
          lastSceneModified = scene.modifiedAt;
          lastScene = { storyId: story.id, sceneId: scene.id, title, storyTitle: story.title };
        }
      });
    });

    stories.push({
      id: story.id,
      title: story.title,
      description: story.description,
      chapterCount: chapters.length,
      sceneCount: storyScenes,
      wordCount: storyWords,
      modifiedAt: story.modifiedAt
    });

    chapterCount += chapters.length;
    sceneCount += storyScenes;
    wordCount += storyWords;
  }

  recent.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));

  return {
    entityCounts,
    totalEntities,
    storyCount: stories.length,
    chapterCount,
    sceneCount,
    wordCount,
    stories,
    recent: recent.slice(0, RECENT_LIMIT),
    lastScene
  };
}
