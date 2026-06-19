import fs from 'node:fs';
import path from 'node:path';
import db from './db';
import { trashItems as trashTable, entities } from './schema';
import { eq, and, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readMarkdownFile } from './markdown';
import { ENTITY_DIRS, resolveEntityPath, generateUniqueSlug } from './entities';
import { generateId } from '$lib/utils';
import type { EntityType } from '$lib/types';

const TRASH_DIR = '.trash';
const TRASH_TTL_DAYS = 30;

const drizzleDb = drizzle(db);

export interface TrashItem {
  id: string;
  projectId: string;
  entityId: string;
  entityType: EntityType;
  originalPath: string;
  deletedAt: string;
  expiresAt: string;
  name: string;
  body: string;
  frontmatter: Record<string, unknown>;
}

function getEntityDir(projectPath: string, type: EntityType): string {
  if (type === 'note') {
    return path.join(projectPath, 'notes', '_project');
  }
  return path.join(projectPath, ENTITY_DIRS[type]);
}

function getTrashDir(projectPath: string): string {
  return path.join(projectPath, TRASH_DIR);
}

function getTrashEntityPath(projectPath: string, type: EntityType, id: string): string {
  return path.join(getTrashDir(projectPath), ENTITY_DIRS[type], `${id}.md`);
}

export function softDeleteEntity(
  projectId: string,
  projectPath: string,
  type: EntityType,
  id: string
): TrashItem | null {
  const sourcePath = resolveEntityPath(projectPath, type, id);
  if (!sourcePath) return null;

  const md = readMarkdownFile(sourcePath);
  if (!md) return null;

  const trashDir = getTrashDir(projectPath);
  const typeDir = path.join(trashDir, ENTITY_DIRS[type]);
  const destPath = path.join(typeDir, `${id}.md`);

  fs.mkdirSync(typeDir, { recursive: true });

  fs.renameSync(sourcePath, destPath);

  drizzleDb
    .delete(entities)
    .where(and(eq(entities.id, id), eq(entities.projectId, projectId)))
    .run();

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TRASH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const trashId = generateId();

  drizzleDb
    .insert(trashTable)
    .values({
      id: trashId,
      projectId,
      entityId: id,
      entityType: type,
      originalPath: path.relative(projectPath, sourcePath),
      deletedAt: now,
      expiresAt
    })
    .run();

  return {
    id: trashId,
    projectId,
    entityId: id,
    entityType: type,
    originalPath: path.relative(projectPath, sourcePath),
    deletedAt: now,
    expiresAt,
    name: (md.frontmatter.name as string) || id,
    body: md.body,
    frontmatter: md.frontmatter as Record<string, unknown>
  };
}

export function restoreEntity(projectId: string, projectPath: string, trashId: string): boolean {
  const item = drizzleDb
    .select()
    .from(trashTable)
    .where(and(eq(trashTable.id, trashId), eq(trashTable.projectId, projectId)))
    .get();

  if (!item) return false;

  const trashPath = getTrashEntityPath(projectPath, item.entityType as EntityType, item.entityId);

  if (!fs.existsSync(trashPath)) {
    drizzleDb.delete(trashTable).where(eq(trashTable.id, trashId)).run();
    return false;
  }

  const md = readMarkdownFile(trashPath);
  const name = md ? (md.frontmatter.name as string) || item.entityId : item.entityId;
  const type = item.entityType as EntityType;
  const slug = generateUniqueSlug(projectPath, type, name, item.entityId);
  const destDir = getEntityDir(projectPath, type);
  const destPath = path.join(destDir, `${slug}.md`);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.renameSync(trashPath, destPath);

  drizzleDb.delete(trashTable).where(eq(trashTable.id, trashId)).run();

  return true;
}

export function permanentDeleteEntity(
  projectId: string,
  projectPath: string,
  trashId: string
): boolean {
  const item = drizzleDb
    .select()
    .from(trashTable)
    .where(and(eq(trashTable.id, trashId), eq(trashTable.projectId, projectId)))
    .get();

  if (!item) return false;

  const trashPath = getTrashEntityPath(projectPath, item.entityType as EntityType, item.entityId);
  if (fs.existsSync(trashPath)) {
    fs.unlinkSync(trashPath);
  }

  drizzleDb.delete(trashTable).where(eq(trashTable.id, trashId)).run();

  return true;
}

export function listTrashItems(projectId: string, projectPath: string): TrashItem[] {
  const items = drizzleDb
    .select()
    .from(trashTable)
    .where(eq(trashTable.projectId, projectId))
    .orderBy(trashTable.deletedAt)
    .all();

  return items.map((item) => {
    const trashPath = getTrashEntityPath(projectPath, item.entityType as EntityType, item.entityId);
    const md = readMarkdownFile(trashPath);

    return {
      id: item.id,
      projectId: item.projectId,
      entityId: item.entityId,
      entityType: item.entityType as EntityType,
      originalPath: item.originalPath,
      deletedAt: item.deletedAt,
      expiresAt: item.expiresAt,
      name: md ? (md.frontmatter.name as string) || item.entityId : item.entityId,
      body: md?.body || '',
      frontmatter: (md?.frontmatter as Record<string, unknown>) || {}
    };
  });
}

export function purgeExpiredTrashItems(): void {
  const now = new Date().toISOString();
  const expired = drizzleDb.select().from(trashTable).where(lt(trashTable.expiresAt, now)).all();

  for (const item of expired) {
    drizzleDb.delete(trashTable).where(eq(trashTable.id, item.id)).run();
  }
}
