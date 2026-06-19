import { fail, redirect } from '@sveltejs/kit';
import { listEntities, createEntity, searchEntities } from '$lib/server/entities';
import { softDeleteEntity, restoreEntity } from '$lib/server/trash';
import { routeToEntityType } from '$lib/utils/entityTypes';
import { watchProject, scanProject } from '$lib/server/watcher';
import { getNoteTemplates } from '$lib/server/templates';
import { getCustomFieldDefs } from '$lib/server/customFields';
import { mergeFields, ENTITY_FIELDS } from '$lib/entityFields';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { EntityType } from '$lib/types';

const drizzleDb = drizzle(db);

export const load = async ({ params, locals, url }) => {
  if (!locals.user) throw redirect(302, '/login');

  const entityType = routeToEntityType(params.type);
  if (!entityType) throw redirect(302, `/projects/${params.id}`);

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) throw redirect(302, '/projects');

  scanProject(params.id, project.dataPath);
  watchProject(params.id, project.dataPath);

  const query = url.searchParams.get('q') || '';
  const status = url.searchParams.get('status') || '';

  let entityList;
  if (query) {
    entityList = searchEntities(params.id, query, entityType);
  } else {
    entityList = listEntities(params.id, project.dataPath, entityType);
  }

  if (status) {
    entityList = entityList.filter((e) => e.status === status);
  }

  const customFieldDefs = getCustomFieldDefs(params.id, entityType).map((f) => ({
    key: f.key,
    label: f.label,
    type: f.fieldType,
    entityType: f.refEntityType || undefined,
    placeholder: f.placeholder || undefined,
    required: f.required
  }));

  const mergedFields = mergeFields(ENTITY_FIELDS[entityType], customFieldDefs);

  return {
    entities: entityList,
    entityType,
    projectName: project.name,
    query,
    status,
    templates: entityType === 'note' ? getNoteTemplates() : [],
    customFields: mergedFields
  };
};

export const actions = {
  create: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });

    const project = drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
      .get();

    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const name = form.get('name') as string;
    if (!name) return fail(400, { error: 'Name is required' });

    const body = entityType === 'note' ? (form.get('body') as string) || '' : undefined;

    createEntity(params.id, project.dataPath, entityType, { name, body: body || undefined });

    return { success: true };
  },

  delete: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });

    const project = drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
      .get();

    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const entityId = form.get('entityId') as string;
    if (!entityId) return fail(400, { error: 'Entity ID required' });

    const trashItem = softDeleteEntity(params.id, project.dataPath, entityType, entityId);

    return { success: true, trashItem };
  },

  restore: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
      .get();
    if (!project) return fail(404, { error: 'Project not found' });
    const form = await request.formData();
    const trashId = form.get('trashId') as string;
    if (!trashId) return fail(400, { error: 'Trash ID required' });
    const ok = restoreEntity(params.id, project.dataPath, trashId);
    if (!ok) return fail(500, { error: 'Restore failed' });
    return { success: true };
  }
};
