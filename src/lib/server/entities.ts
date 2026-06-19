import fs from 'node:fs';
import path from 'node:path';
import db from './db';
import { entities } from './schema';
import { eq, and, like, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readMarkdownFile, writeMarkdownFile, type Frontmatter } from './markdown';
import { generateId } from '$lib/utils';
import type { EntityType } from '$lib/types';

const drizzleDb = drizzle(db);

export const ENTITY_DIRS: Record<EntityType, string> = {
  character: 'characters',
  organization: 'organizations',
  location: 'locations',
  culture: 'cultures',
  species: 'species',
  item: 'items',
  note: 'notes'
};

export interface EntityData {
  id: string;
  projectId: string;
  type: EntityType;
  name: string;
  tags: string[];
  status: string;
  imagePath: string | null;
  body: string;
  frontmatter: Record<string, unknown>;
  createdAt: string;
  modifiedAt: string;
}

function getEntityDir(projectPath: string, type: EntityType): string {
  if (type === 'note') {
    return path.join(projectPath, 'notes', '_project');
  }
  return path.join(projectPath, ENTITY_DIRS[type]);
}

function getEntityPath(projectPath: string, type: EntityType, id: string): string {
  const dir = getEntityDir(projectPath, type);
  return path.join(dir, `${id}.md`);
}

export function listEntities(
  projectId: string,
  projectPath: string,
  type: EntityType
): EntityData[] {
  const dir = getEntityDir(projectPath, type);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const results: EntityData[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const md = readMarkdownFile(filePath);
    if (!md) continue;

    results.push({
      id: md.frontmatter.id as string,
      projectId,
      type,
      name: (md.frontmatter.name as string) || file.replace('.md', ''),
      tags: (md.frontmatter.tags as string[]) || [],
      status: (md.frontmatter.status as string) || 'draft',
      imagePath: (md.frontmatter.imagePath as string) || null,
      body: md.body,
      frontmatter: md.frontmatter as Record<string, unknown>,
      createdAt: (md.frontmatter.created as string) || new Date().toISOString(),
      modifiedAt: (md.frontmatter.modified as string) || new Date().toISOString()
    });
  }

  results.sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );

  return results;
}

export function getEntity(
  projectId: string,
  projectPath: string,
  type: EntityType,
  id: string
): EntityData | null {
  const filePath = getEntityPath(projectPath, type, id);
  const md = readMarkdownFile(filePath);
  if (!md) return null;

  return {
    id: md.frontmatter.id as string,
    projectId,
    type,
    name: (md.frontmatter.name as string) || id,
    tags: (md.frontmatter.tags as string[]) || [],
    status: (md.frontmatter.status as string) || 'draft',
    imagePath: (md.frontmatter.imagePath as string) || null,
    body: md.body,
    frontmatter: md.frontmatter as Record<string, unknown>,
    createdAt: (md.frontmatter.created as string) || new Date().toISOString(),
    modifiedAt: (md.frontmatter.modified as string) || new Date().toISOString()
  };
}

export function createEntity(
  projectId: string,
  projectPath: string,
  type: EntityType,
  data: { name: string; body?: string; tags?: string[]; [key: string]: unknown }
): EntityData {
  const now = new Date().toISOString();
  const id = generateId();

  const frontmatter: Frontmatter = {
    id,
    name: data.name,
    type,
    tags: data.tags || [],
    status: 'draft',
    imagePath: null,
    created: now,
    modified: now,
    ...Object.fromEntries(Object.entries(data).filter(([k]) => !['name', 'body', 'tags'].includes(k)))
  };

  const body = (data.body as string) || '';

  writeMarkdownFile(getEntityPath(projectPath, type, id), frontmatter as Record<string, unknown>, body);

  syncEntityToDb(projectId, type, id, frontmatter);

  return {
    id,
    projectId,
    type,
    name: data.name,
    tags: data.tags || [],
    status: 'draft',
    imagePath: null,
    body,
    frontmatter: frontmatter as Record<string, unknown>,
    createdAt: now,
    modifiedAt: now
  };
}

export function updateEntity(
  projectId: string,
  projectPath: string,
  type: EntityType,
  id: string,
  data: Record<string, unknown>
): EntityData | null {
  const existing = getEntity(projectId, projectPath, type, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const frontmatter: Record<string, unknown> = {
    ...existing.frontmatter,
    ...data,
    id,
    type,
    modified: now
  };

  delete frontmatter.body;

  const body = (data.body as string) ?? existing.body;

  writeMarkdownFile(getEntityPath(projectPath, type, id), frontmatter, body);

  syncEntityToDb(projectId, type, id, frontmatter);

  return {
    ...existing,
    ...(data as Record<string, unknown>),
    body,
    frontmatter,
    modifiedAt: now
  } as EntityData;
}

export function deleteEntity(
  projectId: string,
  projectPath: string,
  type: EntityType,
  id: string
): boolean {
  const filePath = getEntityPath(projectPath, type, id);
  if (!fs.existsSync(filePath)) return false;

  fs.unlinkSync(filePath);

  drizzleDb.delete(entities).where(and(eq(entities.id, id), eq(entities.projectId, projectId))).run();

  return true;
}

export function syncEntityToDb(
  projectId: string,
  type: EntityType,
  id: string,
  frontmatter: Record<string, unknown>
): void {
  const now = new Date().toISOString();
  const existing = drizzleDb
    .select()
    .from(entities)
    .where(and(eq(entities.id, id), eq(entities.projectId, projectId)))
    .get();

  const record = {
    id,
    projectId,
    type,
    name: (frontmatter.name as string) || id,
    tags: (frontmatter.tags as string[]) || [],
    status: (frontmatter.status as string) || 'draft',
    imagePath: (frontmatter.imagePath as string) || null,
    createdAt: (frontmatter.created as string) || now,
    modifiedAt: (frontmatter.modified as string) || now
  };

  if (existing) {
    drizzleDb.update(entities).set(record).where(eq(entities.id, id)).run();
  } else {
    drizzleDb.insert(entities).values(record).run();
  }
}

export function searchEntities(
  projectId: string,
  query: string,
  typeFilter?: EntityType
): EntityData[] {
  let results = drizzleDb
    .select()
    .from(entities)
    .where(eq(entities.projectId, projectId));

  if (typeFilter) {
    results = results.where(eq(entities.type, typeFilter)) as typeof results;
  }

  if (query) {
    results = results.where(like(entities.name, `%${query}%`)) as typeof results;
  }

  const dbResults = results.orderBy(desc(entities.modifiedAt)).all();

  return dbResults.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    type: r.type as EntityType,
    name: r.name,
    tags: r.tags,
    status: r.status,
    imagePath: r.imagePath,
    body: '',
    frontmatter: {},
    createdAt: r.createdAt,
    modifiedAt: r.modifiedAt
  }));
}
