import { fail, redirect } from '@sveltejs/kit';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import {
  getCustomFieldDefs,
  addCustomFieldDef,
  deleteCustomFieldDef
} from '$lib/server/customFields';
import { routeToEntityType, entityTypeToRoute } from '$lib/utils/entityTypes';
import type { EntityType } from '$lib/types';

const drizzleDb = drizzle(db);

export const load = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) throw redirect(302, '/projects');

  const customFields = getCustomFieldDefs(params.id);

  return {
    project: { ...project, pinned: Boolean(project.pinned) },
    customFields
  };
};

export const actions = {
  addField: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const project = drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
      .get();

    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const entityType = form.get('entityType') as string;
    const key = form.get('key') as string;
    const label = form.get('label') as string;
    const fieldType = form.get('fieldType') as string;
    const refEntityType = (form.get('refEntityType') as string) || undefined;
    const placeholder = (form.get('placeholder') as string) || undefined;
    const required = form.get('required') === 'true';

    if (!entityType || !key || !label || !fieldType) {
      return fail(400, { error: 'entityType, key, label, and fieldType are required' });
    }

    const resolvedType = routeToEntityType(entityType);
    if (!resolvedType) {
      return fail(400, { error: 'Invalid entity type' });
    }

    const validFieldTypes = [
      'text',
      'textarea',
      'number',
      'tags',
      'markdown',
      'entityRef',
      'boolean',
      'date'
    ];
    if (!validFieldTypes.includes(fieldType)) {
      return fail(400, { error: 'Invalid field type' });
    }

    addCustomFieldDef(params.id, resolvedType, {
      key,
      label,
      fieldType: fieldType as any,
      refEntityType: refEntityType ? routeToEntityType(refEntityType) || null : null,
      placeholder,
      required
    });

    return { success: true };
  },

  deleteField: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const project = drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
      .get();

    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const fieldId = form.get('fieldId') as string;

    if (!fieldId) return fail(400, { error: 'Field ID required' });

    deleteCustomFieldDef(params.id, fieldId);

    return { success: true };
  }
};
