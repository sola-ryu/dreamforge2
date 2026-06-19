import { createEntity, updateEntity, getEntity } from './entities';
import { createScene, getScene, updateScene, listChapters, createChapter } from './stories';
import { generateId } from '$lib/utils';
import type { EntityType } from '$lib/types';

export function noteToScene(
  projectId: string,
  projectPath: string,
  noteId: string,
  storyId: string,
  chapterId: string | null,
  newChapterTitle?: string
) {
  const note = getEntity(projectId, projectPath, 'note', noteId);
  if (!note) return null;

  let targetChapterId = chapterId;
  if (!targetChapterId) {
    const chapters = listChapters(projectPath, storyId);
    if (chapters.length === 0) {
      const chapter = createChapter(projectPath, storyId, newChapterTitle || 'Notes');
      targetChapterId = chapter.id;
    } else {
      targetChapterId = chapters[0].id;
    }
  }

  const scene = createScene(projectPath, storyId, targetChapterId, note.name);
  updateScene(projectPath, storyId, targetChapterId, scene.id, {
    body: note.body,
    title: note.name,
    narrator: (note.frontmatter?.narrator as string | null) || null,
    time: (note.frontmatter?.time as string | null) || null,
    place: (note.frontmatter?.place as string | null) || null
  });

  updateEntity(projectId, projectPath, 'note', noteId, {
    status: 'archived',
    convertedTo: scene.id,
    body: `---\n_Converted to scene: ${scene.id} in story ${storyId}_\n\n---\n\n${note.body}`
  });

  return scene;
}

export function sceneToNote(
  projectId: string,
  projectPath: string,
  storyId: string,
  chapterId: string,
  sceneId: string
) {
  const scene = getScene(projectPath, storyId, chapterId, sceneId);
  if (!scene) return null;

  const noteId = generateId();
  const body = `_Converted from scene: ${sceneId} in story ${storyId}_\n\n---\n\n${scene.body}`;

  const note = createEntity(projectId, projectPath, 'note', {
    name: scene.title || 'Untitled Scene',
    body,
    status: 'draft',
    tags: [],
    convertedFrom: sceneId
  });

  updateScene(projectPath, storyId, chapterId, sceneId, {
    body: `---\n_Converted to note: ${note.id}_\n\n---\n\n${scene.body}`
  });

  return note;
}
