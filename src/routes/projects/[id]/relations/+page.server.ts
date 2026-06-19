import { fail, redirect } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import db from '$lib/server/db';
import { projects, entities } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateId } from '$lib/utils';

const drizzleDb = drizzle(db);

interface RelationEntry {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  label: string | null;
}

function loadRelations(projectPath: string): RelationEntry[] {
  const filePath = path.join(projectPath, 'relations.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveRelations(projectPath: string, relations: RelationEntry[]): void {
  fs.writeFileSync(path.join(projectPath, 'relations.json'), JSON.stringify(relations, null, 2));
}

export const load = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
  if (!project) throw redirect(302, '/projects');

  const relations = loadRelations(project.dataPath);
  const allEntities = drizzleDb.select().from(entities).where(eq(entities.projectId, params.id)).all();

  return {
    relations,
    entities: allEntities.map(e => ({ id: e.id, name: e.name, type: e.type })),
    projectName: project.name
  };
};

export const actions = {
  create: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const relations = loadRelations(project.dataPath);
    relations.push({
      id: generateId(),
      sourceId: form.get('sourceId') as string,
      targetId: form.get('targetId') as string,
      relationType: form.get('relationType') as string,
      label: form.get('label') as string || null
    });
    saveRelations(project.dataPath, relations);
    return { success: true };
  },

  delete: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const project = drizzleDb.select().from(projects).where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id))).get();
    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const relId = form.get('relId') as string;
    let relations = loadRelations(project.dataPath);
    relations = relations.filter(r => r.id !== relId);
    saveRelations(project.dataPath, relations);
    return { success: true };
  }
};
