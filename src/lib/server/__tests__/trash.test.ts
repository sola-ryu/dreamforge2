import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { testDb } = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  return { testDb: db };
});

vi.mock('../db', () => {
  return { default: testDb };
});

import { migrate } from '../migrate';
import { createEntity, syncEntityToDb } from '../entities';
import { softDeleteEntity, restoreEntity } from '../trash';
import { loadRelations, addRelation } from '../relations';
import { generateId } from '$lib/utils';

let tmpDir: string;
let projectId: string;
let userId: string;

function insertUser(): string {
  const id = generateId();
  testDb.exec(
    `INSERT INTO users (id, email, username, password_hash, created_at) VALUES ('${id}', '${id}@test.com', 'user-${id.slice(0, 8)}', 'hash', '2024-01-01')`
  );
  return id;
}

function insertProject() {
  userId = insertUser();
  projectId = generateId();
  testDb.exec(
    `INSERT INTO projects (id, user_id, name, description, data_path, pinned, created_at, modified_at) VALUES ('${projectId}', '${userId}', 'Test', null, '${tmpDir}', 0, '2024-01-01', '2024-01-01')`
  );
}

function insertBookmark(entityId: string) {
  const id = generateId();
  testDb.exec(
    `INSERT INTO bookmarks (id, user_id, project_id, entity_id, created_at) VALUES ('${id}', '${userId}', '${projectId}', '${entityId}', '2024-01-01')`
  );
  return id;
}

function insertImageLink(entityId: string) {
  const linkId = generateId();
  const imageId = generateId();
  testDb.exec(
    `INSERT INTO project_images (id, project_id, filename, original_name, mime_type, size, caption, alt_text, created_at) VALUES ('${imageId}', '${projectId}', 'a.png', 'a.png', 'image/png', 1, null, null, '2024-01-01')`
  );
  testDb.exec(
    `INSERT INTO image_entity_links (id, image_id, entity_id, project_id) VALUES ('${linkId}', '${imageId}', '${entityId}', '${projectId}')`
  );
  return { linkId, imageId };
}

function countRows(sql: string): number {
  return (testDb.prepare(sql).get() as { c: number }).c;
}

beforeAll(() => {
  migrate();
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-trash-'));
  fs.mkdirSync(path.join(tmpDir, 'characters'), { recursive: true });
  insertProject();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('softDeleteEntity / restoreEntity relation and link cleanup', () => {
  it('removes relations touching the deleted entity and restores them', () => {
    const a = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    const b = createEntity(projectId, tmpDir, 'character', { name: 'Bob' });
    syncEntityToDb(projectId, 'character', a.id, a.frontmatter);
    syncEntityToDb(projectId, 'character', b.id, b.frontmatter);

    addRelation(tmpDir, { sourceId: a.id, targetId: b.id, relationType: 'friend', label: null });
    addRelation(tmpDir, { sourceId: b.id, targetId: a.id, relationType: 'friend', label: null });

    const trashItem = softDeleteEntity(projectId, tmpDir, 'character', a.id);
    expect(trashItem).not.toBeNull();

    // Relations touching the deleted entity are gone from the live file...
    expect(loadRelations(tmpDir)).toHaveLength(0);

    const restored = restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(restored).toBe(true);

    // ...and come back on restore.
    const relations = loadRelations(tmpDir);
    expect(relations).toHaveLength(2);
    expect(relations.map((r) => r.sourceId).sort()).toEqual([a.id, b.id].sort());
  });

  it('leaves relations between other entities untouched', () => {
    const a = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    const b = createEntity(projectId, tmpDir, 'character', { name: 'Bob' });
    const c = createEntity(projectId, tmpDir, 'character', { name: 'Carol' });
    syncEntityToDb(projectId, 'character', a.id, a.frontmatter);
    syncEntityToDb(projectId, 'character', b.id, b.frontmatter);
    syncEntityToDb(projectId, 'character', c.id, c.frontmatter);

    addRelation(tmpDir, { sourceId: a.id, targetId: b.id, relationType: 'friend', label: null });
    addRelation(tmpDir, { sourceId: b.id, targetId: c.id, relationType: 'friend', label: null });

    softDeleteEntity(projectId, tmpDir, 'character', a.id);

    const relations = loadRelations(tmpDir);
    expect(relations).toHaveLength(1);
    expect(relations[0].sourceId).toBe(b.id);
    expect(relations[0].targetId).toBe(c.id);
  });

  it('removes and restores bookmarks for the deleted entity', () => {
    const a = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    syncEntityToDb(projectId, 'character', a.id, a.frontmatter);
    insertBookmark(a.id);

    expect(
      countRows(
        `SELECT COUNT(*) c FROM bookmarks WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(1);

    const trashItem = softDeleteEntity(projectId, tmpDir, 'character', a.id);
    expect(
      countRows(
        `SELECT COUNT(*) c FROM bookmarks WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(0);

    restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(
      countRows(
        `SELECT COUNT(*) c FROM bookmarks WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(1);
  });

  it('removes and restores image links for the deleted entity', () => {
    const a = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    syncEntityToDb(projectId, 'character', a.id, a.frontmatter);
    insertImageLink(a.id);

    expect(
      countRows(
        `SELECT COUNT(*) c FROM image_entity_links WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(1);

    const trashItem = softDeleteEntity(projectId, tmpDir, 'character', a.id);
    expect(
      countRows(
        `SELECT COUNT(*) c FROM image_entity_links WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(0);

    restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(
      countRows(
        `SELECT COUNT(*) c FROM image_entity_links WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(1);
  });
});
