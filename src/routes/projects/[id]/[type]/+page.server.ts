import { fail, redirect } from '@sveltejs/kit';
import { listEntities, createEntity, searchEntities, updateEntity } from '$lib/server/entities';
import { softDeleteEntity, restoreEntity } from '$lib/server/trash';
import { routeToEntityType } from '$lib/utils/entityTypes';
import { watchProject, scanProject } from '$lib/server/watcher';
import { getNoteTemplates } from '$lib/server/templates';
import { getCustomFieldDefs } from '$lib/server/customFields';
import { mergeFields, ENTITY_FIELDS } from '$lib/entityFields';
import { getProjectAccess } from '$lib/server/members';
import type { EntityType } from '$lib/types';

export const load = async ({ params, locals, url }) => {
  if (!locals.user) throw redirect(302, '/login');

  const entityType = routeToEntityType(params.type);
  if (!entityType) throw redirect(302, `/projects/${params.id}`);

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) throw redirect(302, '/projects');
  const { project, role } = access;

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
    customFields: mergedFields,
    role
  };
};

export const actions = {
  create: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const form = await request.formData();
    const name = form.get('name') as string;
    if (!name) return fail(400, { error: 'Name is required' });

    const body = entityType === 'note' ? (form.get('body') as string) || '' : undefined;

    createEntity(params.id, project.dataPath, entityType, { name, body: body || undefined });

    return { success: true };
  },

  quickUpdate: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const form = await request.formData();
    const entityId = form.get('entityId') as string;
    const field = form.get('field') as string;
    const value = form.get('value') as string;

    if (!entityId || !field) return fail(400, { error: 'entityId and field are required' });

    const customFieldDefs = getCustomFieldDefs(params.id, entityType);
    const customFieldKeys = new Set(customFieldDefs.map((f) => f.key));
    const allowedFields = new Set(['name', 'status', ...customFieldKeys]);

    if (!allowedFields.has(field))
      return fail(400, { error: 'Field not allowed for quick update' });

    updateEntity(params.id, project.dataPath, entityType, entityId, { [field]: value });

    return { success: true };
  },

  delete: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const form = await request.formData();
    const entityId = form.get('entityId') as string;
    if (!entityId) return fail(400, { error: 'Entity ID required' });

    const trashItem = softDeleteEntity(params.id, project.dataPath, entityType, entityId);

    return { success: true, trashItem };
  },

  restore: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const trashId = form.get('trashId') as string;
    if (!trashId) return fail(400, { error: 'Trash ID required' });
    const ok = restoreEntity(params.id, project.dataPath, trashId);
    if (!ok) return fail(500, { error: 'Restore failed' });
    return { success: true };
  }
};
