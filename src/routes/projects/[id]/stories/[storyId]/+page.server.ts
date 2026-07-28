import { fail, redirect } from '@sveltejs/kit';
import {
  getStoryMeta,
  listChapters,
  createChapter,
  listScenes,
  createScene,
  updateScene,
  reorderChapters,
  reorderScenes,
  updateStory
} from '$lib/server/stories';
import { softDeleteChapter, softDeleteScene } from '$lib/server/trash';
import { searchEntities } from '$lib/server/entities';
import { sceneToNote } from '$lib/server/conversion';
import { getProjectAccess } from '$lib/server/members';
import { isSafePathSegment } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) throw redirect(302, '/projects');
  const { project, role } = access;

  const story = getStoryMeta(project.dataPath, params.storyId);
  if (!story) throw redirect(302, `/projects/${params.id}/stories`);

  const chapters = listChapters(project.dataPath, params.storyId);

  const chaptersWithScenes = chapters.map((ch) => ({
    ...ch,
    scenes: listScenes(project.dataPath, params.storyId, ch.id)
  }));

  const allEntities = searchEntities(params.id, '').map((e) => ({
    id: e.id,
    type: e.type,
    name: e.name,
    status: e.status
  }));

  return {
    story,
    chapters: chaptersWithScenes,
    projectName: project.name,
    entities: allEntities,
    role
  };
};

export const actions = {
  updateStory: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    updateStory(project.dataPath, params.storyId, {
      title: form.get('title') as string,
      description: form.get('description') as string
    });
    return { success: true };
  },

  createChapter: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const title = form.get('title') as string;
    if (!title) return fail(400, { error: 'Title is required' });
    createChapter(project.dataPath, params.storyId, title);
    return { success: true };
  },

  deleteChapter: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    if (!isSafePathSegment(chapterId)) return fail(400, { error: 'Invalid chapter ID' });
    const trashItem = softDeleteChapter(params.id, project.dataPath, params.storyId, chapterId);
    if (!trashItem) return fail(404, { error: 'Chapter not found' });
    return { success: true, trashItem };
  },

  createScene: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    if (!isSafePathSegment(chapterId)) return fail(400, { error: 'Invalid chapter ID' });
    createScene(project.dataPath, params.storyId, chapterId);
    return { success: true };
  },

  updateScene: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    const sceneId = form.get('sceneId') as string;
    if (!isSafePathSegment(chapterId) || !isSafePathSegment(sceneId)) {
      return fail(400, { error: 'Invalid chapter or scene ID' });
    }
    const data: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (key === 'participants')
        data[key] = (value as string)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      else if (key !== 'chapterId' && key !== 'sceneId') data[key] = value;
    }
    updateScene(project.dataPath, params.storyId, chapterId, sceneId, data as any);
    return { success: true };
  },

  deleteScene: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    const sceneId = form.get('sceneId') as string;
    if (!isSafePathSegment(chapterId) || !isSafePathSegment(sceneId)) {
      return fail(400, { error: 'Invalid chapter or scene ID' });
    }
    const trashItem = softDeleteScene(
      params.id,
      project.dataPath,
      params.storyId,
      chapterId,
      sceneId
    );
    if (!trashItem) return fail(404, { error: 'Scene not found' });
    return { success: true, trashItem };
  },

  reorderChapters: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const chapterIds = JSON.parse(form.get('chapterIds') as string) as string[];
    if (!Array.isArray(chapterIds) || !chapterIds.every(isSafePathSegment)) {
      return fail(400, { error: 'Invalid chapter IDs' });
    }
    reorderChapters(project.dataPath, params.storyId, chapterIds);
    return { success: true };
  },

  convertToNote: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    const sceneId = form.get('sceneId') as string;
    if (!isSafePathSegment(chapterId) || !isSafePathSegment(sceneId)) {
      return fail(400, { error: 'Invalid chapter or scene ID' });
    }
    const note = sceneToNote(params.id, project.dataPath, params.storyId, chapterId, sceneId);
    if (!note) return fail(500, { error: 'Conversion failed' });
    return { success: true, noteId: note.id };
  },

  reorderScenes: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    const sceneIds = JSON.parse(form.get('sceneIds') as string) as string[];
    if (
      !isSafePathSegment(chapterId) ||
      !Array.isArray(sceneIds) ||
      !sceneIds.every(isSafePathSegment)
    ) {
      return fail(400, { error: 'Invalid chapter or scene IDs' });
    }
    reorderScenes(project.dataPath, params.storyId, chapterId, sceneIds);
    return { success: true };
  }
};
