import { redirect } from '@sveltejs/kit';
import { listEntities } from '$lib/server/entities';
import { getCustomFieldDefs } from '$lib/server/customFields';
import { routeToEntityType } from '$lib/utils/entityTypes';
import { ENTITY_FIELDS, mergeFields } from '$lib/entityFields';
import { serializeCSV } from '$lib/server/csv';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export async function GET({ params, locals }) {
  if (!locals.user) throw redirect(302, '/login');

  const entityType = routeToEntityType(params.type);
  if (!entityType) throw redirect(302, `/projects/${params.id}`);

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) throw redirect(302, '/projects');

  const entities = listEntities(params.id, project.dataPath, entityType);

  const customFieldDefs = getCustomFieldDefs(params.id, entityType).map((f) => ({
    key: f.key,
    label: f.label,
    type: f.fieldType,
    entityType: f.refEntityType || undefined,
    placeholder: f.placeholder || undefined,
    required: f.required
  }));

  const allFields = mergeFields(ENTITY_FIELDS[entityType], customFieldDefs);

  const headerFields = allFields.map((f) => f.key);

  const rows = entities.map((e) => {
    const row: Record<string, unknown> = {
      id: e.id,
      name: e.name,
      type: e.type,
      tags: (e.tags || []).join(', '),
      status: e.status,
      body: e.body || ''
    };
    for (const key of headerFields) {
      row[key] = e.frontmatter?.[key] ?? '';
    }
    return row;
  });

  const csv = serializeCSV(rows);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entityType}s.csv"`
    }
  });
}
