import fs from 'node:fs';
import path from 'node:path';
import db from './db';
import { entities as entitiesTable } from './schema';
import { eq, and, like, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readMarkdownFile, writeMarkdownFile, type Frontmatter } from './markdown';
import { generateId, slugify } from '$lib/utils';
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

function slugifyPath(slug: string): string {
  return slug.replace(/\//g, '-');
}

export function generateUniqueSlug(
  projectPath: string,
  type: EntityType,
  name: string,
  excludeId?: string
): string {
  let slug = slugifyPath(slugify(name));
  if (!slug) slug = 'untitled';

  const dir = getEntityDir(projectPath, type);
  if (!fs.existsSync(dir)) return slug;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const existingSlugs = new Set<string>();
  for (const file of files) {
    if (excludeId) {
      const filePath = path.join(dir, file);
      const md = readMarkdownFile(filePath);
      if (md && md.frontmatter.id === excludeId) continue;
    }
    existingSlugs.add(file.replace(/\.md$/, ''));
  }

  if (!existingSlugs.has(slug)) return slug;

  let counter = 1;
  while (existingSlugs.has(`${slug}-${counter}`)) {
    counter++;
  }
  return `${slug}-${counter}`;
}

export function resolveEntityPath(
  projectPath: string,
  type: EntityType,
  id: string
): string | null {
  const dir = getEntityDir(projectPath, type);
  if (!fs.existsSync(dir)) return null;

  const slugRecord = drizzleDb
    .select({ slug: entitiesTable.slug })
    .from(entitiesTable)
    .where(eq(entitiesTable.id, id))
    .get();

  if (slugRecord?.slug) {
    const slugPath = path.join(dir, `${slugRecord.slug}.md`);
    if (fs.existsSync(slugPath)) {
      const md = readMarkdownFile(slugPath);
      if (md && md.frontmatter.id === id) return slugPath;
    }
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const md = readMarkdownFile(filePath);
    if (md && md.frontmatter.id === id) {
      return filePath;
    }
  }

  const idPath = path.join(dir, `${id}.md`);
  if (fs.existsSync(idPath)) return idPath;

  return null;
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

  results.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  return results;
}

export function getEntity(
  projectId: string,
  projectPath: string,
  type: EntityType,
  id: string
): EntityData | null {
  const filePath = resolveEntityPath(projectPath, type, id);
  if (!filePath) return null;

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
  const slug = generateUniqueSlug(projectPath, type, data.name);

  const frontmatter: Frontmatter = {
    id,
    name: data.name,
    slug,
    type,
    tags: data.tags || [],
    status: 'draft',
    imagePath: null,
    created: now,
    modified: now,
    ...Object.fromEntries(
      Object.entries(data).filter(([k]) => !['name', 'body', 'tags'].includes(k))
    )
  };

  const body = (data.body as string) || '';
  const dir = getEntityDir(projectPath, type);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  writeMarkdownFile(path.join(dir, `${slug}.md`), frontmatter as Record<string, unknown>, body);

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
  const nameChanged = data.name && data.name !== existing.name;

  let currentSlug = existing.frontmatter.slug as string | undefined;
  if (!currentSlug) {
    currentSlug = generateUniqueSlug(projectPath, type, existing.name);
  }

  let newSlug = currentSlug;
  if (nameChanged) {
    newSlug = generateUniqueSlug(projectPath, type, data.name as string, id);
  }

  const frontmatter: Record<string, unknown> = {
    ...existing.frontmatter,
    ...data,
    id,
    type,
    modified: now,
    slug: newSlug
  };

  delete frontmatter.body;

  const body = (data.body as string) ?? existing.body;

  if (nameChanged && newSlug !== currentSlug) {
    const dir = getEntityDir(projectPath, type);
    const oldPath = path.join(dir, `${currentSlug}.md`);
    const newPath = path.join(dir, `${newSlug}.md`);

    writeMarkdownFile(newPath, frontmatter, body);

    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  } else {
    const dir = getEntityDir(projectPath, type);
    const filePath = resolveEntityPath(projectPath, type, id) || path.join(dir, `${newSlug}.md`);
    writeMarkdownFile(filePath, frontmatter, body);
  }

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
  const filePath = resolveEntityPath(projectPath, type, id);
  if (!filePath) return false;

  fs.unlinkSync(filePath);

  drizzleDb
    .delete(entitiesTable)
    .where(and(eq(entitiesTable.id, id), eq(entitiesTable.projectId, projectId)))
    .run();

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
    .from(entitiesTable)
    .where(and(eq(entitiesTable.id, id), eq(entitiesTable.projectId, projectId)))
    .get();

  const record = {
    id,
    projectId,
    type,
    name: (frontmatter.name as string) || id,
    slug: (frontmatter.slug as string) || null,
    tags: (frontmatter.tags as string[]) || [],
    status: (frontmatter.status as string) || 'draft',
    imagePath: (frontmatter.imagePath as string) || null,
    createdAt: (frontmatter.created as string) || now,
    modifiedAt: (frontmatter.modified as string) || now
  };

  if (existing) {
    drizzleDb.update(entitiesTable).set(record).where(eq(entitiesTable.id, id)).run();
  } else {
    drizzleDb.insert(entitiesTable).values(record).run();
  }
}

export function searchEntities(
  projectId: string,
  query: string,
  typeFilter?: EntityType
): EntityData[] {
  const conditions = [eq(entitiesTable.projectId, projectId)];

  if (typeFilter) {
    conditions.push(eq(entitiesTable.type, typeFilter));
  }

  if (query) {
    conditions.push(like(entitiesTable.name, `%${query}%`));
  }

  const dbResults = drizzleDb
    .select()
    .from(entitiesTable)
    .where(and(...conditions))
    .orderBy(desc(entitiesTable.modifiedAt))
    .all();

  return dbResults.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    type: r.type as EntityType,
    name: r.name,
    tags: r.tags || [],
    status: r.status,
    imagePath: r.imagePath,
    body: '',
    frontmatter: {},
    createdAt: r.createdAt,
    modifiedAt: r.modifiedAt
  }));
}
