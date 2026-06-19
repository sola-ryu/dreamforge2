import { fail, redirect } from '@sveltejs/kit';
import { listEntities, createEntity, updateEntity } from '$lib/server/entities';
import { getCustomFieldDefs } from '$lib/server/customFields';
import { routeToEntityType } from '$lib/utils/entityTypes';
import { ENTITY_FIELDS, mergeFields } from '$lib/entityFields';
import { parseCSVWithHeaders, serializeCSV } from '$lib/server/csv';
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

  const customFieldDefs = getCustomFieldDefs(params.id, entityType).map((f) => ({
    key: f.key,
    label: f.label,
    type: f.fieldType,
    entityType: f.refEntityType || undefined,
    placeholder: f.placeholder || undefined,
    required: f.required
  }));

  const allFields = mergeFields(ENTITY_FIELDS[entityType], customFieldDefs);

  const targetFields = [
    { key: 'id', label: 'ID (for update matching)', type: 'text' },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'tags', label: 'Tags', type: 'text' },
    { key: 'status', label: 'Status', type: 'text' },
    { key: 'body', label: 'Body', type: 'markdown' },
    ...allFields
  ];

  return {
    project: { ...project, pinned: Boolean(project.pinned) },
    entityType,
    targetFields
  };
};

export const actions = {
  preview: async ({ params, locals, request }) => {
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
    const file = form.get('file') as File;

    if (!file) return fail(400, { error: 'No file uploaded' });

    const text = await file.text();
    const data = parseCSVWithHeaders(text);

    if (data.length === 0) return fail(400, { error: 'CSV file is empty or has no data rows' });

    const csvHeaders = Object.keys(data[0]);

    return {
      success: true,
      csvHeaders,
      preview: data.slice(0, 5),
      data: JSON.stringify(data)
    };
  },

  execute: async ({ params, locals, request }) => {
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
    const rawData = form.get('data') as string;
    const mappingJson = form.get('mapping') as string;

    if (!rawData || !mappingJson) return fail(400, { error: 'No data or mapping provided' });

    const data: Record<string, string>[] = JSON.parse(rawData);
    const mapping: Record<string, string> = JSON.parse(mappingJson);

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    const existingEntities = listEntities(params.id, project.dataPath, entityType);
    const existingByName = new Map(existingEntities.map((e) => [e.name.toLowerCase(), e]));
    const existingById = new Map(existingEntities.map((e) => [e.id, e]));

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        const mapped: Record<string, unknown> = {};

        for (const [csvCol, fieldKey] of Object.entries(mapping)) {
          if (fieldKey && row[csvCol] !== undefined) {
            if (fieldKey === 'tags') {
              mapped[fieldKey] = row[csvCol].split(',').map((s) => s.trim()).filter(Boolean);
            } else {
              mapped[fieldKey] = row[csvCol];
            }
          }
        }

        if (!mapped.name) {
          errors.push(`Row ${i + 2}: missing name`);
          continue;
        }

        const importId = mapped.id as string;
        const existing = importId ? existingById.get(importId) : existingByName.get(String(mapped.name).toLowerCase());

        delete mapped.id;

        if (existing) {
          updateEntity(params.id, project.dataPath, entityType, existing.id, mapped);
          updated++;
        } else {
          createEntity(params.id, project.dataPath, entityType, {
            name: mapped.name as string,
            body: (mapped.body as string) || undefined,
            tags: mapped.tags as string[] | undefined,
            ...Object.fromEntries(Object.entries(mapped).filter(([k]) => !['name', 'body', 'tags'].includes(k)))
          });
          created++;
        }
      } catch (e) {
        errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined
    };
  }
};
