import { fail, redirect } from '@sveltejs/kit';
import {
  getStoryMeta, listChapters, createChapter, deleteChapter,
  listScenes, createScene, updateScene, deleteScene,
  reorderChapters, reorderScenes, updateStory, deleteStory
} from '$lib/server/stories';
import { searchEntities } from '$lib/server/entities';
import { sceneToNote } from '$lib/server/conversion';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export const load = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) throw redirect(302, '/projects');

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

  return { story, chapters: chaptersWithScenes, projectName: project.name, entities: allEntities };
};

export const actions = {
  updateStory: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    updateStory(project.dataPath, params.storyId, {
      title: form.get('title') as string,
      description: form.get('description') as string
    });
    return { success: true };
  },

  createChapter: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    const title = form.get('title') as string;
    if (!title) return fail(400, { error: 'Title is required' });
    createChapter(project.dataPath, params.storyId, title);
    return { success: true };
  },

  deleteChapter: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    deleteChapter(project.dataPath, params.storyId, form.get('chapterId') as string);
    return { success: true };
  },

  createScene: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    createScene(project.dataPath, params.storyId, chapterId);
    return { success: true };
  },

  updateScene: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    const sceneId = form.get('sceneId') as string;
    const data: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (key === 'participants') data[key] = (value as string).split(',').map(s => s.trim()).filter(Boolean);
      else if (key !== 'chapterId' && key !== 'sceneId') data[key] = value;
    }
    updateScene(project.dataPath, params.storyId, chapterId, sceneId, data as any);
    return { success: true };
  },

  deleteScene: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    deleteScene(project.dataPath, params.storyId, form.get('chapterId') as string, form.get('sceneId') as string);
    return { success: true };
  },

  reorderChapters: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    const chapterIds = JSON.parse(form.get('chapterIds') as string);
    reorderChapters(project.dataPath, params.storyId, chapterIds);
    return { success: true };
  },

  convertToNote: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    const sceneId = form.get('sceneId') as string;
    const note = sceneToNote(params.id, project.dataPath, params.storyId, chapterId, sceneId);
    if (!note) return fail(500, { error: 'Conversion failed' });
    return { success: true, noteId: note.id };
  },

  reorderScenes: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    const sceneIds = JSON.parse(form.get('sceneIds') as string);
    reorderScenes(project.dataPath, params.storyId, chapterId, sceneIds);
    return { success: true };
  }
};
