import fs from 'node:fs';
import path from 'node:path';
import db from './db';
import {
  trashItems as trashTable,
  entities,
  projectImages,
  imageEntityLinks,
  projects,
  bookmarks as bookmarksTable
} from './schema';
import { eq, and, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readMarkdownFile } from './markdown';
import { ENTITY_DIRS, resolveEntityPath, generateUniqueSlug } from './entities';
import { removeRelationsForEntity, restoreRelations, type RelationEntry } from './relations';
import { generateId } from '$lib/utils';
import type { EntityType } from '$lib/types';

interface EntityTrashMetadata {
  relations: RelationEntry[];
  bookmarks: { id: string; userId: string; createdAt: string }[];
  imageLinks: { id: string; imageId: string }[];
}

const TRASH_DIR = '.trash';
const TRASH_TTL_DAYS = 30;

const drizzleDb = drizzle(db);

export interface TrashItem {
  id: string;
  projectId: string;
  entityId: string;
  entityType: string;
  originalPath: string;
  deletedAt: string;
  expiresAt: string;
  name: string;
  body: string;
  frontmatter: Record<string, unknown>;
  kind: 'entity' | 'image';
  metadata: Record<string, unknown> | null;
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

function getTrashImagePath(projectPath: string, filename: string): string {
  return path.join(getTrashDir(projectPath), 'images', filename);
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

  // Relations, bookmarks, and image links referencing this entity would otherwise
  // dangle: RelationGraph silently filters them out, but they'd stay in
  // relations.json forever and misattach if a different entity later reuses the id.
  // Stash them in the trash row so restoreEntity can bring them back.
  const removedRelations = removeRelationsForEntity(projectPath, id);

  const removedBookmarks = drizzleDb
    .select({
      id: bookmarksTable.id,
      userId: bookmarksTable.userId,
      createdAt: bookmarksTable.createdAt
    })
    .from(bookmarksTable)
    .where(and(eq(bookmarksTable.entityId, id), eq(bookmarksTable.projectId, projectId)))
    .all();
  if (removedBookmarks.length > 0) {
    drizzleDb
      .delete(bookmarksTable)
      .where(and(eq(bookmarksTable.entityId, id), eq(bookmarksTable.projectId, projectId)))
      .run();
  }

  const removedImageLinks = drizzleDb
    .select({ id: imageEntityLinks.id, imageId: imageEntityLinks.imageId })
    .from(imageEntityLinks)
    .where(and(eq(imageEntityLinks.entityId, id), eq(imageEntityLinks.projectId, projectId)))
    .all();
  if (removedImageLinks.length > 0) {
    drizzleDb
      .delete(imageEntityLinks)
      .where(and(eq(imageEntityLinks.entityId, id), eq(imageEntityLinks.projectId, projectId)))
      .run();
  }

  const metadata: EntityTrashMetadata = {
    relations: removedRelations,
    bookmarks: removedBookmarks,
    imageLinks: removedImageLinks
  };
  const hasMetadata =
    metadata.relations.length > 0 ||
    metadata.bookmarks.length > 0 ||
    metadata.imageLinks.length > 0;

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
      expiresAt,
      kind: 'entity',
      metadata: hasMetadata ? JSON.stringify(metadata) : null
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
    frontmatter: md.frontmatter as Record<string, unknown>,
    kind: 'entity',
    metadata: hasMetadata ? (metadata as unknown as Record<string, unknown>) : null
  };
}

export function softDeleteImage(
  projectId: string,
  projectPath: string,
  imageId: string
): TrashItem | null {
  const row = drizzleDb
    .select()
    .from(projectImages)
    .where(and(eq(projectImages.id, imageId), eq(projectImages.projectId, projectId)))
    .get();

  if (!row) return null;

  const imageDir = path.join(projectPath, 'images');
  const sourcePath = path.join(imageDir, row.filename);
  const trashDir = path.join(getTrashDir(projectPath), 'images');
  const destPath = path.join(trashDir, row.filename);

  if (fs.existsSync(sourcePath)) {
    fs.mkdirSync(trashDir, { recursive: true });
    fs.renameSync(sourcePath, destPath);
  }

  drizzleDb
    .delete(imageEntityLinks)
    .where(and(eq(imageEntityLinks.imageId, imageId), eq(imageEntityLinks.projectId, projectId)))
    .run();

  drizzleDb
    .delete(projectImages)
    .where(and(eq(projectImages.id, imageId), eq(projectImages.projectId, projectId)))
    .run();

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TRASH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const trashId = generateId();

  const metadata = {
    filename: row.filename,
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size,
    caption: row.caption,
    altText: row.altText
  };

  drizzleDb
    .insert(trashTable)
    .values({
      id: trashId,
      projectId,
      entityId: imageId,
      entityType: 'image',
      originalPath: path.join('images', row.filename),
      deletedAt: now,
      expiresAt,
      kind: 'image',
      metadata: JSON.stringify(metadata)
    })
    .run();

  return {
    id: trashId,
    projectId,
    entityId: imageId,
    entityType: 'image',
    originalPath: path.join('images', row.filename),
    deletedAt: now,
    expiresAt,
    name: row.originalName,
    body: '',
    frontmatter: {},
    kind: 'image',
    metadata
  };
}

