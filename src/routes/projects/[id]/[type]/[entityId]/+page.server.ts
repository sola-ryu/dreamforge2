import { fail, redirect } from '@sveltejs/kit';
import { getEntity, updateEntity, deleteEntity } from '$lib/server/entities';
import { routeToEntityType } from '$lib/utils/entityTypes';
import { addBookmark, removeBookmark, isBookmarked } from '$lib/server/bookmarks';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export const load = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const entityType = routeToEntityType(params.type);
  if (!entityType) throw redirect(302, `/projects/${params.id}`);

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) throw redirect(302, '/projects');

  const entity = getEntity(params.id, project.dataPath, entityType, params.entityId);
  if (!entity) throw redirect(302, `/projects/${params.id}/${params.type}`);

  const bookmarked = isBookmarked(locals.user.id, params.id, params.entityId);

  return {
    entity,
    projectName: project.name,
    entityType,
    bookmarked
  };
};

export const actions = {
  update: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const data: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (key === 'tags') {
        data[key] = (value as string).split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        data[key] = value;
      }
    }
    updateEntity(params.id, project.dataPath, entityType, params.entityId, data);
    return { success: true };
  },

  delete: async ({ params, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });
    deleteEntity(params.id, project.dataPath, entityType, params.entityId);
    throw redirect(302, `/projects/${params.id}/${params.type}`);
  },

  toggleBookmark: async ({ params, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    if (isBookmarked(locals.user.id, params.id, params.entityId)) {
      removeBookmark(locals.user.id, params.id, params.entityId);
    } else {
      addBookmark(locals.user.id, params.id, params.entityId);
    }
    return { success: true };
  }
};
