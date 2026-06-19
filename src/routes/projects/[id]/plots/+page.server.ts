import { fail, redirect } from '@sveltejs/kit';
import { listPlotlines, createPlotline, deletePlotline } from '$lib/server/plots';
import { listStories } from '$lib/server/stories';
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

  const plotlines = listPlotlines(project.dataPath);
  const stories = listStories(project.dataPath);

  return { plotlines, stories, projectName: project.name };
};

export const actions = {
  create: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const project = drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
      .get();

    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const title = form.get('title') as string;
    const storyId = form.get('storyId') as string;

    if (!title) return fail(400, { error: 'Title is required' });

    const templateId = form.get('template') as string || null;

    createPlotline(project.dataPath, { title, storyId, template: templateId });
    return { success: true };
  },

  delete: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const project = drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
      .get();

    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const plotlineId = form.get('plotlineId') as string;
    deletePlotline(project.dataPath, plotlineId);
    return { success: true };
  }
};