function restoreImage(
  projectId: string,
  projectPath: string,
  item: typeof trashTable.$inferSelect
): boolean {
  const metadata = JSON.parse(item.metadata || '{}');

  const trashPath = getTrashImagePath(projectPath, metadata.filename || item.entityId);
  const destDir = path.join(projectPath, 'images');
  const destPath = path.join(destDir, metadata.filename || item.entityId);

  if (fs.existsSync(trashPath)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.renameSync(trashPath, destPath);
  }

  drizzleDb
    .insert(projectImages)
    .values({
      id: item.entityId,
      projectId,
      filename: metadata.filename || item.entityId,
      originalName: metadata.originalName || 'Unknown',
      mimeType: metadata.mimeType || 'application/octet-stream',
      size: metadata.size || 0,
      caption: metadata.caption || null,
      altText: metadata.altText || null,
      createdAt: item.deletedAt
    })
    .run();

  drizzleDb.delete(trashTable).where(eq(trashTable.id, item.id)).run();

  return true;
}

function permanentDeleteImage(
  projectId: string,
  projectPath: string,
  item: typeof trashTable.$inferSelect
): boolean {
  const metadata = JSON.parse(item.metadata || '{}');
  const trashPath = getTrashImagePath(projectPath, metadata.filename || item.entityId);

  if (fs.existsSync(trashPath)) {
    fs.unlinkSync(trashPath);
  }

  drizzleDb.delete(trashTable).where(eq(trashTable.id, item.id)).run();

  return true;
}

export function restoreEntity(projectId: string, projectPath: string, trashId: string): boolean {
  const item = drizzleDb
    .select()
    .from(trashTable)
    .where(and(eq(trashTable.id, trashId), eq(trashTable.projectId, projectId)))
    .get();

  if (!item) return false;

  if (item.kind === 'image') {
    return restoreImage(projectId, projectPath, item);
  }

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

  if (item.metadata) {
    try {
      const metadata = JSON.parse(item.metadata) as Partial<EntityTrashMetadata>;

      restoreRelations(projectPath, metadata.relations || []);

      for (const b of metadata.bookmarks || []) {
        const exists = drizzleDb
          .select({ id: bookmarksTable.id })
          .from(bookmarksTable)
          .where(eq(bookmarksTable.id, b.id))
          .get();
        if (!exists) {
          drizzleDb
            .insert(bookmarksTable)
            .values({
              id: b.id,
              userId: b.userId,
              projectId,
              entityId: item.entityId,
              createdAt: b.createdAt
            })
            .run();
        }
      }

      for (const l of metadata.imageLinks || []) {
        const exists = drizzleDb
          .select({ id: imageEntityLinks.id })
          .from(imageEntityLinks)
          .where(eq(imageEntityLinks.id, l.id))
          .get();
        if (!exists) {
          drizzleDb
            .insert(imageEntityLinks)
            .values({ id: l.id, imageId: l.imageId, entityId: item.entityId, projectId })
            .run();
        }
      }
    } catch {
      // Corrupt or unrecognized metadata — restore the entity file anyway.
    }
  }

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

  if (item.kind === 'image') {
    return permanentDeleteImage(projectId, projectPath, item);
  }

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
    if (item.kind === 'image') {
      const metadata = JSON.parse(item.metadata || '{}');
      return {
        id: item.id,
        projectId: item.projectId,
        entityId: item.entityId,
        entityType: 'image',
        originalPath: item.originalPath,
        deletedAt: item.deletedAt,
        expiresAt: item.expiresAt,
        name: metadata.originalName || item.entityId,
        body: '',
        frontmatter: {},
        kind: 'image' as const,
        metadata
      };
    }

    const trashPath = getTrashEntityPath(projectPath, item.entityType as EntityType, item.entityId);
    const md = readMarkdownFile(trashPath);

    return {
      id: item.id,
      projectId: item.projectId,
      entityId: item.entityId,
      entityType: item.entityType,
      originalPath: item.originalPath,
      deletedAt: item.deletedAt,
      expiresAt: item.expiresAt,
      name: md ? (md.frontmatter.name as string) || item.entityId : item.entityId,
      body: md?.body || '',
      frontmatter: (md?.frontmatter as Record<string, unknown>) || {},
      kind: 'entity' as const,
      metadata: null
    };
  });
}

export function purgeExpiredTrashItems(): void {
  const now = new Date().toISOString();
  const expired = drizzleDb.select().from(trashTable).where(lt(trashTable.expiresAt, now)).all();
  if (expired.length === 0) return;

  const projectPaths = new Map(
    drizzleDb
      .select({ id: projects.id, dataPath: projects.dataPath })
      .from(projects)
      .all()
      .map((p) => [p.id, p.dataPath])
  );

  for (const item of expired) {
    const projectPath = projectPaths.get(item.projectId);

    if (projectPath) {
      const trashPath =
        item.kind === 'image'
          ? getTrashImagePath(
              projectPath,
              (JSON.parse(item.metadata || '{}').filename as string) || item.entityId
            )
          : getTrashEntityPath(projectPath, item.entityType as EntityType, item.entityId);

      try {
        if (fs.existsSync(trashPath)) fs.unlinkSync(trashPath);
      } catch {
        // Leave the DB row removal to proceed even if the file cannot be unlinked
      }
    }

    drizzleDb.delete(trashTable).where(eq(trashTable.id, item.id)).run();
  }
}
