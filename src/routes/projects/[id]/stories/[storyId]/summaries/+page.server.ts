import { redirect } from '@sveltejs/kit';
import { getStoryMeta, listChapters, listScenes, updateScene } from '$lib/server/stories';
import { listPlotlines } from '$lib/server/plots';
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

  const plotlines = listPlotlines(project.dataPath).filter((p) => p.storyId === params.storyId);

  return { story, chapters: chaptersWithScenes, plotlines, projectName: project.name };
};

export const actions = {
  updateSceneSummary: async ({ params, locals, request }) => {
    if (!locals.user) return { success: false };
    const project = drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
      .get();
    if (!project) return { success: false };
    const form = await request.formData();
    const chapterId = form.get('chapterId') as string;
    const sceneId = form.get('sceneId') as string;
    const field = form.get('field') as string;
    const value = form.get('value') as string;
    if (field === 'summary') {
      updateScene(project.dataPath, params.storyId, chapterId, sceneId, { summary: value || null });
    }
    return { success: true };
  }
};
